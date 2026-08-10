-- ============================================================
-- KRTPedia · Storage（图片图库）
-- 创建 media 公共桶，允许登录用户上传图片（头像 / 投稿插图）
-- 在 Supabase SQL Editor 中整体执行本文件（可重复执行）
-- 目录结构：media/posts/<用户UID>/xxx.jpg 与 media/avatars/<用户UID>/avatar.png
-- ============================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 任何人可读（公共桶的公开 URL 无需认证）
drop policy if exists "media_read_public" on storage.objects;
create policy "media_read_public" on storage.objects
  for select
  using (bucket_id = 'media');

-- 登录用户可上传
drop policy if exists "media_upload_auth" on storage.objects;
create policy "media_upload_auth" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media');

-- 登录用户可更新自己的文件
drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 登录用户可删除自己的文件
drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);