import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard, type EventCardData } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, QrCode, Shield, Sparkles, Ticket, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — College events, tickets & certificates" },
      {
        name: "description",
        content:
          "Discover workshops, cultural fests, technical events and sports at your college. Register in seconds, get a secure QR ticket, and earn certificates after attendance.",
      },
      { property: "og:title", content: "CampusConnect — College events" },
      { property: "og:description", content: "All college events in one place. Register, attend, earn certificates." },
    ],
  }),
  component: HomePage,
});

const CATEGORIES = [
  { slug: "technical", label: "Technical", icon: "💻", gradient: "from-blue-500/15 to-indigo-500/10" },
  { slug: "workshop", label: "Workshops", icon: "🛠️", gradient: "from-cyan-500/15 to-teal-500/10" },
  { slug: "cultural", label: "Cultural", icon: "🎭", gradient: "from-pink-500/15 to-rose-500/10" },
  { slug: "sports", label: "Sports", icon: "🏆", gradient: "from-amber-500/15 to-orange-500/10" },
  { slug: "placement", label: "Placement", icon: "💼", gradient: "from-violet-500/15 to-purple-500/10" },
  { slug: "pharmacy", label: "Pharmacy", icon: "💊", gradient: "from-emerald-500/15 to-green-500/10" },
];

function HomePage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "home"],
    queryFn: async (): Promise<EventCardData[]> => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, title, short_description, category, banner_url, venue, start_at, is_paid, price_inr, capacity, featured"
        )
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data as EventCardData[];
    },
  });

  const featured = events.filter((e) => e.featured).slice(0, 3);
  const upcoming = events.filter((e) => new Date(e.start_at) > new Date()).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative mx-auto px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-primary" />
              The official events platform for your college
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
              Every event on campus.{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">One ticket.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Discover workshops, cultural fests, technical events and more.
              Register in 30 seconds, get a secure QR ticket, and earn certificates after attendance.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand px-7 text-white shadow-glow hover:opacity-90">
                <Link to="/events">
                  Browse events <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/auth">Get started — it's free</Link>
              </Button>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Ticket, label: "Free & paid events" },
              { icon: QrCode, label: "Secure QR tickets" },
              { icon: Shield, label: "PRN verified" },
              { icon: Trophy, label: "Auto certificates" },
            ].map((f) => (
              <div
                key={f.label}
                className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                <f.icon className="h-4 w-4 text-primary" />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Browse by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Find your scene.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/events"
              search={{ category: c.slug }}
              className={`group rounded-2xl border border-border bg-gradient-to-br ${c.gradient} p-4 transition-all hover:-translate-y-0.5 hover:shadow-card`}
            >
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-3 font-display text-sm font-semibold">{c.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">Explore →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-12 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Featured</h2>
              <p className="mt-1 text-sm text-muted-foreground">Hand-picked by the team.</p>
            </div>
            <Link
              to="/events"
              className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      <section className="container mx-auto px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Upcoming events
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Don't miss out.</p>
          </div>
          <Link
            to="/events"
            className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
          >
            View all →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyEventsState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-8 shadow-elevated sm:p-12">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Run an event? Publish it in minutes.
            </h2>
            <p className="mt-3 max-w-lg text-white/90">
              From registration to attendance to certificates — CampusConnect handles it.
              Organizers, request admin access from your council to get started.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link to="/auth">Sign in to continue</Link>
              </Button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function EmptyEventsState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 font-display text-lg font-semibold">No events yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Check back soon — new events are added every week.
      </p>
    </div>
  );
}
