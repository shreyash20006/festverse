import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (n) => (format ? format(n) : Math.round(n).toLocaleString("en-IN")));
  const [display, setDisplay] = useState(format ? format(0) : "0");
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);
  return <span>{display}</span>;
}

function Sparkline({ data, color = "currentColor" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `M0,${h} L${pts.replace(/ /g, " L")} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  icon: LucideIcon;
  label: string;
  value: number;
  delta?: number; // percent
  spark?: number[];
  format?: (n: number) => string;
  accent?: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";
};

const ACCENT: Record<NonNullable<Props["accent"]>, { bg: string; fg: string; stroke: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-500/10", fg: "text-blue-600 dark:text-blue-400", stroke: "#2563EB" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", fg: "text-violet-600 dark:text-violet-400", stroke: "#7C3AED" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400", stroke: "#059669" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400", stroke: "#D97706" },
  rose: { bg: "bg-rose-50 dark:bg-rose-500/10", fg: "text-rose-600 dark:text-rose-400", stroke: "#E11D48" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-500/10", fg: "text-cyan-600 dark:text-cyan-400", stroke: "#0891B2" },
};

export function KpiCard({ icon: Icon, label, value, delta, spark, format, accent = "blue" }: Props) {
  const a = ACCENT[accent];
  const Trend = delta == null ? Minus : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const trendColor =
    delta == null
      ? "text-muted-foreground bg-muted"
      : delta > 0
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
      : delta < 0
      ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10"
      : "text-muted-foreground bg-muted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[20px] border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">
            <AnimatedNumber value={value} format={format} />
          </div>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.bg} ${a.fg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trendColor}`}>
          <Trend className="h-3 w-3" />
          {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          <span className="font-normal opacity-70">vs last month</span>
        </span>
        {spark && spark.length > 1 && (
          <div className={`w-24 ${a.fg}`}>
            <Sparkline data={spark} color={a.stroke} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
