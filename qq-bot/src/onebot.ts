import WebSocket from 'ws';
import fs from 'fs/promises';

export interface OneBotMessage {
  channel: 'group' | 'c2c';
  key: string;
  messageId: string;
  summon: boolean;
  content: string;
  images?: string[];
  groupId?: number;
  userId?: number;
}

export interface OneBotNoticeEvent {
  post_type: 'notice';
  notice_type: string;
  self_id: number;
  group_id?: number;
  user_id?: number;
  operator_id?: number;
  sub_type?: string;
}

export interface OneBotOptions {
  url: string;
  accessToken?: string;
  onMessage: (msg: OneBotMessage) => void | Promise<void>;
  onNotice?: (ev: OneBotNoticeEvent) => void | Promise<void>;
}

let currentWs: WebSocket | null = null;
const pending = new Map<string, (ev: any) => void>();
let echoSeq = 0;

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

export function oneBotSendGroupSticker(groupId: number, userId: number | undefined, text: string, stickerPath: string): boolean {
  const ws = currentWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const message: any[] = [];
  if (userId) message.push({ type: 'at', data: { qq: String(userId) } });
  if (text) message.push({ type: 'text', data: { text: ` ${text}` } });
  message.push({ type: 'image', data: { file: stickerPath } });
  ws.send(JSON.stringify({ action: 'send_group_msg', params: { group_id: groupId, message } }));
  return true;
}

export function oneBotSendC2CSticker(userId: number, text: string, stickerPath: string): boolean {
  const ws = currentWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const message: any[] = [{ type: 'image', data: { file: stickerPath } }];
  if (text) message.push({ type: 'text', data: { text: ` ${text}` } });
  ws.send(JSON.stringify({ action: 'send_private_msg', params: { user_id: userId, message } }));
  return true;
}

function callOneBot(action: string, params: Record<string, unknown>): Promise<any> {
  const ws = currentWs;
  if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('websocket 未连接'));
  const echo = `krt_${Date.now()}_${++echoSeq}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(echo);
      reject(new Error(`API 超时: ${action}`));
    }, 15_000);
    pending.set(echo, (ev) => {
      clearTimeout(timer);
      if (ev.status !== 'ok') reject(new Error(`${action} 返回异常: ${JSON.stringify(ev).slice(0, 200)}`));
      else resolve(ev.data);
    });
    ws.send(JSON.stringify({ action, params, echo }));
  });
}

export async function oneBotGetGroupMemberList(groupId: number): Promise<number[]> {
  try {
    const data = await callOneBot('get_group_member_list', { group_id: String(groupId), no_cache: false });
    if (!Array.isArray(data)) return [];
    return data.map((m) => Number(m?.user_id)).filter((id) => Number.isFinite(id) && id > 0);
  } catch (e) {
    console.error('[krt-onebot] 获取群成员列表失败', (e as Error).message);
    return [];
  }
}

function parseOcrResult(data: any): string {
  if (Array.isArray(data)) {
    return data
      .map((b) => (typeof b?.text === 'string' ? b.text : ''))
      .filter(Boolean)
      .join('');
  }
  if (data && Array.isArray(data.texts)) {
    return data.texts.map((t: any) => t?.text ?? '').filter(Boolean).join('');
  }
  if (typeof data?.text === 'string') return data.text;
  return '';
}

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

async function isOcrCapableFile(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r');
    const head = Buffer.alloc(16);
    await fd.read(head, 0, head.length, 0);
    await fd.close();
    return head.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC) || head.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC);
  } catch {
    return false;
  }
}

export async function oneBotOCRImage(target: string): Promise<string> {
  const probe = async (image: string): Promise<string> => {
    try {
      return parseOcrResult(await callOneBot('ocr_image', { image }));
    } catch (e) {
      console.error('[krt-onebot] 图片识别失败', (e as Error).message);
      return '';
    }
  };

  // 1) 把收到的 file（缓存文件名）解析成真实本地路径
  let localFile = '';
  let freshUrl = '';
  try {
    const got = await callOneBot('get_image', { file: target });
    if (got && typeof got.file === 'string' && got.file) localFile = got.file;
    if (got && typeof got.url === 'string' && got.url) freshUrl = got.url;
  } catch {
    /* get_image 失败就继续走下面的兜底 */
  }

  // 2) 本地文件 OCR（只处理 JPG/PNG，GIF 等动画直接跳过，避免 OCR 挂起）
  if (localFile && (await isOcrCapableFile(localFile))) {
    const t = await probe(localFile);
    if (t) return t;
  }

  // 3) 用 NapCat 重新签发的 URL（gchat.qpic.cn）兜底
  if (freshUrl) {
    const t = await probe(freshUrl);
    if (t) return t;
  }

  // 4) 原始 target 兜底
  if (target !== localFile && target !== freshUrl) {
    const t = await probe(target);
    if (t) return t;
  }
  return '';
}

function parseArrayMessage(message: unknown, selfId: number): { text: string; atBot: boolean; images: string[] } {
  let text = '';
  let atBot = false;
  const images: string[] = [];
  if (Array.isArray(message)) {
    for (const seg of message) {
      if (!seg || typeof seg !== 'object') continue;
      const s = seg as { type?: string; data?: Record<string, unknown> };
      if (s.type === 'text' && typeof s.data?.text === 'string') {
        text += s.data.text.replace(/\u00a0/g, ' ');
      } else if (s.type === 'at') {
        const qq = String(s.data?.qq ?? '');
        if (qq === String(selfId)) atBot = true;
      } else if (s.type === 'image') {
        const url = typeof s.data?.url === 'string' ? s.data.url : '';
        const file = typeof s.data?.file === 'string' ? s.data.file : '';
        images.push(file || url);
      }
    }
  }
  return { text: text.trim(), atBot, images: images.filter(Boolean) };
}

function parseCqMessage(text: string, selfId: number): { text: string; atBot: boolean; images: string[] } {
  let out = '';
  let atBot = false;
  const images: string[] = [];
  const re = /\[CQ:at,qq=(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index);
    if (m[1] === String(selfId)) atBot = true;
    last = re.lastIndex;
  }
  out += text.slice(last);
  const imgRe = /\[CQ:image[^\]]*\]/g;
  let im: RegExpExecArray | null;
  while ((im = imgRe.exec(out)) !== null) {
    const attrs = im[0];
    const urlM = /url=([^,\]]+)/.exec(attrs);
    const fileM = /file=([^,\]]+)/.exec(attrs);
    const target = urlM ? urlM[1] : fileM ? fileM[1] : '';
    if (target) images.push(target);
  }
  return { text: out.replace(/\[CQ:[^\]]*\]/g, '').replace(/\u00a0/g, ' ').trim(), atBot, images };
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
        // API 调用响应（echo 关联）
        if (typeof ev?.echo === 'string' && pending.has(ev.echo)) {
          const done = pending.get(ev.echo)!;
          pending.delete(ev.echo);
          done(ev);
          return;
        }
        // API 调用结果
        if (typeof ev?.status === 'string' || typeof ev?.retcode === 'number') return;
        if (ev?.post_type === 'meta_event') return; // 心跳/生命周期事件
        if (ev?.post_type === 'notice') {
          if (opts.onNotice) Promise.resolve(opts.onNotice(ev as OneBotNoticeEvent)).catch((e) => console.error('[krt-onebot] notice 处理出错', e));
          return;
        }
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
          images: parsed.images,
          groupId: msgType === 'group' ? Number(ev.group_id) : undefined,
          userId,
        };
        if (!msg.content && (!msg.images || msg.images.length === 0)) return;
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
