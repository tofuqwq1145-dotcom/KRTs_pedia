import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import Breadcrumb from '@/components/Breadcrumb';
import ThemeForm from '@/components/ThemeForm';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '提交版式 | KRTPedia' };

export default async function ThemesNewPage() {
  if (!supabaseConfigured()) redirect('/');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/themes/new');

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '版式主题', path: '/themes' }, { label: '提交版式' }]} />
      <div className="mb-10 border-b border-archive-border pb-6">
        <h1 className="font-serif text-4xl mb-4 text-archive-text">提交我的版式</h1>
        <p className="text-sm tracking-widest text-archive-muted leading-relaxed">
          设计一套属于你的档案版式：头图渐变、Logo、字体与配色。提交后由站主审核，通过即收录于版式库供所有人选用。
        </p>
      </div>
      <ThemeForm />
    </div>
  );
}