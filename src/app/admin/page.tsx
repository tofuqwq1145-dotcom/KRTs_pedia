import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReviewPanel from '@/components/ReviewPanel';
import SeriesManager from '@/components/SeriesManager';
import ThemeReview from '@/components/ThemeReview';
import SongsManager from '@/components/SongsManager';
import MascotManager from '@/components/MascotManager';
import UserManager, { type AdminUser } from '@/components/UserManager';
import HeroBackground from '@/components/HeroBackground';
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

  const [{ count: themesCount }, { count: ratingsCount }, { count: commentsCount }, { count: chatCount }, { count: mascotCount }, { count: seriesCount }] = await Promise.all([
    supabase.from('themes').select('*', { count: 'exact', head: true }),
    supabase.from('ratings').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
    supabase.from('mascot_images').select('*', { count: 'exact', head: true }),
    supabase.from('series').select('*', { count: 'exact', head: true }),
  ]);

  const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  let onlineCount = 0;
  try {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    onlineCount = count ?? 0;
  } catch {
    // last_seen 列未创建时忽略
  }

  const { data: userRows } = await supabase
    .from('profiles')
    .select('id, display_name, title, is_admin, banned, created_at, last_seen')
    .order('created_at', { ascending: true });

  let heroUrl = '';
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'hero_image_url')
      .maybeSingle();
    heroUrl = data?.value ?? '';
  } catch {
    heroUrl = '';
  }

  let songCount = 0;
  let musicBytes = 0;
  try {
    const { data: songRows } = await supabase.from('songs').select('url');
    if (songRows) {
      songCount = songRows.length;
      const sizes = await Promise.all((songRows as { url: string }[]).map(async r => {
        try {
          const res = await fetch(r.url, { method: 'HEAD' });
          const len = res.headers.get('content-length');
          return len ? Number(len) : 0;
        } catch {
          return 0;
        }
      }));
      musicBytes = sizes.reduce((a, b) => a + b, 0);
    }
  } catch {
    // 统计失败不影响页面
  }

  const pagesApproved = (pages ?? []).filter(p => p.status === 'approved').length;
  const pagesPending = (pages ?? []).filter(p => p.status === 'pending').length;
  const pagesRejected = (pages ?? []).filter(p => p.status === 'rejected').length;

  function fmtBytes(n: number): string {
    if (!n) return '0 B';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
    return (
      <div className="border border-archive-border bg-archive-paper p-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-archive-muted mb-2">{label}</p>
        <p className="font-serif text-3xl text-archive-text">{value}</p>
        {sub && <p className="mt-1 text-xs tracking-widest text-archive-muted">{sub}</p>}
      </div>
    );
  }

  const tabs = [
    { key: 'pending', label: '待审核' },
    { key: 'rejected', label: '已驳回' },
    { key: 'approved', label: '已通过' },
  ] as const;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '站主 · 审核面板' }]} />
      <h1 className="font-serif text-4xl mb-4 text-archive-text border-b border-archive-border pb-6">审核面板（站主）</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">逐条审查投稿，通过后内容立即公开。可在备注栏填写驳回理由。</p>

      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6 text-archive-text border-b border-archive-border pb-4">仪表盘 · 用量总览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Stat label="档案文档" value={pagesApproved} sub={`待审 ${pagesPending} · 驳回 ${pagesRejected}`} />
          <Stat label="曲目" value={songCount} sub={`音乐占用 ${fmtBytes(musicBytes)}`} />
          <Stat label="版式主题" value={themesCount ?? 0} />
          <Stat label="评分" value={ratingsCount ?? 0} />
          <Stat label="评论" value={commentsCount ?? 0} />
          <Stat label="聊天消息" value={chatCount ?? 0} />
          <Stat label="站娘配图" value={mascotCount ?? 0} />
          <Stat label="分级系列" value={seriesCount ?? 0} />
          <Stat label="注册用户" value={usersCount ?? 0} />
          <Stat label="在线（5 分钟内）" value={onlineCount} />
        </div>
        <div className="mt-6 border border-archive-border bg-archive-paper p-5 text-xs tracking-widest text-archive-muted leading-6">
          <p className="mb-1">· 上传限制：图片 ≤ 5MB，曲库音频 ≤ 30MB，文档配乐 ≤ 1MB（选歌时已置灰超限曲目）。</p>
          <p className="mb-1">
            · 实时「月度流量 / 总存储」以 Supabase 官方看板为准：{' '}
            <a href="https://supabase.com/dashboard/project/ynqecbsychdgjtrlvegd/billing/usage" target="_blank" rel="noreferrer" className="underline text-archive-accent">项目用量看板</a>
            （需登录 Supabase 账号；本站代码无权读取该数字）。
          </p>
          <p>· 本站可统计曲库文件占用；若音乐增多接近免费额度，可降低码率或升级套餐。覆盖上传时记得删除旧文件，避免占用累积。</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start mb-14">
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
            source: p.source ?? 'user',
          }));
          return (
            <section key={tab.key} className="border border-archive-border bg-archive-paper/50 p-5">
              <h2 className="font-serif text-2xl mb-4 text-archive-text border-b border-archive-border pb-3">
                {tab.label} <span className="text-archive-muted text-lg">({filtered.length})</span>
              </h2>
              <ReviewPanel items={items} />
            </section>
          );
        })}
      </div>

      <div className="space-y-6 mb-14">
        <ThemeReview />

        <MascotManager />

        <SongsManager />
      </div>

      <div className="mb-14">
        <SeriesManager />
      </div>

      <div className="mb-14">
        <HeroBackground initialUrl={heroUrl} />
      </div>

      <div className="mb-14">
        <UserManager users={(userRows ?? []) as AdminUser[]} />
      </div>
    </div>
  );
}