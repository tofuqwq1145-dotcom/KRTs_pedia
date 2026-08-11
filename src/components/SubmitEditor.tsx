'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/supabase/upload';
import Markdown from '@/components/Markdown';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'nation', label: '国家' },
  { value: 'person', label: '人物' },
  { value: 'event', label: '事件' },
  { value: 'war', label: '战争' },
  { value: 'building', label: '建筑' },
  { value: 'chronicle', label: '编年史' },
  { value: 'article', label: '档案（自由条目）' },
];

const TEMPLATES: Record<string, string> = {
  person: `## 基本信息

- **别名**：
- **所属国家**：
- **身份**：
- **状态**：

## 简介

在此撰写人物介绍……

## 事迹

- 
`,
  event: `## 事件概述

- **时间**：
- **地点**：
- **参与国家**：

## 经过

在此撰写事件经过……

## 影响

`,
  nation: `## 国家概况

- **存在时间**：
- **国家定位**：

## 历史

在此撰写国家历史……

## 外交

`,
  war: `## 战争概述

- **时间**：
- **参战方**：

## 经过

## 结果与影响

`,
  building: `## 建筑信息

- **位置**：
- **建造者**：
- **现状**：

## 描述

`,
  default: `在此撰写正文内容……

支持 **Markdown 语法**：
- 加粗 / 斜体 / ~~删除线~~
- [链接](https://krts-pedia.vercel.app)
- > 引用
- 列表、表格、代码块
`,
};

function slugify(title: string) {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  if (t) return t;
  let h = 0;
  for (const ch of title) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return 'doc-' + h.toString(36).slice(0, 6);
}

