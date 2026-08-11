import ChatRoom from '@/components/ChatRoom';
import Breadcrumb from '@/components/Breadcrumb';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '聊天室 | KRTPedia' };

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 fade-in">
      <Breadcrumb items={[{ label: '聊天室' }]} />
      <h1 className="font-serif text-4xl mb-4 text-archive-text border-b border-archive-border pb-6">档案馆闲聊室</h1>
      <p className="text-sm tracking-widest text-archive-muted mb-10">实时同步的交流区，消息对所有人可见。请遵守写作指导中的基本礼仪。</p>
      <ChatRoom />
    </div>
  );
}