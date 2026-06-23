export function to12HourFormat(timeStr: string): string {
  if (!timeStr) return timeStr;
  if (/(?:AM|PM)\b/i.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ? parseInt(parts[1], 10) : 0;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
}
