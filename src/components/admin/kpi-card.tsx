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
      ? "text-emerald-600 bg-emerald-500/10"
      : delta < 0
      ? "text-rose-600 bg-rose-500/10"
      : "text-muted-foreground bg-muted";

  const glowColorMap: Record<NonNullable<Props["accent"]>, string> = {
    blue: "bg-blue-500/5 dark:bg-blue-500/10",
    violet: "bg-violet-500/5 dark:bg-violet-500/10",
    emerald: "bg-emerald-500/5 dark:bg-emerald-500/10",
    amber: "bg-amber-500/5 dark:bg-amber-500/10",
    rose: "bg-rose-500/5 dark:bg-rose-500/10",
    cyan: "bg-cyan-500/5 dark:bg-cyan-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-b from-card to-card/75 p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-elevated"
    >
      {/* Decorative Corner Glow */}
      <div className={`absolute -right-8 -bottom-8 h-28 w-28 rounded-full ${glowColorMap[accent]} blur-2xl opacity-50 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100 pointer-events-none`} />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
          <div className="mt-2.5 font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
            <AnimatedNumber value={value} format={format} />
          </div>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${a.bg} ${a.fg} shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 relative z-10">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${trendColor}`}>
          <Trend className="h-3 w-3" />
          {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          <span className="font-normal opacity-70 ml-1">vs last month</span>
        </span>
        {spark && spark.length > 1 && (
          <div className={`w-24 ${a.fg} opacity-80 group-hover:opacity-100 transition-opacity`}>
            <Sparkline data={spark} color={a.stroke} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
