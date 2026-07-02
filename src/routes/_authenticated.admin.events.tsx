import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteEvent } from "@/lib/admin.functions";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Events · Admin · FestVerse" }] }),
  component: AdminEventsList,
});

function AdminEventsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = useServerFn(deleteEvent);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin", "events", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, slug, title, status, start_at, venue, category, is_paid, price_inr, capacity")
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalPages = Math.ceil(events.length / itemsPerPage);
  const paginatedEvents = events.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await remove({ data: { id } });
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events", "all"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete event");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">{events.length} total</p>
        </div>
        <Link
          to="/admin/events/new"
          className="rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
        >
          + New event
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No events yet.</td></tr>
            ) : paginatedEvents.map((e: any) => (
              <tr key={e.id} className="border-b border-border last:border-none hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to="/events/$slug" params={{ slug: e.slug }} className="font-semibold hover:underline">
                    {e.title}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{e.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(e.start_at), "MMM d, h:mm a")}</td>
                <td className="px-4 py-3">{e.is_paid && Number(e.price_inr) > 0 ? `₹${e.price_inr}` : "Free"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/admin/events/$id/edit", params: { id: e.id } })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === e.id}
                      onClick={() => onDelete(e.id, e.title)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {deletingId === e.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, events.length)} of {events.length} events
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
