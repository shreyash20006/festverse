import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Admin · CampusConnect" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const [{ data: regs }, { data: tickets }, { data: events }] = await Promise.all([
        supabase.from("registrations").select("event_id, events(title), status"),
        supabase.from("tickets").select("event_id, checked_in_at, events(title)"),
        supabase.from("events").select("category"),
      ]);
      const byEvent = new Map<string, { title: string; regs: number; attended: number }>();
      (regs ?? []).forEach((r: any) => {
        const k = r.event_id;
        const cur = byEvent.get(k) ?? { title: r.events?.title ?? "—", regs: 0, attended: 0 };
        cur.regs += 1;
        byEvent.set(k, cur);
      });
      (tickets ?? []).forEach((t: any) => {
        if (!t.checked_in_at) return;
        const k = t.event_id;
        const cur = byEvent.get(k) ?? { title: t.events?.title ?? "—", regs: 0, attended: 0 };
        cur.attended += 1;
        byEvent.set(k, cur);
      });
      const byCategory = new Map<string, number>();
      (events ?? []).forEach((e: any) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1));
      return {
        events: Array.from(byEvent.entries()).map(([id, v]) => ({ id, ...v })),
        categories: Array.from(byCategory.entries()),
      };
    },
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Analytics</h1>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Events by category</h2>
          <ul className="mt-4 space-y-2">
            {(data?.categories ?? []).map(([c, n]) => (
              <li key={c} className="flex items-center justify-between text-sm">
                <span className="capitalize">{c}</span>
                <span className="font-mono font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Top events</h2>
          <ul className="mt-4 space-y-3">
            {(data?.events ?? []).slice(0, 8).map((e) => {
              const pct = e.regs ? Math.round((e.attended / e.regs) * 100) : 0;
              return (
                <li key={e.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="line-clamp-1 font-medium">{e.title}</span>
                    <span className="text-xs text-muted-foreground">{e.attended}/{e.regs}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
