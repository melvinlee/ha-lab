export const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const fmtPower = (w: number) => (w >= 1000 ? { v: fmt(w / 1000, 2), u: "kW" } : { v: fmt(w, w < 10 ? 1 : 0), u: "W" });

export const fmtKwh = (k: number) => (k < 1 ? { v: fmt(k * 1000, 0), u: "Wh" } : { v: fmt(k, 2), u: "kWh" });

export const fmtMoney = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

export function relTime(ms: number, now = Date.now()) {
  const s = Math.round((now - ms) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
export const longDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

export function greeting(d: Date) {
  const h = d.getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
