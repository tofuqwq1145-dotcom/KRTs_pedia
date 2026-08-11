'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/supabase/upload';
import { FONT_OPTIONS, fontFamily, headerBackground, animationClass } from '@/data/themes';

const inputCls = 'w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest';
const labelCls = 'block text-xs tracking-widest text-archive-muted mb-2';
const STYLES = [['modern', '现代档案馆'], ['scp', 'SCP 式深色'], ['classic', '复古羊皮纸']] as const;
const GRADS = [['none', '无渐变'], ['linear', '线性·纵向'], ['linear-diag', '线性·斜向'], ['radial', '径向']] as const;
const ANIMS = [['none', '无动效'], ['float', '缓慢浮动'], ['pulse', '呼吸明暗'], ['glow', '微光']] as const;

function Color({ label, v, on, def }: { label: string; v: string; on: (s: string) => void; def: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={v || def} onChange={e => on(e.target.value === def ? '' : e.target.value)} className="w-12 h-10 border border-archive-border cursor-pointer" />
        <input value={v} onChange={e => on(e.target.value)} placeholder="#RRGGBB" className={inputCls} />
      </div>
    </div>
  );
}

function Font({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select value={v} onChange={e => on(e.target.value)} className={inputCls}>
        {FONT_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
    </div>
  );
}

function Pick({ label, v, on, opts }: { label: string; v: string; on: (s: string) => void; opts: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select value={v} onChange={e => on(e.target.value)} className={inputCls}>
        {opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    </div>
  );
}

export default function ThemeForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slogan, setSlogan] = useState('');
  const [accent, setAccent] = useState('#8a5a2b');
  const [bg, setBg] = useState('#f7f3ec');
  const [titleColor, setTitleColor] = useState('');
  const [bodyColor, setBodyColor] = useState('');
  const [titleFont, setTitleFont] = useState('default');
  const [bodyFont, setBodyFont] = useState('default');
  const [style, setStyle] = useState('modern');
  const [headerStyle, setHeaderStyle] = useState('none');
  const [headerFrom, setHeaderFrom] = useState('#1a1a1a');
  const [headerTo, setHeaderTo] = useState('#3a3a3a');
  const [animation, setAnimation] = useState('none');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFileName, setLogoFileName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  async function onUploadLogo(file: File) {
    setError('');
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');
      const url = await uploadMedia(supabase, 'themes', user.id, file);
      setLogoUrl(url);
      setLogoFileName(file.name);
    } catch (e: any) {
      setError(e.message || 'Logo 上传失败。');
    } finally {
      setUploading(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  }

  async function onSubmit() {
    setError('');
    setNotice('');
    if (!name.trim() || !slug.trim()) return setError('请填写主题名称与标识（Slug）。');
    setBusy(true);
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), slogan: slogan.trim(), accent, bg, style, title_color: titleColor, body_color: bodyColor, title_font: titleFont, body_font: bodyFont, header_style: headerStyle, header_from: headerFrom, header_to: headerTo, header_animation: animation, logo_url: logoUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '提交失败');
      setNotice('已提交，等待站主审核通过后即可被他人使用。');
      setName(''); setSlug(''); setSlogan(''); setLogoUrl(''); setLogoFileName('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const grad = headerBackground({ header_style: headerStyle, header_from: headerFrom, header_to: headerTo });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>主题名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：玩家组织·黎明骑士团" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>主题标识 Slug *（英文）</label>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} placeholder="knights" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>宣言 / 座右铭（可选）</label>
          <input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="例如：守护记忆，以正视听" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>自定义标识 Logo（可选，显示在版式头图）</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading}
              className="px-4 py-3 text-xs tracking-widest text-archive-accent border border-archive-accent/40 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50">
              {uploading ? '上传中…' : '上传 Logo'}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUploadLogo(f); }} />
            {logoUrl ? (
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt="" className="w-12 h-12 object-contain border border-archive-border" />
                <span className="text-xs text-archive-muted truncate max-w-[130px]">{logoFileName}</span>
                <button type="button" onClick={() => { setLogoUrl(''); setLogoFileName(''); }} className="text-xs text-archive-muted hover:text-archive-accent">移除</button>
              </div>
            ) : <span className="text-xs text-archive-muted">未上传</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Color label="主色（强调/信息栏）" v={accent} on={setAccent} def="#8a5a2b" />
          <Color label="纸张底色" v={bg} on={setBg} def="#f7f3ec" />
          <Color label="标题颜色（可选）" v={titleColor} on={setTitleColor} def="#1a1a1a" />
          <Color label="正文字色（可选）" v={bodyColor} on={setBodyColor} def="#2b2b2b" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Font label="标题字体" v={titleFont} on={setTitleFont} />
          <Font label="正文字体" v={bodyFont} on={setBodyFont} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Pick label="信息栏风格" v={style} on={setStyle} opts={STYLES} />
          <Pick label="头图渐变" v={headerStyle} on={setHeaderStyle} opts={GRADS} />
          <Color label="渐变起色" v={headerFrom} on={setHeaderFrom} def="#1a1a1a" />
          <Color label="渐变止色" v={headerTo} on={setHeaderTo} def="#3a3a3a" />
          <Pick label="头图动效" v={animation} on={setAnimation} opts={ANIMS} />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onSubmit} disabled={busy}
            className="px-8 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
            {busy ? '提交中…' : '提交版式待审核'}
          </button>
        </div>
        {error && <p className="text-sm text-archive-accent">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      </div>

      <div>
        <label className={labelCls}>实时预览</label>
        <div className="bg-archive-paper border border-archive-border overflow-hidden">
          <div className={`px-8 py-8 text-center ${animationClass(animation)}`} style={{ background: grad || accent, color: style === 'scp' ? '#f5f2ea' : undefined }}>
            {logoUrl && <img src={logoUrl} alt="" className="mx-auto mb-3 h-16 w-auto object-contain" />}
            <p className="font-serif text-3xl tracking-widest text-white" style={{ fontFamily: fontFamily(titleFont) }}>{name || '示例主题'}</p>
            {slogan && <p className="mt-2 text-xs italic tracking-[0.2em] text-white/90">{slogan}</p>}
          </div>
          <div className="p-6" style={{ background: bg, color: bodyColor || '#2b2b2b', fontFamily: fontFamily(bodyFont) }}>
            <div className="border mb-4" style={{ borderColor: accent, borderWidth: style === 'classic' ? 3 : 1 }}>
              {[['所属分级', '示例分级'], ['撰稿人', '佚名记录者']].map(([k, v], i) => (
                <div key={k} className={`flex items-center text-sm ${i < 1 ? 'border-b border-archive-border' : ''}`}>
                  <div className="w-24 shrink-0 px-3 py-2 tracking-widest" style={{ background: `${accent}14`, color: accent }}>{k}</div>
                  <div className="px-3 py-2">{v}</div>
                </div>
              ))}
            </div>
            <h4 className="font-serif text-lg mb-2" style={{ color: titleColor || undefined, fontFamily: fontFamily(titleFont) }}>示例标题</h4>
            <p className="text-sm leading-relaxed">正文以所选底纸与字色呈现。版式通过审核后，投稿时可选此版式，头图/字体/颜色会应用到整个条目。</p>
          </div>
        </div>
      </div>
    </div>
  );
}