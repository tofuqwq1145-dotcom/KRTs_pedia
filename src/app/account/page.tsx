import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TYPE_LABELS } from '@/lib/pages';
import MySubmissions from '@/components/MySubmissions';
import AvatarUpload from '@/components/AvatarUpload';
import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '我的账号 | KRTPedia' };

export default async function AccountPage() {
  if (!supabaseConfigured()) redirect('/');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const { data: mine } = await supabase
    .from('pages')
    .select('id, slug, title, type, status, updated_at')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '我的账号' }]} />
      <h1 className="font-serif text-4xl mb-12 text-archive-text border-b border-archive-border pb-6">我的账号</h1>

      <div className="bg-archive-paper border border-archive-border p-8 mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-serif text-2xl text-archive-text">{profile?.display_name || user.email}</p>
            <p className="text-sm text-archive-muted tracking-widest mt-2">{user.email}</p>
            {profile?.is_admin && (
              <p className="inline-block mt-3 px-3 py-1 text-xs tracking-widest bg-archive-text text-archive-paper">站主 · 审核权限</p>
            )}
          </div>
          <div className="flex gap-3">
            <a href="/submit" className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">+ 撰写投稿</a>
            {profile?.is_admin && (
              <a href="/admin" className="px-6 py-3 border border-archive-accent text-archive-accent text-sm tracking-widest hover:bg-archive-accent hover:text-archive-paper transition-colors">审核面板</a>
            )}
          </div>
        </div>
        <AvatarUpload userId={user.id} avatarUrl={profile?.avatar_url ?? ''} />
        <form action="/auth/logout" method="POST" className="mt-8 pt-6 border-t border-archive-border">
          <button type="submit" className="text-sm tracking-widest text-archive-muted hover:text-archive-accent transition-colors">退出登录 →</button>
        </form>
      </div>

      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">我的投稿</h2>
      <MySubmissions pages={(mine ?? []).map(p => ({
        id: p.id, slug: p.slug, title: p.title, type: p.type, status: p.status, updated_at: p.updated_at ?? '',
        typeLabel: TYPE_LABELS[p.type as keyof typeof TYPE_LABELS] ?? p.type,
      }))} />
    </div>
  );
}