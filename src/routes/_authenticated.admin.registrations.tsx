import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  head: () => ({ meta: [{ title: "Registrations · Admin · FestVerse" }] }),
  component: RegistrationsPage,
});

function RegistrationsPage() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data: regs = [] } = useQuery({
    queryKey: ["admin", "regs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, full_name, prn, email, phone, status, amount_paid, created_at, team_role, teams(id, name, invite_code), events(title, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const totalPages = Math.ceil(regs.length / itemsPerPage);
  const paginatedRegs = regs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Registrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">Most recent {regs.length} registrations.</p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">PRN</th>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Team / Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {regs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No registrations yet.</td></tr>
            ) : paginatedRegs.map((r: any) => (
              <tr key={r.id} className="border-b border-border last:border-none hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{r.full_name}</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.prn}</td>
                <td className="px-4 py-2.5">{r.events?.title}</td>
                <td className="px-4 py-2.5">
                  {r.teams?.name ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{r.teams.name}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full border border-border">
                        {r.team_role}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">Individual</span>
                  )}
                </td>
                <td className="px-4 py-2.5 capitalize">{r.status.replace("_", " ")}</td>
                <td className="px-4 py-2.5">{Number(r.amount_paid) > 0 ? `₹${r.amount_paid}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, regs.length)} of {regs.length} registrations
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
