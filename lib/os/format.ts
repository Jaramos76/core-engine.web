// Small date / label helpers. All relative to the dataset's fixed "now".

export function relativeTime(iso: string, nowIso: string): string {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  const diff = then - now;
  const abs = Math.abs(diff);
  const day = 86_400_000;
  const hour = 3_600_000;

  if (abs < hour) return diff >= 0 ? "soon" : "just now";
  if (abs < day) {
    const h = Math.round(abs / hour);
    return diff >= 0 ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(abs / day);
  if (d === 1) return diff >= 0 ? "tomorrow" : "yesterday";
  if (d < 14) return diff >= 0 ? `in ${d} days` : `${d} days ago`;
  const w = Math.round(d / 7);
  return diff >= 0 ? `in ${w} wk` : `${w} wk ago`;
}

export function dueLabel(iso: string | undefined, nowIso: string): string {
  if (!iso) return "no date";
  const diff = new Date(iso).getTime() - new Date(nowIso).getTime();
  if (diff < 0) return `overdue ${relativeTime(iso, nowIso)}`;
  return `due ${relativeTime(iso, nowIso)}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function daysBetween(aIso: string, bIso: string): number {
  return (
    (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000
  );
}

export function titleCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
