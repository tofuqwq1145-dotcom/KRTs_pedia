import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import { listPagesByAuthor } from '@/lib/pages';
import Breadcrumb from '@/components/Breadcrumb';
import ArchiveList from '@/components/ArchiveList';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: '撰稿人主页 | KRTPedia' } satisfies Metadata;
}

export default async function AuthorPage({ params }: { params: { id: string } }) {
  const profile = supabaseConfigured()
    ? await (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, featured_page_id')
        .eq('id', params.id)
        .maybeSingle();
      return data ?? null;
    })()
    : null;

  if (!profile) notFound();

  const [pages, featured] = await Promise.all([
    listPagesByAuthor(profile.id),
    profile.featured_page_id
      ? (async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from('pages')
          .select('slug, title, type, created_at, author_name, status')
          .eq('id', profile.featured_page_id)
          .eq('status', 'approved')
          .maybeSingle();
        return data ?? null;
      })()
      : null,
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '撰稿人主页' }]} />
      <div className="bg-archive-paper border border-archive-border p-8 mb-12">
        <div className="flex items-start gap-6 flex-wrap">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-archive-border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-archive-text/90 grid place-items-center">
              <span className="font-serif text-2xl text-archive-paper">{(profile.display_name || '佚')[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-serif text-3xl text-archive-text">{profile.display_name || '佚名撰稿人'}</h1>
            <p className="text-sm text-archive-muted tracking-widest mt-2">撰稿人 · 已收录 {pages.length} 篇档案</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-archive-text leading-relaxed mt-6 pt-6 border-t border-archive-border">{profile.bio}</p>
        )}
      </div>

      {featured && (
        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">挚爱之选</h2>
          <Link href={`/pages/${featured.slug}`} className="group block bg-archive-paper border border-archive-border p-8 hover:border-archive-accent transition-colors">
            <p className="text-xs text-archive-accent tracking-widest mb-2 uppercase">该撰稿人最满意的档案</p>
            <h3 className="font-serif text-2xl text-archive-text group-hover:text-archive-accent transition-colors">{featured.title}</h3>
            <p className="mt-4 text-xs text-archive-muted tracking-widest">阅读全文 →</p>
          </Link>
        </section>
      )}

      <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">TA 的档案 ({pages.length})</h2>
      {pages.length > 0 ? <ArchiveList items={pages} /> : (
        <div className="py-16 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">暂无公开档案</p>
        </div>
      )}
    </div>
  );
}