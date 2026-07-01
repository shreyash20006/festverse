import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  head: () => ({ meta: [{ title: "Registrations · Admin · CampusConnect" }] }),
  component: RegistrationsPage,
});

function RegistrationsPage() {
  const { data: regs = [] } = useQuery({
    queryKey: ["admin", "regs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, full_name, prn, email, phone, status, amount_paid, created_at, events(title, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Registrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">Most recent 500 registrations.</p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">PRN</th>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {regs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No registrations yet.</td></tr>
            ) : regs.map((r: any) => (
              <tr key={r.id} className="border-b border-border last:border-none hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{r.full_name}</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.prn}</td>
                <td className="px-4 py-2.5">{r.events?.title}</td>
                <td className="px-4 py-2.5 capitalize">{r.status.replace("_", " ")}</td>
                <td className="px-4 py-2.5">{Number(r.amount_paid) > 0 ? `₹${r.amount_paid}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
