-- ============================================================
-- KRTPedia · Supabase Schema
-- 在 Supabase 控制台 → SQL Editor 中整体执行本文件（可重复执行）
-- ============================================================

-- ---------- 扩展 ----------
create extension if not exists pgcrypto;

-- ---------- profiles：用户资料 / 站主标记 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text default '',
  avatar_url text default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 兼容已建表情况（若旧表没有 avatar_url 列则补上）
alter table public.profiles add column if not exists avatar_url text default '';

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 注册后自动建立 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, '匿名'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- is_admin 判断助手 ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
  );
$$;

-- ---------- pages：维基条目（含投稿审核工作流） ----------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type text not null default 'article'
    check (type in ('nation','person','event','war','building','chronicle','article')),
  body text not null default '',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  author_id uuid references auth.users (id) on delete cascade,
  author_name text default '佚名',
  review_note text default '',
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages enable row level security;

-- 任何人可读已通过的内容
drop policy if exists "pages_read_approved" on public.pages;
create policy "pages_read_approved" on public.pages
  for select using (status = 'approved');

-- 作者可查看自己的全部草稿/被驳回/已通过条目
drop policy if exists "pages_read_own" on public.pages;
create policy "pages_read_own" on public.pages
  for select using (auth.uid() = author_id);

-- 登录用户创建自己的条目（初始为 pending）
drop policy if exists "pages_insert_own" on public.pages;
create policy "pages_insert_own" on public.pages
  for insert with check (auth.uid() = author_id);

-- 作者可修改自己 pending / rejected 的条目
drop policy if exists "pages_update_own" on public.pages;
create policy "pages_update_own" on public.pages
  for update using (auth.uid() = author_id and status in ('pending','rejected'));

-- 站主可修改任意条目（通过 / 驳回 / 编辑）
drop policy if exists "pages_update_admin" on public.pages;
create policy "pages_update_admin" on public.pages
  for update using (public.is_admin());

-- 站主可删除
drop policy if exists "pages_delete_admin" on public.pages;
create policy "pages_delete_admin" on public.pages
  for delete using (public.is_admin());

create index if not exists pages_status_idx on public.pages (status);
create index if not exists pages_type_idx on public.pages (type);
create index if not exists pages_author_idx on public.pages (author_id);

-- 更新时间戳
create or replace function public.handle_pages_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_set_updated on public.pages;
create trigger pages_set_updated
  before update on public.pages
  for each row execute procedure public.handle_pages_updated();

-- 公开类型统计（首页数字用）
create or replace function public.page_stats()
returns table (type text, cnt bigint)
language sql
stable
as $$
  select p.type, count(*)
  from public.pages p
  where p.status = 'approved'
  group by p.type;
$$;

-- [注意] 站主是「如何成为站主」：
-- 请先注册登录一次，然后在 Supabase SQL Editor 执行：
--   update public.profiles set is_admin = true where id = '<你的用户 UUID>';
-- 用户 UUID 可在 Supabase → Authentication → Users 查看到。