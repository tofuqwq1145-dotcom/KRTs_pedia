import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  connectOneBot,
  oneBotGetGroupMemberList,
  oneBotOCRImage,
  oneBotSendC2C,
  oneBotSendC2CSticker,
  oneBotSendGroup,
  oneBotSendGroupSticker,
  type OneBotMessage,
  type OneBotNoticeEvent,
} from './onebot';
import { chatWithPetia, type HistoryLine } from './chat';

const wsUrl = process.env.QQ_ONEBOT_WS_URL ?? '';
const accessToken = process.env.QQ_ONEBOT_ACCESS_TOKEN ?? '';
const ownerUin = process.env.QQ_OWNER_UIN ?? '3160688182';
const STICKERS_DIR = path.join(process.cwd(), 'stickers');

if (!wsUrl) {
  console.error('[krt-onebot] 缺少 QQ_ONEBOT_WS_URL（例如 ws://127.0.0.1:3001），请检查 qq-bot/.env');
  process.exit(1);
}

const HISTORY_MAX = 20;
const COOLDOWN_MS = 8000;
const OCR_LIMIT = 2;
const history = new Map<string, HistoryLine[]>();
const cooldown = new Map<string, number>();
const seen = new Map<string, number>();
const addedAt = new Map<number, number>();

function pickSticker(mood: string): string | null {
  try {
    const dir = path.join(STICKERS_DIR, mood);
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter((f) => /\.gif$/i.test(f));
    if (files.length === 0) return null;
    return path.join(dir, files[Math.floor(Math.random() * files.length)]);
  } catch {
    return null;
  }
}

async function recognizeImages(images: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const img of images.slice(0, OCR_LIMIT)) {
    const t = await oneBotOCRImage(img);
    if (t) out.push(t);
  }
  return out;
}

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

  const vision: string[] = [];
  if (msg.images && msg.images.length > 0) {
    vision.push(`[用户发来 ${msg.images.length} 张图片${msg.images.length > OCR_LIMIT ? `，已识别前 ${OCR_LIMIT} 张` : ''}]`);
    const texts = await recognizeImages(msg.images);
    for (const t of texts) vision.push(`（其中一张图片中识别出的文字：${t}）`);
  }
  const finalContent = [msg.content, ...vision].filter((s) => s && s.trim()).join('\n');
  if (!finalContent) return;

  pushHistory(msg.key, 'user', finalContent);
  const lines = history.get(msg.key) ?? [];

  console.log(`[krt-onebot] ${msg.channel === 'group' ? '群' : '单聊'}:`, finalContent.replace(/\n/g, ' ').slice(0, 80));
  const reply = await chatWithPetia(lines, finalContent);
  console.log('[krt-onebot] 回复:', reply ? reply.slice(0, 80) : '(空)');
  if (!reply) return;

  const cleaned = reply.replace(/\[mascot:[a-z]+\]/gi, '').trim();
  if (!cleaned) return;

  const moodMatch = /\[mascot:([a-z]+)\]/i.exec(reply);
  const sticker = moodMatch ? pickSticker(moodMatch[1]) : null;

  const sent =
    msg.channel === 'group'
      ? sticker
        ? oneBotSendGroupSticker(msg.groupId!, msg.userId, cleaned, sticker)
        : oneBotSendGroup(msg.groupId!, msg.userId, cleaned)
      : sticker
        ? oneBotSendC2CSticker(msg.userId!, cleaned, sticker)
        : oneBotSendC2C(msg.userId!, cleaned);

  if (sent) pushHistory(msg.key, 'SCI-Petia', cleaned);
}

async function onNotice(ev: OneBotNoticeEvent) {
  if (ev.notice_type !== 'group_increase') return;
  if (Number(ev.user_id) !== Number(ev.self_id)) return; // 不是站娘自己被拉进群
  const groupId = Number(ev.group_id);
  if (!groupId) return;

  const now = Date.now();
  const last = addedAt.get(groupId);
  if (last && now - last < 60_000) return;
  addedAt.set(groupId, now);

  await new Promise((r) => setTimeout(r, 2000)); // 等成员列表缓存刷新

  const members = await oneBotGetGroupMemberList(groupId);
  const hasOwner = members.includes(Number(ownerUin));
  console.log(`[krt-onebot] 被拉进群 ${groupId}（${members.length} 人），主人 ${ownerUin} 在群: ${hasOwner}`);
  if (hasOwner) return;

  const ownerText = String(ownerUin);
  oneBotSendGroup(
    groupId,
    undefined,
    `各位好，我是 SCI-Petia（佩蒂娅），KRTP 档案库的记录者～ 刚发现我主人（QQ ${ownerText}）不在本群，麻烦群主或管理员把我主人拉进来，谢谢啦！`
  );
  oneBotSendC2C(Number(ownerUin), `我被拉进了新群（群号 ${groupId}），但群里没有你，我已经请群主/管理员把你拉进去啦～`);
}

console.log('[krt-onebot] 启动中… 连接', wsUrl);
await connectOneBot({ url: wsUrl, accessToken, onMessage, onNotice });
