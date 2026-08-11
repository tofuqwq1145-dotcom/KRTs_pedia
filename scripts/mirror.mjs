// ============================================================
// KRTPedia · 静态镜像生成器（国内腾讯云 COS / 任意静态托管用）
// 用法：
//   先在 .env.local 里配好 NEXT_PUBLIC_SUPABASE_URL 与
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（或 ANON KEY）
//   然后运行：npm run mirror
// 生成结果输出到 dist-mirror/ 目录，整包上传到 COS 的静态网站即可。
// ============================================================
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'dist-mirror');

// ---------- 读取 .env.local ----------
const envLocal = path.join(root, '.env.local');
if (existsSync(envLocal)) {
  const raw = await readFile(envLocal, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('缺少环境变量：请在 .env.local 配置 NEXT_PUBLIC_SUPABASE_URL 和密钥。');
  process.exit(1);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://krts-pedia.vercel.app';

const TYPE_LABELS = {
  nation: '国家',
  person: '人物',
  event: '事件',
  war: '战争',
  building: '建筑',
  chronicle: '编年史',
  article: '档案',
};
const TYPE_ROUTES = {
  nation: 'nations',
  person: 'people',
  event: 'events',
  war: 'wars',
  building: 'buildings',
  chronicle: 'chronicle',
};

const CSS = `
  :root {
    --bg: #f5f2e9; --paper: #fffdf7; --border: #d8d2c0;
    --text: #1c1a15; --muted: #7a7467; --accent: #8b2f2f;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', Georgia, serif; }
  header { position: sticky; top: 0; z-index: 10; background: rgba(245,242,233,.95);
    backdrop-filter: blur(6px); border-bottom: 1px solid var(--border); }
  .inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
  .bar { height: 76px; display: flex; align-items: center; justify-content: space-between; }
  .bar h1 { font-size: 22px; letter-spacing: .3em; margin: 0; }
  .bar .sub { font-size: 10px; letter-spacing: .3em; color: var(--muted); margin-top: 2px; }
  nav a { color: var(--text); text-decoration: none; margin-left: 26px; font-size: 14px; letter-spacing: .15em; white-space: nowrap; }
  nav a:hover { color: var(--accent); }
  main { padding: 40px 0 80px; }
  h2.t { font-size: 26px; letter-spacing: .15em; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
  h3.t { font-size: 20px; margin-top: 32px; }
  .card { background: var(--paper); border: 1px solid var(--border); padding: 18px 22px; margin-bottom: 12px; }
  .card h3 { margin: 0 0 4px; font-size: 20px; }
  .card h3 a { color: var(--text); text-decoration: none; }
  .card h3 a:hover { color: var(--accent); }
  .meta { font-size: 12px; color: var(--accent); letter-spacing: .12em; text-transform: uppercase; }
  .desc { font-size: 14px; color: var(--muted); line-height: 1.7; margin-top: 8px; }
  .desc p { margin: 0; }
  .article { background: var(--paper); border: 1px solid var(--border); padding: 40px 44px; }
  .article h1 { font-size: 32px; letter-spacing: .1em; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-top: 0; }
  .article .meta { margin-bottom: 24px; }
  .markdown h2 { font-size: 22px; margin-top: 36px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  .markdown h3 { font-size: 18px; }
  .markdown p, .markdown li { line-height: 1.9; font-size: 15px; }
  .markdown img { max-width: 100%; border: 1px solid var(--border); margin: 12px 0; }
  .markdown blockquote { border-left: 3px solid var(--accent); margin: 16px 0; padding: 4px 16px; color: var(--muted); }
  .markdown code { background: rgba(0,0,0,.05); padding: 2px 5px; font-family: Consolas, monospace; font-size: 13px; }
  .markdown pre { background: #23211b; color: #f0ede2; padding: 16px; overflow-x: auto; line-height: 1.6; }
  .markdown table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .markdown th, .markdown td { border: 1px solid var(--border); padding: 8px 12px; font-size: 14px; }
  .back { display: inline-block; margin-bottom: 24px; color: var(--accent); text-decoration: none; font-size: 14px; letter-spacing: .12em; }
  .empty { color: var(--muted); font-style: italic; padding: 40px 0; }
  .kw { width: 100%; max-width: 420px; padding: 12px; border: 1px solid --var(--border); border: 1px solid var(--border);
    background: var(--paper); font-size: 14px; margin-bottom: 24px; }
  footer { border-top: 1px solid var(--border); padding: 28px 0 48px; text-align: center; color: var(--muted); font-size: 12px; letter-spacing: .15em; }
`;

const NAV = `
  <nav>
    <a href="/">首页</a>
    <a href="/nations/">国家</a>
    <a href="/people/">人物</a>
    <a href="/wars/">战争</a>
    <a href="/buildings/">建筑</a>
    <a href="/events/">事件</a>
    <a href="/chronicle/">编年史</a>
    <a href="/search/">检索</a>
    <a href="${SITE_URL}">在线主站</a>
  </nav>`;

function layout(body) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="KRTPedia 档案镜像">
<title>KRTPEDIA · 档案镜像</title>
<style>${CSS}</style>
</head>
<body>
<header><div class="inner bar">
  <a href="/" style="text-decoration:none;color:inherit"><h1>KRTPEDIA</h1><div class="sub">ARCHIVE MIRROR</div></a>
  ${NAV}
</div></header>
<main><div class="inner">${body}</div></main>
<footer><div class="inner">本页为 KRTPedia 只读镜像 · 数据更新于生成时</div></footer>
</body>
</html>`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function writePage(file, html) {
  const p = path.join(OUT, file);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, html, 'utf8');
}

// ---------- 拉取已通过数据 ----------
console.log('拉取已通过档案…');
const supabase = createClient(url, key);
const { data: pages, error } = await supabase
  .from('pages')
  .select('*')
  .eq('status', 'approved')
  .order('created_at', { ascending: false });
if (error) {
  console.error('拉取失败：', error.message);
  process.exit(1);
}
console.log(`共 ${pages.length} 条已通过档案。`);

const hasType = t => pages.filter(p => p.type === t);
const typeLabel = t => TYPE_LABELS[t] || t;

function listCard(p) {
  const descRaw = p.body.replace(/[#>*`=\-_\[\]\(\)\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  return `<div class="card">
    <div class="meta">${typeLabel(p.type)} · ${esc(p.author_name || '佚名')}</div>
    <h3><a href="/pages/${p.slug}/">${esc(p.title)}</a></h3>
    <div class="desc">${esc(descRaw)}</div>
  </div>`;
}

// ---------- 首页 ----------
{
  const groups = ['nation', 'person', 'war', 'building', 'event', 'chronicle']
    .map(t => ({ t, items: hasType(t) }))
    .filter(g => g.items.length);
  const body = `<h2 class="t">档案总览（${pages.length}）</h2>
    ${groups.map(g => `<h3 class="t">${typeLabel(g.t)}</h3>${g.items.map(listCard).join('')}`).join('')}`;
  await writePage('index.html', layout(body));
}

// ---------- 列表页 ----------
for (const t of Object.keys(TYPE_ROUTES)) {
  const items = hasType(t);
  if (!items.length) continue;
  const body = `<h2 class="t">${typeLabel(t)}（${items.length}）</h2>
    ${items.length ? items.map(listCard).join('') : '<div class="empty">暂无档案</div>'}`;
  await writePage(`${TYPE_ROUTES[t]}/index.html`, layout(body));
}

// ---------- 详情页 ----------
for (const p of pages) {
  const html = marked.parse(p.body || '');
  const body = `
    <a class="back" href="/">← 返回档案馆</a>
    <article class="article">
      <h1>${esc(p.title)}</h1>
      <div class="meta">${typeLabel(p.type)} · ${esc(p.author_name || '佚名')}</div>
      <div class="markdown">${html}</div>
    </article>`;
  await writePage(`pages/${p.slug}/index.html`, layout(body));
}

// ---------- 检索页 ----------
{
  const items = pages.map(p => ({
    t: esc(p.title),
    s: p.slug,
    l: typeLabel(p.type),
  }));
  const js = JSON
    .stringify(items)
    .replace(/</g, '\\u003c');
  const body = `<h2 class="t">全站检索</h2>
    <input id="kw" class="kw" placeholder="输入标题关键词…">
    <div id="list"></div>
    <script>
      const items=${js};
      const L=()=>{const k=document.getElementById('kw').value.trim().toLowerCase();let html='';
        items.forEach(o=>{if(!k||o.t.toLowerCase().includes(k))html+='<div class="card"><div class="meta">'+o.l+'</div><h3><a href="/pages/'+o.s+'/">'+o.t+'</a></h3></div>';});
        document.getElementById('list').innerHTML=html||'<div class="empty">无匹配结果</div>';};
      document.getElementById('kw').addEventListener('input',L);L();
    </script>`;
  await writePage('search/index.html', layout(body));
}

console.log('镜像已生成到 dist-mirror/ 目录。');