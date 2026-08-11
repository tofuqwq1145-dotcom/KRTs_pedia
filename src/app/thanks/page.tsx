import Breadcrumb from '@/components/Breadcrumb';
import ThanksCarousel from '@/components/ThanksCarousel';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '致谢名单 | KRTPedia' };

interface Supporter {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string | null;
}

export default async function ThanksPage() {
  let users: Supporter[] = [];
  if (supabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, title')
        .order('display_name', { ascending: true });
      users = (data ?? []) as Supporter[];
    } catch {
      users = [];
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '致谢名单' }]} />
      <h1 className="font-serif text-4xl mb-8 text-archive-text border-b border-archive-border pb-6">致谢名单</h1>

      <div className="border border-archive-accent/30 bg-archive-paper/60 p-8 mb-12 text-center">
        <p className="font-serif text-xl md:text-2xl text-archive-text leading-relaxed">
          感谢所有为 KRTP 提供支持与帮助的人。
        </p>
        <p className="font-serif text-xl md:text-2xl text-archive-accent leading-relaxed mt-3">
          如果没有你们，就没有 KRTP。
        </p>
        <p className="mt-6 text-xs tracking-[0.3em] text-archive-muted uppercase">排名不分先后</p>
      </div>

      {users.length === 0 ? (
        <div className="py-20 text-center border border-archive-border bg-archive-paper">
          <p className="font-serif text-xl text-archive-muted">名单尚在书写中…</p>
        </div>
      ) : (
        <ThanksCarousel users={users} />
      )}
    </div>
  );
}
