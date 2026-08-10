import AuthForm from '@/components/AuthForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '登录 | KRTPedia' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}