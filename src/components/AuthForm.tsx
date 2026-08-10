'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/supabase/client';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  if (!supabaseConfigured()) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center fade-in">
        <p className="text-archive-muted text-sm tracking-widest">档案馆尚未接入登录系统（Supabase 未配置）。</p>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/account`;

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { display_name: displayName || email.split('@')[0] },
        },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.push('/account');
        router.refresh();
      }
      else setNotice('注册成功，请前往邮箱点击确认链接完成验证。');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/account');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24 fade-in">
      <h1 className="font-serif text-4xl mb-10 text-archive-text border-b border-archive-border pb-6">
        {mode === 'login' ? '登录档案馆' : '注册账号'}
      </h1>
      <p className="text-sm text-archive-muted tracking-widest mb-8 leading-relaxed">
        登录后即可投稿撰写档案，提交内容需经站主审核后公开展示。
      </p>
      <form onSubmit={onSubmit} className="space-y-6">
        {mode === 'register' && (
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="昵称（可选）"
            className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="邮箱"
          className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
        />
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="密码（至少6位）"
          className="w-full p-4 border border-archive-border bg-archive-paper outline-none focus:border-archive-accent transition-colors text-sm tracking-widest"
        />
        {error && <p className="text-sm text-archive-accent">{error}</p>}
        {notice && <p className="text-sm text-archive-accent">{notice}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-8 py-3 bg-archive-text text-archive-paper text-sm tracking-widest hover:bg-archive-accent transition-colors disabled:opacity-50"
        >
          {loading ? '处理中…' : mode === 'login' ? '登 录' : '注 册'}
        </button>
      </form>
      <p className="mt-8 text-sm text-archive-muted tracking-widest text-center">
        {mode === 'login' ? (
          <>还没有账号？<Link href="/auth/register" className="text-archive-accent underline">立即注册</Link></>
        ) : (
          <>已有账号？<Link href="/auth/login" className="text-archive-accent underline">前往登录</Link></>
        )}
      </p>
    </div>
  );
}