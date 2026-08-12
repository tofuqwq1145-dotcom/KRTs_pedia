import 'dotenv/config';
import { runGateway, type BotMessage } from './gateway';
import { ensureToken, sendC2CMessage, sendGroupMessage } from './api';
import { chatWithPetia, type HistoryLine } from './chat';

const appId = process.env.QQ_APP_ID ?? '';
const clientSecret = process.env.QQ_APP_SECRET ?? '';
const env = process.env.QQ_ENV ?? 'sandbox';
const base = env === 'production' ? 'https://api.sgroup.qq.com' : 'https://sandbox.api.sgroup.qq.com';

if (!appId || !clientSecret) {
  console.error('[krt-qq] 缺少 QQ_APP_ID / QQ_APP_SECRET，请检查 qq-bot/.env');
  process.exit(1);
}

const HISTORY_MAX = 20;
const COOLDOWN_MS = 8000;
const history = new Map<string, HistoryLine[]>();
const cooldown = new Map<string, number>();
const seen = new Map<string, number>();

function uidKey(msg: BotMessage): string {
  return msg.type === 'group' ? `g:${msg.groupOpenid}` : `c:${msg.userOpenid}`;
}

function isSummon(msg: BotMessage): boolean {
  if (msg.type === 'c2c') return true;
  if (msg.at) return true;
  return /站娘|佩蒂娅|SCI-Petia/i.test(msg.content);
}

function pushHistory(key: string, author: 'user' | 'SCI-Petia', content: string) {
  const arr = history.get(key) ?? [];
  arr.push({ author, content });
  if (arr.length > HISTORY_MAX) arr.splice(0, arr.length - HISTORY_MAX);
  history.set(key, arr);
}

async function sendReply(msg: BotMessage, reply: string) {
  const cleaned = reply.replace(/\[mascot:[a-z]+\]/gi, '').trim();
  if (!cleaned) return;
  const token = await ensureToken(appId, clientSecret);
  if (msg.type === 'group') {
    const at = msg.memberOpenid ? `<qqbot-at-user id="${msg.memberOpenid}" />` : '';
    return sendGroupMessage({ base, token }, msg.groupOpenid!, `${at}${cleaned}`, msg.messageId);
  }
  return sendC2CMessage({ base, token }, msg.userOpenid!, cleaned, msg.messageId);
}

async function onMessage(msg: BotMessage) {
  if (!isSummon(msg)) return;

  const now = Date.now();
  const lastSeen = seen.get(msg.messageId);
  if (lastSeen && now - lastSeen < 10_000) return;
  seen.set(msg.messageId, now);

  const key = uidKey(msg);
  const last = cooldown.get(key);
  if (last && now - last < COOLDOWN_MS) return;
  cooldown.set(key, now);

  pushHistory(key, 'user', msg.content);
  const lines = history.get(key) ?? [];

  console.log(`[krt-qq] ${msg.type === 'group' ? (msg.at ? '群@' : '群喊名') : '单聊'}:`, msg.content.slice(0, 60));
  const reply = await chatWithPetia(lines, msg.content);
  console.log('[krt-qq] 回复:', reply ? reply.slice(0, 80) : '(空)');

  if (!reply) return;
  const sent = await sendReply(msg, reply);
  if (sent) pushHistory(key, 'SCI-Petia', reply.replace(/\[mascot:[a-z]+\]/gi, '').trim());
}

console.log('[krt-qq] 启动中… 环境：', env === 'production' ? '正式' : '沙箱');
await runGateway({ appId, clientSecret, base, onMessage });