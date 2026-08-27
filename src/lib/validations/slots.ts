export function parseSlotInteger(value: string, fallback?: number): number | null {
  const normalized = value.trim();
  if (!normalized && fallback !== undefined) return fallback;
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
