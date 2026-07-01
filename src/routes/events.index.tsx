import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard, type EventCardData } from "@/components/event-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import { useTenant } from "@/components/tenant-provider";

const SearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  free: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/events/")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "All events — FestVerse" },
      { name: "description", content: "Browse all college events. Filter by category, price and date." },
      { property: "og:title", content: "All events — FestVerse" },
      { property: "og:description", content: "Browse all college events." },
    ],
  }),
  component: EventsPage,
});

const CATEGORIES = ["technical", "cultural", "sports", "workshop", "placement", "pharmacy", "seminar"];

function EventsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const { collegeId } = useTenant();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "list", search.category, search.free, collegeId],
    queryFn: async (): Promise<EventCardData[]> => {
      let query = supabase
        .from("events")
        .select(
          "id, slug, title, short_description, category, banner_url, venue, start_at, is_paid, price_inr, capacity, featured"
        )
        .eq("status", "published");
      if (collegeId) query = query.eq("college_id", collegeId);
      if (search.category) query = query.eq("category", search.category as any);
      if (search.free) query = query.eq("is_paid", false);
      
      const { data, error } = await query.order("start_at", { ascending: true });
      if (error) throw error;
      return data as EventCardData[];
    },
  });

  const filtered = q
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(q.toLowerCase()) ||
          (e.short_description ?? "").toLowerCase().includes(q.toLowerCase()) ||
          (e.venue ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : events;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">All events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} event{filtered.length === 1 ? "" : "s"} ·{" "}
            {search.category ? `Category: ${search.category}` : "All categories"}
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, venues..."
              className="h-11 rounded-full pl-9"
            />
          </div>
        </div>

        <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0 sm:mb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            <Link
              to="/events"
              search={{ category: undefined, free: search.free }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !search.category ? "bg-gradient-brand text-white shadow-glow" : "border border-border bg-card hover:bg-muted"
              }`}
            >
              All
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/events"
                search={{ category: c, free: search.free }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  search.category === c ? "bg-gradient-brand text-white shadow-glow" : "border border-border bg-card hover:bg-muted"
                }`}
              >
                {c}
              </Link>
            ))}
            <button
              onClick={() =>
                navigate({ search: { ...search, free: search.free ? undefined : true } })
              }
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                search.free ? "bg-foreground text-background" : "border border-border bg-card hover:bg-muted"
              }`}
            >
              Free only
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-sm text-muted-foreground">No events match your filters.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
