export const AUDIO_CACHE = 'krt-music-v1';

export async function isAudioCacheSupported(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    await caches.open(AUDIO_CACHE);
    return true;
  } catch (e) {
    return false;
  }
}

export async function isAudioCached(url: string): Promise<boolean> {
  try {
    const c = await caches.open(AUDIO_CACHE);
    return (await c.match(url)) != null;
  } catch (e) {
    return false;
  }
}

export async function downloadAudio(url: string, onProgress: (p: number) => void): Promise<void> {
  const c = await caches.open(AUDIO_CACHE);
  if (await c.match(url)) {
    onProgress(1);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('下载失败');
  const total = Number(res.headers.get('content-length') || 0);
  const reader = res.body ? res.body.getReader() : null;

  if (!reader) {
    const blob = await res.blob();
    await c.put(url, new Response(blob, { headers: { 'Content-Type': res.headers.get('content-type') || 'audio/mpeg' } }));
    onProgress(1);
    return;
  }

  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    received += value.byteLength;
    if (total) onProgress(Math.min(received / total, 1));
  }
  const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'audio/mpeg' });
  await c.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } }));
  onProgress(1);
}

export async function cachedAudioObjectUrl(url: string): Promise<string | null> {
  try {
    const c = await caches.open(AUDIO_CACHE);
    const hit = await c.match(url);
    if (!hit) return null;
    const blob = await hit.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}