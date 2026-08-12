import 'dotenv/config';
import { connectOneBot, oneBotSendC2C, oneBotSendGroup, type OneBotMessage } from './onebot';
import { chatWithPetia, type HistoryLine } from './chat';

const wsUrl = process.env.QQ_ONEBOT_WS_URL ?? '';
const accessToken = process.env.QQ_ONEBOT_ACCESS_TOKEN ?? '';

if (!wsUrl) {
  console.error('[krt-onebot] 缺少 QQ_ONEBOT_WS_URL（例如 ws://127.0.0.1:3001），请检查 qq-bot/.env');
  process.exit(1);
}

const HISTORY_MAX = 20;
const COOLDOWN_MS = 8000;
const history = new Map<string, HistoryLine[]>();
const cooldown = new Map<string, number>();
const seen = new Map<string, number>();

function pushHistory(key: string, author: 'user' | 'SCI-Petia', content: string) {
  const arr = history.get(key) ?? [];
  arr.push({ author, content });
  if (arr.length > HISTORY_MAX) arr.splice(0, arr.length - HISTORY_MAX);
  history.set(key, arr);
}

async function onMessage(msg: OneBotMessage) {
  if (!msg.summon) return;

  const now = Date.now();
  const lastSeen = seen.get(msg.messageId);
  if (lastSeen && now - lastSeen < 10_000) return;
  seen.set(msg.messageId, now);

  const last = cooldown.get(msg.key);
  if (last && now - last < COOLDOWN_MS) return;
  cooldown.set(msg.key, now);

  pushHistory(msg.key, 'user', msg.content);
  const lines = history.get(msg.key) ?? [];

  console.log(`[krt-onebot] ${msg.channel === 'group' ? '群' : '单聊'}:`, msg.content.slice(0, 60));
  const reply = await chatWithPetia(lines, msg.content);
  console.log('[krt-onebot] 回复:', reply ? reply.slice(0, 80) : '(空)');
  if (!reply) return;

  const cleaned = reply.replace(/\[mascot:[a-z]+\]/gi, '').trim();
  if (!cleaned) return;

  const sent =
    msg.channel === 'group'
      ? oneBotSendGroup(msg.groupId!, msg.userId, cleaned)
      : oneBotSendC2C(msg.userId!, cleaned);

  if (sent) pushHistory(msg.key, 'SCI-Petia', cleaned);
}

console.log('[krt-onebot] 启动中… 连接', wsUrl);
await connectOneBot({ url: wsUrl, accessToken, onMessage });
