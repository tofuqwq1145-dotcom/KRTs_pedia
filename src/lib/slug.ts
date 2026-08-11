export function normalizeSlug(input: string | null | undefined): string {
  const raw = (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (raw) return raw.slice(0, 80);
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}