export default function SubmitEditor({ editId }: { editId?: string }) {
  const configured = supabaseConfigured();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('article');
  const [body, setBody] = useState('');
  const [seriesId, setSeriesId] = useState<string>('');
  const [seriesList, setSeriesList] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [themeId, setThemeId] = useState('');
  const [themeList, setThemeList] = useState<{ id: string; name: string }[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string; display_name?: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasBody = body.trim().length > 0;
  const preview = useMemo(() => body.slice(0, 200), [body]);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.from('series').select('id, name').order('sort_order', { ascending: true }).then(({ data }) => {
      setSeriesList((data ?? []) as { id: string; name: string }[]);
    });
    supabase.from('themes').select('id, name').order('created_at', { ascending: true }).then(({ data }) => {
      setThemeList((data ?? []) as { id: string; name: string }[]);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, display_name: data.user.user_metadata?.display_name } : null);
      setAuthChecked(true);
    });
    if (editId) {
      supabase
        .from('pages')
        .select('*')
        .eq('id', editId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title);
            setSlug(data.slug);
            setType(data.type);
            setBody(data.body);
            setSeriesId(data.series_id ?? '');
            setTags((data.tags ?? []).join(', '));
            setThemeId(data.theme_id ?? '');
            setCoverUrl(data.cover_url ?? '');
          }
        });
    }
  }, [configured, editId]);

  const applyTemplate = useCallback((nextType: string) => {
    setType(nextType);
    if (!body.trim() || TEMPLATES[nextType]) {
      setBody(TEMPLATES[nextType] ?? TEMPLATES.default);
    }
  }, [body]);

  async function onUploadImage(file: File) {
    setUploadError('');
    if (!user) return setUploadError('请先登录。');
    setUploading(true);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'posts', user.id, file);
      const md = `![图片](${url})`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? body.length;
        const end = ta.selectionEnd ?? body.length;
        const next = body.slice(0, start) + md + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
          ta.focus();
          ta.selectionStart = ta.selectionEnd = start + md.length;
        });
      } else {
        setBody(b => (b ? b + '\n\n' + md : md));
      }
    } catch (e: any) {
      setUploadError(e.message || '上传失败。');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onUploadCover(file: File) {
    setUploadError('');
    if (!user) return setUploadError('请先登录。');
    setUploading(true);
    try {
      const supabase = createClient();
      const url = await uploadMedia(supabase, 'covers', user.id, file);
      setCoverUrl(url);
    } catch (e: any) {
      setUploadError(e.message || '封面上传失败。');
    } finally {
      setUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function onSubmit() {
    setError('');
    setNotice('');
    if (!title.trim()) return setError('请填写标题。');
    if (!hasBody) return setError('请填写正文内容。');
    setSaving(true);

    try {
      const res = await fetch(editId ? `/api/pages/${editId}` : '/api/pages', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug || slugify(title),
          type,
          body,
          series_id: seriesId || null,
          tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
          cover_url: coverUrl,
          theme_id: themeId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? '提交失败');
      setNotice(json?.message ?? '已提交，等待站主审核。');
    } catch (e: any) {
      setError(e.message || '提交失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  if (!configured) {
    return (
      <div className="py-16 text-center border border-archive-border bg-archive-paper">
        <p className="font-serif text-xl text-archive-muted mb-2">投稿系统未启用</p>
        <p className="text-sm text-archive-muted tracking-widest mb-6">需先在 Supabase 配置数据库，才能开启社区投稿。</p>
        <p className="text-sm text-archive-muted tracking-widest">当前站内档案由站主直接维护。</p>
      </div>
    );
  }

  if (authChecked && !user) {
    return (
      <div className="py-16 text-center border border-archive-border bg-archive-paper">
        <p className="font-serif text-xl text-archive-muted mb-6">请先登录后再投稿</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/login" className="px-6 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors">登录 / 注册</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-5">
        <div>
          <label className="block text-xs tracking-widest text-archive-muted mb-2">标题 *</label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value)); }}
            placeholder="例如：政治-某某事件"
            className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest font-serif text-lg"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest text-archive-muted mb-2">条目标识（Slug，用于网址，一般无需修改）</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(slugify(e.target.value))}
            className="w-full p-3 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest text-archive-muted mb-2">分类 *</label>
          <select
            value={type}
            onChange={e => applyTemplate(e.target.value)}
            className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
          >
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

<div>
            <label className="block text-xs tracking-widest text-archive-muted mb-2">所属分级（可选，站长设置的目录）</label>
            <select
              value={seriesId}
              onChange={e => setSeriesId(e.target.value)}
              className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
            >
              <option value="">不设置分级</option>
              {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs tracking-widest text-archive-muted mb-2">标签（可选，逗号分隔，最多 8 个）</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="例如：政治, 外交, 同盟"
              className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs tracking-widest text-archive-muted mb-2">版式主题（可选，默认跟随分级）</label>
              <select
                value={themeId}
                onChange={e => setThemeId(e.target.value)}
                className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
              >
                <option value="">跟随分级默认版式</option>
                {themeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-widest text-archive-muted mb-2">封面图（可选，不设置则自动取正文首图）</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-3 text-xs tracking-widest text-archive-accent border border-archive-accent/40 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50"
                >
                  {uploading ? '上传中…' : '选择封面'}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUploadCover(f); }}
                />
                {coverUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={coverUrl} alt="" className="w-24 h-14 object-cover border border-archive-border" />
                    <button type="button" onClick={() => setCoverUrl('')} className="text-xs tracking-widest text-archive-muted hover:text-archive-accent">移除</button>
                  </div>
                ) : (
                  <span className="text-xs text-archive-muted">无封面</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs tracking-widest text-archive-muted">正文（Markdown）*</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs tracking-widest text-archive-accent border border-archive-accent/40 px-3 py-1 hover:bg-archive-accent hover:text-archive-paper transition-colors disabled:opacity-50"
                >
                  {uploading ? '上传中…' : '+ 上传图片'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); }}
                />
            </div>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={18}
            placeholder={TEMPLATES.default}
            className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm leading-relaxed font-mono"
          />
          <p className="text-xs text-archive-muted mt-2 leading-relaxed">支持 Markdown：标题、加粗、引用、列表、表格、代码块、[链接](url)、![图片](url)。内容需经站主审核后公开。</p>
          {uploadError && <p className="text-sm text-archive-accent mt-2">{uploadError}</p>}
        </div>

        {error && <p className="text-sm text-archive-accent">{error}</p>}
        {notice && <p className="text-sm text-archive-accent">{notice}</p>}

        <div className="flex gap-4">
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-8 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50"
          >
            {saving ? '提交中…' : editId ? '保存修改，重新提交审核' : '提交审核'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs tracking-widest text-archive-muted mb-2">实时预览（{preview.length === body.length ? '全文' : '开头 ' + preview.length + ' 字符'}）</label>
        <div className="bg-archive-paper border border-archive-border p-8 min-h-[400px]">
          {hasBody ? <Markdown content={body} /> : <p className="text-archive-muted text-sm tracking-widest">填写正文后此处实时预览</p>}
        </div>
      </div>
    </div>
  );
}