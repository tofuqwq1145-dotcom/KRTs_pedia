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

-- 成员信息：所属国家 / 组织 / 地址(IP)
alter table public.profiles add column if not exists nation text default '';
alter table public.profiles add column if not exists organization text default '';
alter table public.profiles add column if not exists ip text default '';

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 站主判断助手（security definer 绕过 RLS，避免在 profiles 策略中自引用递归）
create or replace function public.is_admin_ss()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin);
$$;

revoke execute on function public.is_admin_ss() from public;
grant execute on function public.is_admin_ss() to authenticated;

-- 站主可更新任意用户资料（管理端称号授予等）
drop policy if exists "admin_update_any_profile" on public.profiles;
create policy "admin_update_any_profile" on public.profiles
  for update
  to authenticated
  using (public.is_admin_ss())
  with check (public.is_admin_ss());

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

-- ---------- 分级（系列）目录：站主划分的档案集合 ----------
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.series enable row level security;

-- 任何人可读取分级
drop policy if exists "series_read_public" on public.series;
create policy "series_read_public" on public.series
  for select using (true);

-- 仅站主可创建 / 修改 / 删除分级
drop policy if exists "series_insert_admin" on public.series;
create policy "series_insert_admin" on public.series
  for insert with check (public.is_admin());

drop policy if exists "series_update_admin" on public.series;
create policy "series_update_admin" on public.series
  for update using (public.is_admin());

drop policy if exists "series_delete_admin" on public.series;
create policy "series_delete_admin" on public.series
  for delete using (public.is_admin());

-- ---------- themes：版式主题（配色 + 信息栏风格） ----------
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  slogan text not null default '',
  accent text not null default '#8a5a2b',
  accent_soft text not null default '#a58050',
  bg text not null default '#f7f3ec',
  style text not null default 'modern',
  status text not null default 'pending',
  author_id uuid references auth.users (id) on delete set null,
  title_color text not null default '',
  body_color text not null default '',
  title_font text not null default '',
  body_font text not null default '',
  header_style text not null default 'none',
  header_from text not null default '#1a1a1a',
  header_to text not null default '#3a3a3a',
  header_animation text not null default 'none',
  logo_url text not null default '',
  bg_image text not null default '',
  created_at timestamptz not null default now()
);
alter table public.themes add column if not exists slogan text not null default '';
alter table public.themes add column if not exists status text not null default 'pending';
alter table public.themes add column if not exists author_id uuid references auth.users (id) on delete set null;
alter table public.themes add column if not exists title_color text not null default '';
alter table public.themes add column if not exists body_color text not null default '';
alter table public.themes add column if not exists title_font text not null default '';
alter table public.themes add column if not exists body_font text not null default '';
alter table public.themes add column if not exists header_style text not null default 'none';
alter table public.themes add column if not exists header_from text not null default '#1a1a1a';
alter table public.themes add column if not exists header_to text not null default '#3a3a3a';
alter table public.themes add column if not exists header_animation text not null default 'none';
alter table public.themes add column if not exists logo_url text not null default '';
alter table public.themes add column if not exists bg_image text not null default '';

alter table public.themes enable row level security;

-- 所有人可读已通过；作者可看自己的；站主可看全部
drop policy if exists "themes_read_public" on public.themes;
create policy "themes_read_public" on public.themes
  for select using ((status = 'approved') or (auth.uid() = author_id) or public.is_admin());

-- 登录用户可提交新版式（待审核）
drop policy if exists "themes_insert_user" on public.themes;
create policy "themes_insert_user" on public.themes
  for insert with check (auth.uid() = author_id and status = 'pending');

-- 作者可修改自己待审/被驳回的版式；站主可修改任意
drop policy if exists "themes_update_own" on public.themes;
create policy "themes_update_own" on public.themes
  for update using (public.is_admin() or (auth.uid() = author_id and status in ('pending', 'rejected')));

-- 作者可删除自己待审；站主可删除任意
drop policy if exists "themes_delete_own" on public.themes;
create policy "themes_delete_own" on public.themes
  for delete using (public.is_admin() or (auth.uid() = author_id and status = 'pending'));

-- 兼容升级列：分级父级 / 主题 / 封面 / 标签
alter table public.series add column if not exists parent_id uuid references public.series (id) on delete cascade;
alter table public.series add column if not exists theme_id uuid references public.themes (id) on delete set null;
alter table public.pages add column if not exists series_id uuid references public.series (id) on delete set null;
alter table public.pages add column if not exists tags text[] not null default '{}'::text[];
alter table public.pages add column if not exists cover_url text not null default '';
alter table public.pages add column if not exists theme_id uuid references public.themes (id) on delete set null;

-- ---------- chat_messages：聊天室 ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_read_public" on public.chat_messages for select using (true);
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id and char_length(content) between 1 and 1000);

-- Realtime 发布（若已在发布中会报错，可忽略）
alter publication supabase_realtime add table public.chat_messages;

-- ---------- ratings：文档评分（每账号每文档一条，可修改） ----------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value int not null check (value between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, user_id)
);

alter table public.ratings enable row level security;

