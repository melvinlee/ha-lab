import { useId, useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { Area, AreaChart, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { CircleCheck, CircleAlert, CircleX, CircleDashed, CircleMinus, type LucideIcon } from "lucide-react";

export function Card({ title, icon: Icon, right, children, className = "", style }: { title?: ReactNode; icon?: LucideIcon; right?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || right) && (
        <header className="card-h">
          <h2 className="card-t" style={{ margin: 0 }}>{Icon && <Icon size={16} strokeWidth={2} aria-hidden />}{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export type Tone = "ok" | "warn" | "bad" | "muted" | "accent";
const toneIcon: Record<Tone, LucideIcon> = { ok: CircleCheck, warn: CircleAlert, bad: CircleX, muted: CircleMinus, accent: CircleDashed };

/** Status always = colour + icon + text label. */
export function Badge({ tone, label, icon, flash, spin }: { tone: Tone; label: string; icon?: LucideIcon; flash?: boolean; spin?: boolean }) {
  const I = icon ?? toneIcon[tone];
  return <span className={`badge ${tone}${flash ? " flash" : ""}${spin ? " spin" : ""}`}><I aria-hidden strokeWidth={2.25} />{label}</span>;
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <Icon size={16} aria-hidden />
      <div><strong>{title}</strong>{children}</div>
    </div>
  );
}

export function Skeleton({ w = "100%", h = 16, style }: { w?: number | string; h?: number; style?: CSSProperties }) {
  return <div className="skel" style={{ width: w, height: h, ...style }} aria-hidden />;
}

/** fit: scale the y-axis to the data's own range (for values like temperature that never go near 0).
 *  data2: optional second series (e.g. humidity, #88) on its own hidden, fitted y-axis, drawn as a dashed line
 *  in color2 with padding pad2. Joined to `data` by timestamp. */
export function Sparkline({ data, color = "var(--accent)", fit = false, data2, color2 = "var(--text-3)", pad2 = 1 }: {
  data: { t: number; v: number }[]; color?: string; fit?: boolean;
  data2?: { t: number; v: number }[]; color2?: string; pad2?: number;
}) {
  const id = useId().replace(/:/g, "");
  const two = !!data2 && data2.length >= 2;
  if (data.length < 2 && !two) return <div className="spark" />;
  const domain = fit ? [(min: number) => min - 0.2, (max: number) => max + 0.2] as const : [0, "dataMax"] as const;
  if (!two) {
    return (
      <div className="spark" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[...domain]} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${id})`} isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const rows = new Map<number, { t: number; v?: number; v2?: number }>();
  for (const p of data) rows.set(p.t, { t: p.t, v: p.v });
  for (const p of data2!) rows.set(p.t, { ...(rows.get(p.t) ?? { t: p.t }), v2: p.v });
  const joined = [...rows.values()].sort((a, b) => a.t - b.t);
  return (
    <div className="spark" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={joined} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis yAxisId="a" hide domain={[...domain]} />
          <YAxis yAxisId="b" hide domain={[(min: number) => min - pad2, (max: number) => max + pad2]} />
          <Area yAxisId="a" type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${id})`} isAnimationActive={false} dot={false} connectNulls />
          <Line yAxisId="b" type="monotone" dataKey="v2" stroke={color2} strokeWidth={1.25} strokeDasharray="3 3" isAnimationActive={false} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled, pending }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; pending?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${pending ? " pending" : ""}`}
      onClick={() => onChange(!checked)}
    />
  );
}

/** Slider that only commits on release, with live local value while dragging. */
export function Slider({ value, min = 0, max = 100, onCommit, label, disabled, suffix = "%" }: { value: number; min?: number; max?: number; onCommit: (v: number) => void; label: string; disabled?: boolean; suffix?: string }) {
  const [local, setLocal] = useState(value);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { if (!dragging) setLocal(value); }, [value, dragging]);
  const pct = ((local - min) / (max - min)) * 100;
  return (
    <div className="slider-wrap">
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        value={local}
        disabled={disabled}
        aria-label={label}
        style={{ ["--pct" as string]: `${pct}%` }}
        onPointerDown={() => setDragging(true)}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={() => { setDragging(false); onCommit(local); }}
        onKeyUp={() => onCommit(local)}
      />
      <span className="num">{Math.round(local)}{suffix}</span>
    </div>
  );
}
