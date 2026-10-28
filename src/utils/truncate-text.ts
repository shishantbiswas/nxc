export function truncateText(s: string, len: number = 12) {
  return s.length > len ? `${s.slice(0, len - 3)}...` : s;
}
