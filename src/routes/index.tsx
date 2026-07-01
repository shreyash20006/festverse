import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard, type EventCardData } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, Calendar, QrCode, Shield, Sparkles, Ticket, Trophy, 
  Building2, Plus, ArrowUpRight, GraduationCap, Coins, Activity, Check 
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — College Event Management SaaS" },
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
  const { college, collegeId, isRoot, branding } = useTenant();
  const { user } = useAuth();

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
    return <SaaSLandingPage user={user} />;
  }

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
              The official events platform for {college?.name ?? "your college"}
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
              Every event on campus.{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">One ticket.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Discover workshops, cultural fests, technical events and more at {college?.name ?? "your college"}.
              Register in 30 seconds, get a secure QR ticket, and earn certificates after attendance.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-gradient-brand px-7 text-white shadow-glow hover:opacity-90 cursor-pointer">
                <Link to="/events">
                  Browse events <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full cursor-pointer">
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
              <Button asChild size="lg" variant="secondary" className="rounded-full cursor-pointer">
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

function SaaSLandingPage({ user }: { user: any }) {
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
        // Redirect to new college path preview
        window.location.href = `/c/${res.slug}`;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create college tenant");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* SaaS Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative mx-auto px-4 pb-20 pt-16 sm:px-6 lg:pb-32 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <Building2 className="h-3.5 w-3.5" /> Multi-Tenant SaaS Platform
            </div>
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-tight">
              Scale College Events. <br />
              <span className="bg-gradient-brand bg-clip-text text-transparent">Every College, Isolated.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
              CampusConnect is a production-ready multi-tenant SaaS that enables universities to launch branded portals, organize group registrations, route direct payments, scan attendance via rolling QR tickets, and auto-generate certificates.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90 cursor-pointer font-bold px-8">
                    <Plus className="mr-2 h-4 w-4" /> Create College Portal
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-md shadow-elevated">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Launch College Tenant</DialogTitle>
                    <DialogDescription className="text-xs">
                      Fill details below to instantiate a branded event portal for your college.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor="c-name" className="text-xs font-semibold">College Name</Label>
                      <Input
                        id="c-name"
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                        placeholder="e.g. Harvard University"
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
                          placeholder="e.g. harvard"
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
              <Button asChild size="lg" variant="outline" className="rounded-full cursor-pointer font-semibold px-8">
                <a href="#active-portals">Explore Portals</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* active portals */}
      <section id="active-portals" className="container mx-auto px-4 py-16 sm:px-6">
        <div className="mb-10 text-center max-w-lg mx-auto">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Active College Portals</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a university portal below to view their active campus calendar and events.</p>
        </div>
        
        {colleges.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground max-w-md mx-auto bg-card">
            No active college portals registered on the platform yet. Click "Create College Portal" to register one.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {colleges.map((c: any) => (
              <div 
                key={c.id} 
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted/60 p-2 overflow-hidden border border-border/40">
                      <img src={c.logo_url ?? "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold tracking-tight group-hover:text-primary transition-colors">{c.name}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{c.slug}.campusconnect.app</p>
                    </div>
                  </div>
                  <a 
                    href={`/c/${c.slug}`} 
                    className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                    title="Open portal"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature Grid */}
      <section className="bg-muted/10 border-t border-b border-border/50 py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center max-w-xl mx-auto">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Built for Scale and Security</h2>
            <p className="mt-1 text-xs text-muted-foreground">Every tenant receives independent isolation and control.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              { icon: Shield, title: "Tenancy Isolation", desc: "Data is completely isolated between colleges using multi-tenant security layers." },
              { icon: Coins, title: "Independent Gateways", desc: "Configure your own Razorpay or Cashfree keys. All student event payments go directly to the college bank account." },
              { icon: QrCode, title: "Rolling QR Security", desc: "Prevent duplicate scans, ticket fraud, and screenshots with 30s rolling QR tickets." },
              { icon: GraduationCap, title: "PRN Verification", desc: "Integrates with student database registers to verify university identity before registrations." },
              { icon: Trophy, title: "Auto Certifications", desc: "Verify check-in attendance and automatically email verified participation certificates." },
              { icon: Activity, title: "Live Analytics", desc: "Monitor campus revenue, registration conversions, and checked-in rosters in real-time." }
            ].map((feat, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-sm font-bold tracking-tight text-foreground">{feat.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing plans */}
      <section className="container mx-auto px-4 py-20 sm:px-6">
        <div className="mb-12 text-center max-w-lg mx-auto">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Simple SaaS Pricing</h2>
          <p className="mt-1 text-xs text-muted-foreground">Plans tailored for student chapters up to large university campuses.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            { 
              name: "Free Trial", 
              price: "₹0", 
              desc: "For small campus fests", 
              feats: ["1 College Admin", "Up to 100 Registrations", "Free Ticket QR Codes", "Shared Platform Gateway"] 
            },
            { 
              name: "SaaS Pro", 
              price: "₹4,999", 
              desc: "For active student councils", 
              feats: ["5 Organizers & Scanner access", "Unlimited Registrations", "Custom Razorpay/Cashfree keys", "Custom Subdomain", "Analytics Reports"],
              featured: true 
            },
            { 
              name: "Enterprise", 
              price: "Custom", 
              desc: "For multi-college universities", 
              feats: ["Unlimited Staff roles", "Custom Domains (e.g. events.college.edu)", "Dedicated support & SLAs", "SAML SSO Integration"] 
            }
          ].map((plan, idx) => (
            <div 
              key={idx} 
              className={`rounded-2xl border p-6 flex flex-col justify-between ${
                plan.featured 
                  ? "border-primary bg-primary/5 shadow-elevated relative scale-102" 
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Popular
                </span>
              )}
              <div>
                <h3 className="font-display text-base font-bold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-xs text-muted-foreground ml-1">/month</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{plan.desc}</p>
                <ul className="mt-6 space-y-2 text-xs">
                  {plan.feats.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button className={`w-full rounded-full mt-6 h-9 font-semibold text-xs ${plan.featured ? "bg-gradient-brand text-white shadow-glow" : "variant-outline border border-border"}`}>
                Get Started
              </Button>
            </div>
          ))}
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
