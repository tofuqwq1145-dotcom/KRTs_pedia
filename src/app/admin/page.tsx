import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReviewPanel from '@/components/ReviewPanel';
import SeriesManager from '@/components/SeriesManager';
import Breadcrumb from '@/components/Breadcrumb';
import { TYPE_LABELS } from '@/lib/pages';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '审核面板 | KRTPedia' };

export default async function AdminPage() {
  if (!supabaseConfigured()) redirect('/');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect('/');

  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false });

  const tabs = [
    { key: 'pending', label: '待审核' },
    { key: 'rejected', label: '已驳回' },
    { key: 'approved', label: '已通过' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '站主 · 审核面板' }]} />
      <h1 className="font-serif text-4xl mb-4 text-archive-text border-b border-archive-border pb-6">审核面板（站主）</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">逐条审查投稿，通过后内容立即公开。可在备注栏填写驳回理由。</p>

      {tabs.map(tab => {
        const filtered = (pages ?? []).filter(p => p.status === tab.key);
        const items = filtered.map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          body: p.body,
          author_name: p.author_name,
          created_at: p.created_at,
          status: p.status,
          review_note: p.review_note ?? '',
          typeLabel: TYPE_LABELS[p.type as keyof typeof TYPE_LABELS] ?? p.type,
        }));
        return (
          <section key={tab.key} className="mb-14">
            <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">
              {tab.label} <span className="text-archive-muted text-lg">({filtered.length})</span>
            </h2>
            <ReviewPanel items={items} />
          </section>
        );
      })}

      <SeriesManager />
    </div>
  );
}