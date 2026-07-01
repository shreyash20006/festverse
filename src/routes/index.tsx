import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard, type EventCardData } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Calendar, QrCode, Shield, Sparkles, Ticket, Trophy, 
  Building2, Plus, ArrowUpRight, GraduationCap, Coins, Activity, Check,
  Users, CheckCircle2, XCircle, Star, LifeBuoy, ArrowRightLeft, ShieldCheck,
  Megaphone, Phone, Mail, HelpCircle, MapPin, HandHelping
} from "lucide-react";
import { useTenant } from "@/components/tenant-provider";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCollegeTenant } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — College Event Operations SaaS" },
      {
        name: "description",
        content:
          "The modern multi-tenant SaaS for colleges and universities to run events, ticketing, rolling QR check-ins, and automatic certificates.",
      },
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
  const { college, collegeId, isRoot } = useTenant();
  const { user } = useAuth();

  // Fetch events for either the specific college portal, or top published featured events for the landing page
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "home", collegeId],
    queryFn: async (): Promise<EventCardData[]> => {
      let q = supabase
        .from("events")
        .select(
          "id, slug, title, short_description, category, banner_url, venue, start_at, is_paid, price_inr, capacity, featured"
        )
        .eq("status", "published");

      if (collegeId) {
        q = q.eq("college_id", collegeId);
      }

      const { data, error } = await q
        .order("start_at", { ascending: true })
        .limit(12);

      if (error) throw error;
      return data as EventCardData[];
    },
  });

  if (isRoot) {
    return <SaaSLandingPage user={user} events={events} />;
  }

  const featured = events.filter((e) => e.featured).slice(0, 3);
  const upcoming = events.filter((e) => new Date(e.start_at) > new Date()).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative mx-auto px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              The official events platform for {college?.name ?? "your college"}
            </div>
            <h1 className="mt-6 font-display text-4xl font-black tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
              Every event on campus.{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">One ticket.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              Discover workshops, cultural fests, technical events and more at {college?.name ?? "your college"}.
              Register in 30 seconds, get a secure QR ticket, and earn certificates after attendance.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand px-7 text-white shadow-glow hover:opacity-90 cursor-pointer font-bold">
                <Link to="/events">
                  Browse events <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full cursor-pointer font-semibold">
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
            ].map((f, idx) => (
              <div
                key={idx}
                className="glass flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-xs font-semibold shadow-soft"
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
            <p className="mt-1 text-xs text-muted-foreground">Find your interest.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/events"
              search={{ category: c.slug }}
              className={`group rounded-2xl border border-border bg-gradient-to-br ${c.gradient} p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft`}
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
              <p className="mt-1 text-xs text-muted-foreground">Hand-picked by the team.</p>
            </div>
            <Link
              to="/events"
              className="hidden text-xs font-semibold text-primary hover:underline sm:inline"
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
            <p className="mt-1 text-xs text-muted-foreground">Don't miss out.</p>
          </div>
          <Link
            to="/events"
            className="hidden text-xs font-semibold text-primary hover:underline sm:inline"
          >
            View all →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
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
            <p className="mt-3 max-w-lg text-xs sm:text-sm text-white/90 leading-relaxed">
              From registration to attendance to certificates — CampusConnect handles it.
              Organizers, request admin access from your council to get started.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" variant="secondary" className="rounded-full cursor-pointer font-bold">
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

function SaaSLandingPage({ user, events }: { user: any; events: any[] }) {
  const submitCollege = useServerFn(createCollegeTenant);
  const [colName, setColName] = useState("");
  const [colSlug, setColSlug] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: colleges = [] } = useQuery({
    queryKey: ["public", "colleges-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, name, slug, logo_url")
        .eq("is_active", true)
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first to register a college.");
      window.location.href = "/auth";
      return;
    }
    setBusy(true);
    try {
      const res = await submitCollege({ data: { name: colName, slug: colSlug.toLowerCase().trim() } });
      if (res?.ok) {
        toast.success(`Success! registered college ${colName}`);
        setDialogOpen(false);
        window.location.href = `/c/${res.slug}`;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create college tenant");
    } finally {
      setBusy(false);
    }
  };

  // Seed default colleges list if empty for premium mock preview
  const collegesList = colleges.length === 0 ? [
    { id: "c1", name: "TGPCOP Nagpur", slug: "tgpcop", logo_url: null },
    { id: "c2", name: "VNIT Nagpur", slug: "vnit", logo_url: null },
    { id: "c3", name: "COEP Pune", slug: "coep", logo_url: null },
    { id: "c4", name: "PICT Pune", slug: "pict", logo_url: null },
    { id: "c5", name: "VJTI Mumbai", slug: "vjti", logo_url: null }
  ] : colleges;

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 border-b border-border/40">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-hero opacity-40" />
        <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="container relative mx-auto px-6 grid gap-12 lg:grid-cols-12 items-center max-w-6xl">
          <div className="lg:col-span-7 text-left space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 px-3.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 backdrop-blur shadow-soft animate-fade-in">
              <Building2 className="h-4 w-4" /> Multi-Tenant Operations Platform
            </span>
            
            <h1 className="font-display text-5xl font-black tracking-tight text-foreground sm:text-7xl leading-none">
              Discover. <br />Register. Attend.
            </h1>
            <p className="font-display text-xl font-bold text-muted-foreground/90">
              One platform for every college event.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xl">
              CampusConnect helps colleges manage registrations, secure rolling QR ticketing, gateway payments, live attendance tracking, and verified participation certificates from one centralized, isolated portal.
            </p>
            
            <div className="flex flex-wrap gap-3.5 pt-2">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90 cursor-pointer font-bold px-8 h-12">
                <Link to="/events">Explore Events</Link>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="rounded-full cursor-pointer font-bold px-8 h-12 border-border shadow-soft bg-card/60 backdrop-blur-sm">
                    Register Your College
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-md shadow-elevated">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Launch College Tenant</DialogTitle>
                    <DialogDescription className="text-xs">
                      Instantiate a secure, isolated campus event portal.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor="c-name" className="text-xs font-semibold">College Name</Label>
                      <Input
                        id="c-name"
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                        placeholder="e.g. TGPCOP College of Pharmacy"
                        required
                        className="rounded-xl h-10 border-border/85"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="c-slug" className="text-xs font-semibold">URL Subdomain Slug</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="c-slug"
                          value={colSlug}
                          onChange={(e) => setColSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                          placeholder="e.g. tgpcop"
                          required
                          className="rounded-xl h-10 border-border/85 text-right font-mono"
                        />
                        <span className="text-xs text-muted-foreground font-mono">.campusconnect.app</span>
                      </div>
                    </div>
                    <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-brand text-white mt-4 h-10 font-bold active:scale-98">
                      {busy ? "Provisioning..." : "Launch Tenant Portal"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Premium Animated Illustrations column */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative mx-auto w-full max-w-[340px] aspect-[4/5] rounded-[40px] border-[10px] border-slate-900 bg-card shadow-2xl overflow-hidden flex flex-col justify-between p-6">
              {/* Screen Top */}
              <div className="w-full flex items-center justify-between border-b border-border/40 pb-4">
                <div className="h-6 w-16 bg-gradient-brand rounded-lg flex items-center justify-center font-display text-[8px] font-black text-white">
                  CAMPUS
                </div>
                <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              </div>

              {/* Dynamic QR Animation */}
              <div className="my-auto space-y-4 text-center">
                <div className="relative mx-auto w-36 h-36 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 rounded-3xl p-4 flex items-center justify-center border border-border/60 shadow-soft group-hover:scale-105 transition-transform duration-500">
                  {/* Rolling Check-in simulation line */}
                  <div className="absolute inset-x-2 h-0.5 bg-primary/80 top-2 animate-scan shadow-glow" />
                  <QrCode className="h-24 w-24 text-slate-800 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rolling Ticket Code</span>
                  <span className="block font-mono text-[11px] font-bold text-foreground">REFRESHING IN 24s</span>
                </div>
              </div>

              {/* Certificate Preview Card */}
              <div className="w-full border-t border-border/45 pt-4 flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 p-3 rounded-2xl border border-blue-500/10">
                <Trophy className="h-5 w-5 text-primary animate-bounce" />
                <div className="text-left leading-tight">
                  <span className="text-[8px] text-muted-foreground block font-semibold">AUTO-ISSUED CERTIFICATE</span>
                  <span className="text-[10px] font-bold text-foreground block">Hackathon Champion</span>
                </div>
              </div>
            </div>
            {/* Background elements */}
            <div className="absolute -z-10 -bottom-6 -left-6 w-32 h-32 rounded-full bg-primary/20 blur-2xl" />
            <div className="absolute -z-10 -top-6 -right-6 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Live Statistics Section */}
      <section className="border-b border-border/40 py-12 bg-card/40 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            {[
              { val: "500+", label: "Events Organized" },
              { val: "25+", label: "Partner Colleges" },
              { val: "15,000+", label: "Students Registered" },
              { val: "98%", label: "Check-in Accuracy" }
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <span className="block font-display text-3xl sm:text-4xl font-black bg-gradient-brand bg-clip-text text-transparent">{stat.val}</span>
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="container mx-auto px-6 py-20 max-w-6xl">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
              Happening now
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl mt-2">Featured Campus Events</h2>
            <p className="mt-1 text-xs text-muted-foreground">Catch the most trending events in active college portals.</p>
          </div>
          <Link to="/events" className="text-xs font-bold text-primary hover:underline">
            All Events →
          </Link>
        </div>

        {events.length === 0 ? (
          <EmptyEventsState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 3).map((e: any) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* Browse Colleges Catalog */}
      <section id="colleges" className="bg-muted/10 border-t border-b border-border/50 py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12 text-center max-w-lg mx-auto">
            <span className="inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
              Branded Portals
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl mt-2">Active College Directories</h2>
            <p className="mt-1 text-xs text-muted-foreground font-semibold">Select a university portal to discover calendars and whitelist PRNs.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collegesList.map((c: any) => (
              <div 
                key={c.id} 
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted p-2 overflow-hidden border border-border/40 shrink-0">
                      <img src={c.logo_url ?? "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"} alt="" className="h-full w-full object-contain" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> Maharashtra
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-base font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    Access official campus fest, technical workshops, and roll-checkins.
                  </p>
                </div>

                <div className="mt-6 border-t border-border/40 pt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5" /> 800+ Students
                  </div>
                  <a 
                    href={`/c/${c.slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-xl bg-primary/15 hover:bg-primary/20 text-primary px-3.5 text-[10px] font-bold uppercase transition-all duration-200 active:scale-95"
                  >
                    Portal <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works (Stepper) */}
      <section className="container mx-auto px-6 py-20 max-w-5xl border-b border-border/45">
        <div className="mb-12 text-center max-w-lg mx-auto">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
            User Journeys
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl mt-2">How It Works</h2>
          <p className="mt-1 text-xs text-muted-foreground">Seamless orchestration for both students and organizers.</p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Student Path */}
          <div className="space-y-6">
            <h3 className="font-display text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Users className="h-5 w-5" /> Student Flow
            </h3>
            <div className="relative pl-6 border-l border-blue-500/20 space-y-6 text-xs">
              {[
                { step: "1", title: "Login with Google", desc: "Access the platform securely using university credentials." },
                { step: "2", title: "Verify PRN Whitelist", desc: "Match your PRN record to register for exclusive events." },
                { step: "3", title: "Register & Pay", desc: "Secure your ticket using direct UPI or card gateways." },
                { step: "4", title: "Rolling QR Ticket", desc: "Check in at the venue with screen-protected tokens." },
                { step: "5", title: "Scan & Attend", desc: "Get checked-in instantly by student volunteers." },
                { step: "6", title: "Download Certificate", desc: "Receive email credentials with verified hashes." }
              ].map((s, idx) => (
                <div key={idx} className="relative space-y-1">
                  <div className="absolute -left-[35px] top-0 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white font-bold text-[10px] shadow-soft">
                    {s.step}
                  </div>
                  <h4 className="font-bold text-foreground text-sm">{s.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Organizer Path */}
          <div className="space-y-6">
            <h3 className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Organizer Flow
            </h3>
            <div className="relative pl-6 border-l border-emerald-500/20 space-y-6 text-xs">
              {[
                { step: "1", title: "Create Branded Event", desc: "Upload banners, configure pricing, capacity, and PRN constraints." },
                { step: "2", title: "Share Unique Link", desc: "Share portal links with students in college fests." },
                { step: "3", title: "Monitor Registrations", desc: "Track payments, spreadsheet rosters, and live counts." },
                { step: "4", title: "Mobile QR Scanning", desc: "Staff volunteers scan rolling ticket codes at the gate." },
                { step: "5", title: "Auto-Generate Certificates", desc: "Send verified PDF credentials to attendees with one click." }
              ].map((s, idx) => (
                <div key={idx} className="relative space-y-1">
                  <div className="absolute -left-[35px] top-0 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white font-bold text-[10px] shadow-soft">
                    {s.step}
                  </div>
                  <h4 className="font-bold text-foreground text-sm">{s.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="container mx-auto px-6 py-20 max-w-5xl border-b border-border/45">
        <div className="mb-12 text-center max-w-lg mx-auto">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Comprehensive Event Tech Stack</h2>
          <p className="mt-1 text-xs text-muted-foreground">Every administrative tool and checklist pre-built and integrated.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: QrCode, title: "QR Ticketing", desc: "Screenshot-proof rolling check-in tickets." },
            { icon: Activity, title: "Real-time Attendance", desc: "Live check-in logging and volunteer sync." },
            { icon: Trophy, title: "Certificates Auto-generator", desc: "Email verified participation credentials." },
            { icon: Coins, title: "Independent Gateways", desc: "UPI payments directly to college accounts." },
            { icon: Megaphone, title: "Announcements Board", desc: "Post fests notices targeting custom audiences." },
            { icon: HandHelping, title: "Volunteer Management", desc: "Delegate scanner roles to volunteers." }
          ].map((feat, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-soft transition-all duration-300">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-sm font-bold text-foreground">{feat.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Grid Section */}
      <section className="container mx-auto px-6 py-20 max-w-4xl border-b border-border/45">
        <h2 className="font-display text-2xl font-bold tracking-tight text-center mb-10">Traditional vs CampusConnect</h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-6 py-4">Workflow Layer</th>
                <th className="px-6 py-4">Traditional Tooling</th>
                <th className="px-6 py-4 text-primary font-bold">CampusConnect</th>
              </tr>
            </thead>
            <tbody>
              {[
                { layer: "Registration Check", trad: "Google Forms / Excel ❌", cc: "PRN whitelists validation ✅" },
                { layer: "Payments Routing", trad: "Manual screenshot verification ❌", cc: "Direct custom API payouts ✅" },
                { layer: "Attendance Tracking", trad: "Paper register sign-ins ❌", cc: "Rolling QR scanners ✅" },
                { layer: "Credential Issuance", trad: "Mail merge PDFs manually ❌", cc: "Instant secure digital certificates ✅" }
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-border last:border-none hover:bg-muted/30">
                  <td className="px-6 py-4 font-semibold text-foreground">{row.layer}</td>
                  <td className="px-6 py-4 text-xs text-destructive/80 font-medium">{row.trad}</td>
                  <td className="px-6 py-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold">{row.cc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/10 py-20 px-6 border-b border-border/45">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12 text-center max-w-lg mx-auto">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">What Campus Leaders Say</h2>
            <p className="mt-1 text-xs text-muted-foreground font-semibold">Adopted by universities, loved by student organizations.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                text: "PRN verification completely solved our ticket duplication issues. All 400 registrations went directly to our council bank account without manual checks.",
                author: "Dr. K. R. Patil",
                role: "Principal, College of Pharmacy"
              },
              {
                text: "Scanning tickets at the door was extremely fast. Our student volunteers checked in over 300 students in 15 minutes using the built-in mobile QR scanner.",
                author: "Dr. Utkarsh L.",
                role: "Faculty In-Charge, Cultural Council"
              },
              {
                text: "The certificates got emailed to me automatically right after the event. The dashboard is clean, and carrying the ticket on my phone was super easy.",
                author: "Sneha Reddy",
                role: "General Secretary, Student Chapter"
              }
            ].map((test, idx) => (
              <div key={idx} className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-soft transition-all">
                <div className="flex gap-1 mb-4 text-amber-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-500" />)}
                </div>
                <p className="text-xs italic leading-relaxed text-muted-foreground mb-6">
                  "{test.text}"
                </p>
                <div className="leading-tight">
                  <span className="font-bold text-foreground text-xs block">{test.author}</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">{test.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="container mx-auto px-6 py-20 text-center max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Flexible SaaS Pricing</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          From departmental trial fests to full-campus enterprise deployments, we have a plan for you. All payments go directly to your accounts with 0% platform cuts.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild className="rounded-full bg-gradient-brand text-white font-bold px-8 shadow-glow">
            <Link to="/pricing">View Pricing Plans</Link>
          </Button>
        </div>
      </section>

      {/* FAQs Teaser Accordion */}
      <section className="container mx-auto px-6 py-12 max-w-3xl border-t border-border/45">
        <h2 className="font-display text-2xl font-bold text-center mb-8">FAQ Quick Center</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {[
            { q: "How does PRN check work?", a: "CampusConnect matches students registering against the whitelisted database Excel sheet uploaded by the college administrator, blocking outside invalid registrants." },
            { q: "Are ticket codes secure?", a: "Yes, our tickets use rolling QR tokens that refresh every 30 seconds client-side. Screenshots won't pass check-in." }
          ].map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border/80 bg-card rounded-2xl px-6 py-1 shadow-sm">
              <AccordionTrigger className="font-display font-bold text-foreground text-sm hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs pl-2 pt-2 border-t border-border/20 mt-2">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <SiteFooter />
    </div>
  );
}

function EmptyEventsState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center max-w-md mx-auto">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h3 className="mt-4 font-display text-sm font-semibold">No active events</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Check back soon — new events are added regularly by the college admin.
      </p>
    </div>
  );
}
