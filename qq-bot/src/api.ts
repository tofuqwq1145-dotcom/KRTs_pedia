interface AccessToken {
  access_token: string;
  expires_in: number;
}

let cached: { token: string; exp: number } | null = null;

export async function getAccessToken(appId: string, clientSecret: string): Promise<AccessToken> {
  const res = await fetch('https://bots.qq.com/app/getAppAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, clientSecret }),
  });
  if (!res.ok) {
    throw new Error(`getAccessToken HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  }
  const d = (await res.json()) as Partial<AccessToken>;
  if (!d?.access_token) throw new Error('getAccessToken 未返回 access_token');
  return d as AccessToken;
}

export async function ensureToken(appId: string, clientSecret: string): Promise<string> {
  if (cached && Date.now() < cached.exp - 60_000) return cached.token;
  const t = await getAccessToken(appId, clientSecret);
  cached = { token: t.access_token, exp: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

export async function getGatewayUrl(base: string, token: string): Promise<string> {
  const res = await fetch(`${base}/gateway`, { headers: { Authorization: `QQBot ${token}` } });
  if (!res.ok) throw new Error(`gateway HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  const d = (await res.json()) as { url?: string };
  if (!d?.url) throw new Error('gateway 未返回 url');
  return d.url;
}

interface SendTarget {
  base: string;
  token: string;
}

export async function sendGroupMessage(t: SendTarget, groupOpenid: string, content: string, msgId?: string): Promise<boolean> {
  return post(`${t.base}/v2/groups/${groupOpenid}/messages`, t.token, { content, msg_type: 0, ...(msgId ? { msg_id: msgId } : {}) });
}

export async function sendC2CMessage(t: SendTarget, userOpenid: string, content: string, msgId?: string): Promise<boolean> {
  return post(`${t.base}/v2/users/${userOpenid}/messages`, t.token, { content, msg_type: 0, ...(msgId ? { msg_id: msgId } : {}) });
}

async function post(url: string, token: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `QQBot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error('[krt-qq] 发送失败', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return false;
  }
  return true;
}
