import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryBadge } from "@/components/category-badge";
import { Ticket, Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-tickets")({
  head: () => ({ meta: [{ title: "My Tickets — FestVerse" }] }),
  component: MyTicketsPage,
});

function MyTicketsPage() {
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, ticket_code, status, checked_in_at, issued_at, events(id, slug, title, banner_url, venue, start_at, category), registrations(id, teams(id, name))"
        )
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">My tickets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          All your registrations and QR codes in one place.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">No tickets yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Browse events to get your first one.</p>
            <Link
              to="/events"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
            >
              Browse events
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {tickets.map((t: any) => (
              <Link
                key={t.id}
                to="/tickets/$id"
                params={{ id: t.id }}
                className="group flex overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="relative aspect-square w-32 shrink-0 bg-gradient-mesh">
                  {t.events?.banner_url && (
                    <img src={t.events.banner_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <CategoryBadge category={t.events?.category ?? "other"} />
                    {t.registrations?.teams && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                        Team: {t.registrations.teams.name}
                      </span>
                    )}
                  </div>
                  <div className="line-clamp-1 font-display text-base font-semibold">
                    {t.events?.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {t.events?.start_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(t.events.start_at), "MMM d, h:mm a")}
                      </span>
                    )}
                    {t.events?.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {t.events.venue}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {t.ticket_code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        t.checked_in_at
                          ? "text-success"
                          : t.status === "cancelled"
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {t.checked_in_at ? "Checked in" : t.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
