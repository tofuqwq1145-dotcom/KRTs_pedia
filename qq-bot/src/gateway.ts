import WebSocket from 'ws';
import { ensureToken, getGatewayUrl } from './api';

export const INTENTS_GROUP_AND_C2C = 1 << 25; // GROUP_AND_C2C_EVENT

export interface BotMessage {
  type: 'group' | 'c2c';
  at: boolean;
  groupOpenid?: string;
  memberOpenid?: string;
  userOpenid?: string;
  messageId: string;
  content: string;
}

export interface GatewayOptions {
  appId: string;
  clientSecret: string;
  base: string;
  onMessage: (msg: BotMessage) => void | Promise<void>;
}

function cleanContent(s: string): string {
  return s
    .replace(/<@![^>]*>/g, '')
    .replace(/<@[^>]*>/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export async function runGateway(opts: GatewayOptions): Promise<void> {
  let sessionId = '';
  let lastSeq = 0;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let ws: WebSocket | null = null;
  let stopped = false;

  const send = (obj: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const handleDispatch = async (frame: any) => {
    const t: string | undefined = frame?.t;
    const d = frame?.d;
    if (typeof frame?.s === 'number') lastSeq = frame.s;

    if (t === 'READY') {
      sessionId = d?.session_id ?? '';
      console.log('[krt-qq] 就绪：', d?.user?.username ?? '机器人', '| session', sessionId);
      return;
    }
    if (t === 'RESUMED') {
      console.log('[krt-qq] 会话已恢复，session', sessionId);
      return;
    }
    if (t === 'GROUP_AT_MESSAGE_CREATE' || t === 'GROUP_MESSAGE_CREATE' || t === 'C2C_MESSAGE_CREATE') {
      const content = cleanContent(typeof d?.content === 'string' ? d.content : '');
      const messageId = d?.id;
      if (!content || !messageId) return;
      if (t !== 'C2C_MESSAGE_CREATE') {
        await opts.onMessage({
          type: 'group',
          at: t === 'GROUP_AT_MESSAGE_CREATE',
          groupOpenid: d?.group_openid,
          memberOpenid: d?.author?.member_openid,
          messageId,
          content,
        });
      } else {
        await opts.onMessage({
          type: 'c2c',
          at: false,
          userOpenid: d?.author?.user_openid,
          messageId,
          content,
        });
      }
    }
  };

  const connect = async (attempt: number) => {
    try {
      const accessToken = await ensureToken(opts.appId, opts.clientSecret);
      const url = await getGatewayUrl(opts.base, accessToken);

      ws = new WebSocket(url, { headers: { Authorization: `QQBot ${accessToken}` } });

      ws.on('open', () => {
        console.log('[krt-qq] websocket 已连接（attempt', attempt, '）');
      });

      ws.on('message', (data: Buffer) => {
        let frame: any;
        try { frame = JSON.parse(data.toString()); } catch { return; }
        const op = frame?.op;

        if (op === 10) {
          const interval = frame?.d?.heartbeat_interval ?? 30_000;
          stopHeartbeat();
          heartbeatTimer = setInterval(() => send({ op: 1, d: lastSeq || null }), interval);
          if (sessionId) {
            send({ op: 6, d: { token: `QQBot ${accessToken}`, session_id: sessionId, seq: lastSeq } });
          } else {
            send({
              op: 2,
              d: {
                token: `QQBot ${accessToken}`,
                intents: INTENTS_GROUP_AND_C2C,
                shard: [0, 1],
                properties: { $os: 'linux', $browser: 'krtpedia-qq', $device: 'krtpedia-qq' },
              },
            });
          }
        } else if (op === 0) {
          void handleDispatch(frame).catch((e) => console.error('[krt-qq] 事件处理出错', e));
        } else if (op === 7) {
          console.log('[krt-qq] 服务端要求重连');
          ws?.close();
        } else if (op === 9) {
          sessionId = '';
          lastSeq = 0;
          ws?.close();
        }
      });

      ws.on('close', () => {
        stopHeartbeat();
        if (stopped) return;
        const delay = Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 5));
        console.log(`[krt-qq] 连接断开，${delay}ms 后重连`);
        setTimeout(() => void connect(attempt + 1).catch(() => {}), delay);
      });

      ws.on('error', (err) => {
        console.error('[krt-qq] websocket 错误', err.message);
        try { ws?.close(); } catch { /* 忽略 */ }
      });
    } catch (e) {
      console.error('[krt-qq] 网关连接失败', (e as Error).message);
      const delay = Math.min(60_000, 3_000 * 2 ** Math.min(attempt, 5));
      setTimeout(() => void connect(attempt + 1).catch(() => {}), delay);
    }
  };

  await connect(0);
}