import WebSocket from 'ws';

export interface OneBotMessage {
  channel: 'group' | 'c2c';
  key: string;
  messageId: string;
  summon: boolean;
  content: string;
  groupId?: number;
  userId?: number;
}

export interface OneBotOptions {
  url: string;
  accessToken?: string;
  onMessage: (msg: OneBotMessage) => void | Promise<void>;
}

let currentWs: WebSocket | null = null;

export function oneBotSendGroup(groupId: number, userId: number | undefined, text: string): boolean {
  const ws = currentWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const message = userId
    ? [
        { type: 'at' as const, data: { qq: String(userId) } },
        { type: 'text' as const, data: { text: ` ${text}` } },
      ]
    : [{ type: 'text' as const, data: { text } }];
  ws.send(JSON.stringify({ action: 'send_group_msg', params: { group_id: groupId, message } }));
  return true;
}

export function oneBotSendC2C(userId: number, text: string): boolean {
  const ws = currentWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(
    JSON.stringify({
      action: 'send_private_msg',
      params: { user_id: userId, message: [{ type: 'text' as const, data: { text } }] },
    })
  );
  return true;
}

function parseArrayMessage(message: unknown, selfId: number): { text: string; atBot: boolean } {
  let text = '';
  let atBot = false;
  if (Array.isArray(message)) {
    for (const seg of message) {
      if (!seg || typeof seg !== 'object') continue;
      const s = seg as { type?: string; data?: Record<string, unknown> };
      if (s.type === 'text' && typeof s.data?.text === 'string') {
        text += s.data.text.replace(/\u00a0/g, ' ');
      } else if (s.type === 'at') {
        const qq = String(s.data?.qq ?? '');
        if (qq === String(selfId)) atBot = true;
      }
    }
  }
  return { text: text.trim(), atBot };
}

function parseCqMessage(text: string, selfId: number): { text: string; atBot: boolean } {
  let out = '';
  let atBot = false;
  const re = /\[CQ:at,qq=(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index);
    if (m[1] === String(selfId)) atBot = true;
    last = re.lastIndex;
  }
  out += text.slice(last);
  return { text: out.replace(/\[CQ:[^\]]*\]/g, '').replace(/\u00a0/g, ' ').trim(), atBot };
}

export async function connectOneBot(opts: OneBotOptions): Promise<void> {
  let stopped = false;
  const headers = opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : undefined;

  const connect = async (attempt: number) => {
    try {
      currentWs = new WebSocket(opts.url, { headers });
      const ws = currentWs;

      ws.on('open', () => {
        console.log('[krt-onebot] 已连接', opts.url, '（attempt', attempt, '）');
      });

      ws.on('message', (data: Buffer) => {
        let ev: any;
        try {
          ev = JSON.parse(data.toString());
        } catch {
          return;
        }
        if (!ev) return;
        // API 调用结果
        if (typeof ev?.status === 'string' || typeof ev?.retcode === 'number') return;
        if (ev?.post_type === 'meta_event') return; // 心跳/生命周期事件
        if (ev?.post_type !== 'message') return;

        const msgType = ev.message_type;
        if (msgType !== 'group' && msgType !== 'private') return;
        const selfId = ev.self_id;

        const parsed =
          typeof ev.message === 'string'
            ? parseCqMessage(ev.message, selfId)
            : parseArrayMessage(ev.message, selfId);

        const userId = Number(ev.user_id);
        const msg: OneBotMessage = {
          channel: msgType === 'group' ? 'group' : 'c2c',
          key: msgType === 'group' ? `g:${ev.group_id}` : `c:${userId}`,
          messageId: String(ev.message_id),
          summon: msgType === 'group' ? parsed.atBot || /站娘|佩蒂娅|SCI-Petia/i.test(parsed.text) : true,
          content: parsed.text,
          groupId: msgType === 'group' ? Number(ev.group_id) : undefined,
          userId,
        };
        if (!msg.content) return;
        Promise.resolve(opts.onMessage(msg)).catch((e) => console.error('[krt-onebot] 事件处理出错', e));
      });

      ws.on('close', () => {
        if (currentWs === ws) currentWs = null;
        if (stopped) return;
        const delay = Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 5));
        console.log(`[krt-onebot] 连接断开，${delay}ms 后重连`);
        setTimeout(() => void connect(attempt + 1).catch(() => {}), delay);
      });

      ws.on('error', (err) => {
        console.error('[krt-onebot] websocket 错误', err.message);
        try {
          ws.close();
        } catch {
          /* 忽略 */
        }
      });
    } catch (e) {
      console.error('[krt-onebot] 连接失败', (e as Error).message);
      const delay = Math.min(60_000, 3_000 * 2 ** Math.min(attempt, 5));
      setTimeout(() => void connect(attempt + 1).catch(() => {}), delay);
    }
  };

  await connect(0);
}
