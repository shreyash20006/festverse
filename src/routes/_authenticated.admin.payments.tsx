import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Payments · Admin · CampusConnect" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: payments = [] } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount_inr, status, provider_code, created_at, events(title)")
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">All payment intents and their state.</p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Provider</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No payments recorded.</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id} className="border-b border-border last:border-none hover:bg-muted/30">
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5">{p.events?.title ?? "—"}</td>
                <td className="px-4 py-2.5 capitalize">{p.provider_code}</td>
                <td className="px-4 py-2.5 font-semibold">₹{Number(p.amount_inr).toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    p.status === "success" ? "bg-success/15 text-success" :
                    p.status === "failed" ? "bg-destructive/15 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
