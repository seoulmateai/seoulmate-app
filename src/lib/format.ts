// Copied from seoulmate/lib/chat/format.ts.
import { format, isSameYear, isToday, isYesterday } from "date-fns";

export function formatListTime(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return format(date, "p");
  if (isYesterday(date)) return "Yesterday";
  if (isSameYear(date, new Date())) return format(date, "MMM d");
  return format(date, "yyyy. M. d.");
}

export function formatBubbleTime(iso: string) {
  return format(new Date(iso), "p");
}
