import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, startOfDay, subDays, subMonths } from "date-fns";
import {
  Calendar,
  Users,
  CreditCard,
  Ticket,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  HandHelping,
  GraduationCap,
  Percent,
  Sparkles,
  Plus,
  QrCode,
  FileDown,
  Megaphone,
  ArrowRight,
  Activity,
  Radio,
  IndianRupee,
} from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard · Admin · CampusConnect" }] }),
  component: AdminDashboard,
});

// ----- helpers ---------------------------------------------------------
function pctDelta(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}
function buildBuckets(rows: { created_at: string }[], days = 14) {
  const start = startOfDay(subDays(new Date(), days - 1)).getTime();
  const buckets = new Array(days).fill(0);
  rows.forEach((r) => {
    const t = new Date(r.created_at).getTime();
    const idx = Math.floor((t - start) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx]++;
  });
  return buckets;
}

// ----- main ------------------------------------------------------------
function AdminDashboard() {
  const qc = useQueryClient();

  // Aggregate stats query
  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async () => {
      const now = new Date();
      const since30 = subDays(now, 30).toISOString();
      const since60 = subDays(now, 60).toISOString();
      const since14 = subDays(now, 14).toISOString();
      const todayStart = startOfDay(now).toISOString();

      const [
        events,
        eventsUpcoming,
        eventsLive,
        regsAll,
        regs30,
        regs60to30,
        regs14,
        ticketsCheckedIn,
        ticketsCheckedToday,
        payAll,
        pay30,
        pay60to30,
        pay14,
        payPending,
        certs,
        certs14,
        students30,
      ] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("start_at", now.toISOString()),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .lte("start_at", now.toISOString())
          .gte("end_at", now.toISOString()),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }).gte("created_at", since30),
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since60)
          .lt("created_at", since30),
        supabase.from("registrations").select("created_at").gte("created_at", since14),
        supabase.from("tickets").select("id", { count: "exact", head: true }).not("checked_in_at", "is", null),
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .gte("checked_in_at", todayStart),
        supabase.from("payments").select("amount_inr,status,created_at").eq("status", "success"),
        supabase
          .from("payments")
          .select("amount_inr")
          .eq("status", "success")
          .gte("created_at", since30),
        supabase
          .from("payments")
          .select("amount_inr")
          .eq("status", "success")
          .gte("created_at", since60)
          .lt("created_at", since30),
        supabase
          .from("payments")
          .select("amount_inr,created_at")
          .eq("status", "success")
          .gte("created_at", since14),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("issued_at").gte("issued_at", since14),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
      ]);

      const revenue30 = (pay30.data ?? []).reduce((a, p) => a + Number(p.amount_inr ?? 0), 0);
      const revenuePrev = (pay60to30.data ?? []).reduce((a, p) => a + Number(p.amount_inr ?? 0), 0);
      const revenueTotal = (payAll.data ?? []).reduce((a, p) => a + Number(p.amount_inr ?? 0), 0);

      const regsTotal = regsAll.count ?? 0;
      const attendedTotal = ticketsCheckedIn.count ?? 0;
      const attendanceRate = regsTotal ? (attendedTotal / regsTotal) * 100 : 0;

      const regsSpark = buildBuckets(regs14.data ?? [], 14);
      const revSpark = buildBuckets(
        (pay14.data ?? []).map((p) => ({ created_at: p.created_at })),
        14
      ).map((_, i, arr) => {
        // bucket revenue daily
        const start = startOfDay(subDays(new Date(), 13)).getTime();
        const dayStart = start + i * 86_400_000;
        const dayEnd = dayStart + 86_400_000;
        return (pay14.data ?? []).reduce((a, p) => {
          const t = new Date(p.created_at).getTime();
          return t >= dayStart && t < dayEnd ? a + Number(p.amount_inr ?? 0) : a;
        }, 0);
      });
      const certSpark = buildBuckets(
        (certs14.data ?? []).map((c: any) => ({ created_at: c.issued_at })),
        14
      );

      return {
        events: events.count ?? 0,
        eventsUpcoming: eventsUpcoming.count ?? 0,
        eventsLive: eventsLive.count ?? 0,
        regsTotal,
        regs30: regs30.count ?? 0,
        regsDelta: pctDelta(regs30.count ?? 0, regs60to30.count ?? 0),
        regsSpark,
        attendedTotal,
        attendedToday: ticketsCheckedToday.count ?? 0,
        attendanceRate,
        revenueTotal,
        revenue30,
        revenueDelta: pctDelta(revenue30, revenuePrev),
        revSpark,
        payPending: payPending.count ?? 0,
        certs: certs.count ?? 0,
        certSpark,
        students30: students30.count ?? 0,
      };
    },
  });

  // Upcoming events with registration data
  const { data: upcoming = [] } = useQuery({
    queryKey: ["admin", "dashboard", "upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug, start_at, end_at, venue, status, capacity, banner_url, category, is_paid, price_inr")
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(4);
      if (!data) return [];
      // Enrich with reg + check-in counts
      const enriched = await Promise.all(
        data.map(async (e: any) => {
          const [{ count: regs }, { count: checkedIn }, payRes] = await Promise.all([
            supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", e.id),
            supabase
              .from("tickets")
              .select("id", { count: "exact", head: true })
              .eq("event_id", e.id)
              .not("checked_in_at", "is", null),
            supabase.from("payments").select("amount_inr").eq("event_id", e.id).eq("status", "success"),
          ]);
          const revenue = (payRes.data ?? []).reduce((a, p) => a + Number(p.amount_inr ?? 0), 0);
          return { ...e, regs: regs ?? 0, checkedIn: checkedIn ?? 0, revenue };
        })
      );
      return enriched;
    },
  });

  // Realtime activity feed
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // Seed feed from recent rows
  useQuery({
    queryKey: ["admin", "dashboard", "feed-seed"],
    queryFn: async () => {
      const [regs, pays, tix, certs] = await Promise.all([
        supabase
          .from("registrations")
          .select("id, full_name, event_id, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("payments")
          .select("id, amount_inr, status, created_at, user_id")
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("tickets")
          .select("id, ticket_code, checked_in_at")
          .not("checked_in_at", "is", null)
          .order("checked_in_at", { ascending: false })
          .limit(8),
        supabase
          .from("certificates")
          .select("id, full_name, event_title, issued_at")
          .order("issued_at", { ascending: false })
          .limit(5),
      ]);
      const items: FeedItem[] = [];
      (regs.data ?? []).forEach((r) =>
        items.push({
          id: `reg-${r.id}`,
          kind: "registration",
          title: `${r.full_name} registered`,
          at: r.created_at,
        })
      );
      (pays.data ?? []).forEach((p) =>
        items.push({
          id: `pay-${p.id}`,
          kind: "payment" as const,
          title: `Payment received · ₹${Number(p.amount_inr).toLocaleString("en-IN")}`,
          at: p.created_at,
        })
      );
      (tix.data ?? []).forEach((t) =>
        items.push({
          id: `tix-${t.id}`,
          kind: "checkin",
          title: `Check-in · ${t.ticket_code}`,
          at: t.checked_in_at!,
        })
      );
      (certs.data ?? []).forEach((c) =>
        items.push({
          id: `cert-${c.id}`,
          kind: "certificate",
          title: `Certificate issued to ${c.full_name}`,
          at: c.issued_at,
        })
      );
      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setFeed(items.slice(0, 20));
      return items;
    },
  });

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "registrations" }, (payload) => {
        const r: any = payload.new;
        setFeed((f) =>
          [
            { id: `reg-${r.id}`, kind: "registration" as const, title: `${r.full_name} registered`, at: r.created_at, isNew: true },
            ...f,
          ].slice(0, 20)
        );
        qc.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload) => {
        const p: any = payload.new;
        if (p?.status === "success") {
          setFeed((f) =>
            [
              {
                id: `pay-${p.id}`,
                kind: "payment" as const,
                title: `Payment received · ₹${Number(p.amount_inr).toLocaleString("en-IN")}`,
                at: p.created_at,
                isNew: true,
              },
              ...f,
            ].slice(0, 20)
          );
        }
        qc.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, (payload) => {
        const t: any = payload.new;
        if (t?.checked_in_at && !payload.old?.checked_in_at) {
          setFeed((f) =>
            [
              { id: `tix-${t.id}`, kind: "checkin" as const, title: `Check-in · ${t.ticket_code}`, at: t.checked_in_at, isNew: true },
              ...f,
            ].slice(0, 20)
          );
          qc.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "certificates" }, (payload) => {
        const c: any = payload.new;
        setFeed((f) =>
          [
            { id: `cert-${c.id}`, kind: "certificate" as const, title: `Certificate issued to ${c.full_name}`, at: c.issued_at, isNew: true },
            ...f,
          ].slice(0, 20)
        );
        qc.invalidateQueries({ queryKey: ["admin", "dashboard", "stats"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const nextEvent = upcoming[0];
  const now = new Date();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-elevated sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-32 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" />
              {format(now, "EEEE, d MMMM yyyy")}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Here's what's happening across your campus today. {stats?.attendedToday ?? 0} check-ins so far, {stats?.payPending ?? 0} pending payments.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroPill
                icon={Calendar}
                label="Next event"
                value={nextEvent ? nextEvent.title : "None scheduled"}
                sub={nextEvent ? format(new Date(nextEvent.start_at), "d MMM · h:mm a") : "—"}
              />
              <HeroPill
                icon={Ticket}
                label="Today's check-ins"
                value={`${stats?.attendedToday ?? 0}`}
                sub="across all events"
              />
              <HeroPill
                icon={AlertCircle}
                label="Pending"
                value={`${stats?.payPending ?? 0} payments`}
                sub="need attention"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <QuickAction icon={Plus} label="Create event" to="/admin/events/new" primary />
            <QuickAction icon={QrCode} label="Scan QR" to="/admin/scanner" />
            <QuickAction icon={FileDown} label="Export report" to="/admin/registrations" />
            <QuickAction icon={Megaphone} label="Send notice" />
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard icon={Calendar} label="Total events" value={stats?.events ?? 0} accent="blue" />
        <KpiCard icon={Clock} label="Upcoming events" value={stats?.eventsUpcoming ?? 0} accent="violet" />
        <KpiCard icon={Radio} label="Live now" value={stats?.eventsLive ?? 0} accent="rose" />
        <KpiCard
          icon={Users}
          label="Registrations"
          value={stats?.regsTotal ?? 0}
          delta={stats?.regsDelta}
          spark={stats?.regsSpark}
          accent="blue"
        />
        <KpiCard icon={CheckCircle2} label="Checked in" value={stats?.attendedTotal ?? 0} accent="emerald" />
        <KpiCard
          icon={Percent}
          label="Attendance rate"
          value={stats?.attendanceRate ?? 0}
          format={(n) => `${n.toFixed(1)}%`}
          accent="cyan"
        />
        <KpiCard
          icon={IndianRupee}
          label="Revenue (total)"
          value={stats?.revenueTotal ?? 0}
          delta={stats?.revenueDelta}
          spark={stats?.revSpark}
          format={(n) => `₹${Math.round(n).toLocaleString("en-IN")}`}
          accent="emerald"
        />
        <KpiCard
          icon={Award}
          label="Certificates issued"
          value={stats?.certs ?? 0}
          spark={stats?.certSpark}
          accent="amber"
        />
        <KpiCard icon={AlertCircle} label="Pending payments" value={stats?.payPending ?? 0} accent="amber" />
        <KpiCard icon={HandHelping} label="Active volunteers" value={0} accent="violet" />
        <KpiCard icon={GraduationCap} label="New students (30d)" value={stats?.students30 ?? 0} accent="cyan" />
        <KpiCard
          icon={TrendingUp}
          label="Conversion rate"
          value={
            stats && stats.regsTotal
              ? ((stats.attendedTotal / Math.max(stats.regsTotal, 1)) * 100)
              : 0
          }
          format={(n) => `${n.toFixed(1)}%`}
          accent="rose"
        />
      </div>

      {/* Live feed + event performance */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Event performance */}
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Event performance</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live snapshot of your upcoming & ongoing events
              </p>
            </div>
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {upcoming.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                <div className="mt-2 text-sm font-semibold">No upcoming events</div>
                <p className="mt-1 text-xs text-muted-foreground">Create your first event to see live performance here.</p>
                <Link
                  to="/admin/events/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3" /> Create event
                </Link>
              </div>
            )}
            {upcoming.map((e: any) => (
              <EventPerformanceCard key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* Live activity */}
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight">Live activity</h2>
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 max-h-[480px] overflow-y-auto pr-1">
            {feed.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Activity will appear here in real time.
              </div>
            )}
            <AnimatePresence initial={false}>
              {feed.map((it) => (
                <FeedRow key={it.id} item={it} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

// ----- subcomponents ---------------------------------------------------

function HeroPill({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 truncate font-display text-base font-bold">{value}</div>
      <div className="truncate text-[11px] text-white/70">{sub}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  primary,
}: {
  icon: any;
  label: string;
  to?: string;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-white text-blue-700 hover:bg-white/90"
    : "bg-white/10 text-white hover:bg-white/15 border border-white/15";
  const inner = (
    <span className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${cls}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
  return to ? <Link to={to}>{inner}</Link> : <button>{inner}</button>;
}

function EventPerformanceCard({ event: e }: { event: any }) {
  const capacityPct = e.capacity ? Math.min(100, (e.regs / e.capacity) * 100) : null;
  const attendancePct = e.regs ? (e.checkedIn / e.regs) * 100 : 0;
  const now = Date.now();
  const isLive = new Date(e.start_at).getTime() <= now && new Date(e.end_at).getTime() >= now;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex flex-col rounded-2xl border border-border bg-background/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {e.banner_url ? (
            <img src={e.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:bg-rose-500/15">
                <span className="h-1 w-1 animate-pulse rounded-full bg-rose-600" /> Live
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-500/15">
                {e.status}
              </span>
            )}
            <span className="truncate text-[11px] text-muted-foreground">
              {format(new Date(e.start_at), "d MMM · h:mm a")}
            </span>
          </div>
          <h3 className="mt-1 truncate font-display text-sm font-bold tracking-tight">{e.title}</h3>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Metric label="Registrations" value={e.regs} cap={e.capacity} pct={capacityPct} color="bg-blue-500" />
        <Metric
          label="Attendance"
          value={e.checkedIn}
          cap={e.regs}
          pct={attendancePct}
          color="bg-emerald-500"
        />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
          <div className="font-display text-sm font-bold tabular-nums">
            ₹{Number(e.revenue || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="flex gap-1">
          <Link
            to="/events/$slug"
            params={{ slug: e.slug }}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
          >
            View
          </Link>
          <Link
            to="/admin/events"
            className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
          >
            Manage
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  cap,
  pct,
  color,
}: {
  label: string;
  value: number;
  cap?: number | null;
  pct: number | null;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value}
          {cap != null ? <span className="text-muted-foreground"> / {cap}</span> : null}
          {pct != null ? <span className="ml-1.5 text-muted-foreground">({pct.toFixed(0)}%)</span> : null}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
      </div>
    </div>
  );
}

type FeedItem = {
  id: string;
  kind: "registration" | "payment" | "checkin" | "certificate" | "notice";
  title: string;
  at: string;
  isNew?: boolean;
};

const FEED_META: Record<FeedItem["kind"], { icon: any; bg: string; fg: string }> = {
  registration: { icon: Users, bg: "bg-blue-50 dark:bg-blue-500/10", fg: "text-blue-600 dark:text-blue-400" },
  payment: { icon: CreditCard, bg: "bg-emerald-50 dark:bg-emerald-500/10", fg: "text-emerald-600 dark:text-emerald-400" },
  checkin: { icon: CheckCircle2, bg: "bg-violet-50 dark:bg-violet-500/10", fg: "text-violet-600 dark:text-violet-400" },
  certificate: { icon: Award, bg: "bg-amber-50 dark:bg-amber-500/10", fg: "text-amber-600 dark:text-amber-400" },
  notice: { icon: Megaphone, bg: "bg-cyan-50 dark:bg-cyan-500/10", fg: "text-cyan-600 dark:text-cyan-400" },
};

function FeedRow({ item }: { item: FeedItem }) {
  const m = FEED_META[item.kind];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.bg} ${m.fg}`}>
        <m.icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{item.title}</div>
          {item.isNew && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              New
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}
