import { useId, useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
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
export function Badge({ tone, label, icon }: { tone: Tone; label: string; icon?: LucideIcon }) {
  const I = icon ?? toneIcon[tone];
  return <span className={`badge ${tone}`}><I aria-hidden strokeWidth={2.25} />{label}</span>;
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

export function Sparkline({ data, color = "var(--accent)" }: { data: { t: number; v: number }[]; color?: string }) {
  const id = useId().replace(/:/g, "");
  if (data.length < 2) return <div className="spark" />;
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
          <YAxis hide domain={[0, "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
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
