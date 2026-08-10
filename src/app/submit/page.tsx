import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import Breadcrumb from '@/components/Breadcrumb';
import SubmitEditor from '@/components/SubmitEditor';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '投稿 | KRTPedia' };

export default async function SubmitPage({ searchParams }: { searchParams: { edit?: string } }) {
  if (!supabaseConfigured()) redirect('/');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/submit');

  const editId = searchParams.edit;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '撰写投稿' }]} />
      <div className="mb-10 border-b border-archive-border pb-6">
        <h1 className="font-serif text-4xl mb-4 text-archive-text">{editId ? '修改投稿' : '撰写新档案'}</h1>
        <p className="text-sm tracking-widest text-archive-muted leading-relaxed">记录 KRT 世界中发生的一切 —— 提交后需经站主审核通过才会公开展示。</p>
      </div>
      <SubmitEditor editId={editId} />
    </div>
  );
}