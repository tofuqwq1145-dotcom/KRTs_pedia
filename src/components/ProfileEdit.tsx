'use client';

import { useState } from 'react';

interface FeaturedOption {
  id: string;
  title: string;
  slug: string;
}

export default function ProfileEdit({ userId, bio, featuredId, options, nation, organization, ip }: {
  userId: string;
  bio: string;
  featuredId: string | null | undefined;
  options: FeaturedOption[];
  nation: string;
  organization: string;
  ip: string;
}) {
  const [bioText, setBioText] = useState(bio ?? '');
  const [featured, setFeatured] = useState(featuredId ?? '');
  const [nationText, setNationText] = useState(nation ?? '');
  const [orgText, setOrgText] = useState(organization ?? '');
  const [ipText, setIpText] = useState(ip ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function onSave() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: bioText.trim(),
          featured_page_id: featured || null,
          nation: nationText.trim(),
          organization: orgText.trim(),
          ip: ipText.trim(),
        })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      setNotice('已保存。');
    } catch (e: any) {
      setError(e.message || '保存失败。');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest';
  const labelCls = 'block text-xs tracking-widest text-archive-muted mb-2';

  return (
    <div className="space-y-5 mt-6">
      <div>
        <label className={labelCls}>简介</label>
        <textarea value={bioText} onChange={e => setBioText(e.target.value)} rows={3} maxLength={500}
          placeholder="介绍一下自己，例如服务器经历、擅长撰写的领域…"
          className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>挚爱之选（展示在个人主页的代表作）</label>
        <select value={featured} onChange={e => setFeatured(e.target.value)} className={inputCls}>
          <option value="">未设置</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelCls}>所属国家</label>
          <input value={nationText} onChange={e => setNationText(e.target.value)} maxLength={40}
            placeholder="例如：苍云国" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>所属组织</label>
          <input value={orgText} onChange={e => setOrgText(e.target.value)} maxLength={40}
            placeholder="例如：圣殿骑士团" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>地址（IP）</label>
          <input value={ipText} onChange={e => setIpText(e.target.value)} maxLength={60}
            placeholder="例如：198.51.100.7" className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onSave} disabled={busy}
          className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50">
          {busy ? '保存中…' : '保存资料'}
        </button>
        <div className="text-sm">
          {error && <p className="text-archive-accent">{error}</p>}
          {notice && <p className="text-emerald-700">{notice}</p>}
        </div>
      </div>
    </div>
  );
}