drop policy if exists "ratings_read_public" on public.ratings;
create policy "ratings_read_public" on public.ratings for select using (true);

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own" on public.ratings
  for insert with check (auth.uid() = user_id and value between 1 and 5);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own" on public.ratings
  for update using (auth.uid() = user_id)
  with check (value between 1 and 5);

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own" on public.ratings
  for delete using (auth.uid() = user_id);

-- ---------- comments：文档下方讨论区 ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_page_idx on public.comments (page_id);

alter table public.comments enable row level security;

drop policy if exists "comments_read_public" on public.comments;
create policy "comments_read_public" on public.comments for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id and char_length(body) between 1 and 2000);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.comments;

-- ---------- announcements：首页公告（仅站主可编辑） ----------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_read_public" on public.announcements;
create policy "announcements_read_public" on public.announcements for select using (true);

drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin" on public.announcements for insert with check (public.is_admin());

drop policy if exists "announcements_update_admin" on public.announcements;
create policy "announcements_update_admin" on public.announcements for update using (public.is_admin());

drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin" on public.announcements for delete using (public.is_admin());

-- ---------- songs：站内配乐曲库 ----------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  url text not null,
  playlist text not null default 'home',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists songs_playlist_idx on public.songs (playlist);

alter table public.songs enable row level security;

drop policy if exists "songs_read_public" on public.songs;
create policy "songs_read_public" on public.songs for select using (true);

drop policy if exists "songs_insert_admin" on public.songs;
create policy "songs_insert_admin" on public.songs for insert with check (public.is_admin());

drop policy if exists "songs_update_admin" on public.songs;
create policy "songs_update_admin" on public.songs for update using (public.is_admin());

drop policy if exists "songs_delete_admin" on public.songs;
create policy "songs_delete_admin" on public.songs for delete using (public.is_admin());

-- pages 新增：文档配乐
alter table public.pages add column if not exists song_title text not null default '';
alter table public.pages add column if not exists song_url text not null default '';

-- ---------- mascot_images：站娘动图（形态×播放状态） ----------
create table if not exists public.mascot_images (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  image_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.mascot_images enable row level security;

drop policy if exists "mascot_images_read_public" on public.mascot_images;
create policy "mascot_images_read_public" on public.mascot_images for select using (true);

drop policy if exists "mascot_images_insert_admin" on public.mascot_images;
create policy "mascot_images_insert_admin" on public.mascot_images for insert with check (public.is_admin());

drop policy if exists "mascot_images_update_admin" on public.mascot_images;
create policy "mascot_images_update_admin" on public.mascot_images for update using (public.is_admin());

drop policy if exists "mascot_images_delete_admin" on public.mascot_images;
create policy "mascot_images_delete_admin" on public.mascot_images for delete using (public.is_admin());

-- ---------- profiles：个人信息扩展 ----------
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists featured_page_id uuid references public.pages (id) on delete set null;
alter table public.profiles add column if not exists title text not null default '';
alter table public.profiles add column if not exists last_seen timestamptz default now();

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

-- 站主可查看任意条目（审核面板需要读取全部投稿）
drop policy if exists "pages_read_admin" on public.pages;
create policy "pages_read_admin" on public.pages
  for select using (public.is_admin());

-- 登录用户创建自己的条目（初始为 pending）
drop policy if exists "pages_insert_own" on public.pages;
create policy "pages_insert_own" on public.pages
  for insert with check (auth.uid() = author_id);

-- 作者可修改自己的条目（含已通过的，改后需重新审核）
drop policy if exists "pages_update_own" on public.pages;
create policy "pages_update_own" on public.pages
  for update using (auth.uid() = author_id);

-- 站主可修改任意条目（通过 / 驳回 / 编辑）
drop policy if exists "pages_update_admin" on public.pages;
create policy "pages_update_admin" on public.pages
  for update using (public.is_admin());

-- 站主可删除
drop policy if exists "pages_delete_admin" on public.pages;
create policy "pages_delete_admin" on public.pages
  for delete using (public.is_admin());

-- 作者可删除自己的条目
drop policy if exists "pages_delete_own" on public.pages;
create policy "pages_delete_own" on public.pages
  for delete using (auth.uid() = author_id);

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

-- ---------- site_settings：站点级配置（首页背景图等） ----------
create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);

alter table public.site_settings enable row level security;

-- 任何人可读（首页渲染需要）
drop policy if exists "site_settings_read_public" on public.site_settings;
create policy "site_settings_read_public" on public.site_settings
  for select using (true);

-- 站主可写入 / 修改
drop policy if exists "site_settings_insert_admin" on public.site_settings;
create policy "site_settings_insert_admin" on public.site_settings
  for insert to authenticated with check (public.is_admin_ss());

drop policy if exists "site_settings_update_admin" on public.site_settings;
create policy "site_settings_update_admin" on public.site_settings
  for update to authenticated using (public.is_admin_ss());

drop policy if exists "site_settings_delete_admin" on public.site_settings;
create policy "site_settings_delete_admin" on public.site_settings
  for delete to authenticated using (public.is_admin_ss());

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