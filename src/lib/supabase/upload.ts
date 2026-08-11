import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadMedia(
  supabase: SupabaseClient,
  folder: 'posts' | 'avatars' | 'covers',
  uid: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_SIZE) {
    throw new Error('图片不能超过 5MB。');
  }
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${folder}/${uid}/${ts}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type || 'image/*' });

  if (error) {
    throw new Error(error.message || '上传失败。');
  }

  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}