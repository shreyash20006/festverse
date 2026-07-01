import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { Award, Compass, Eye, Heart, ShieldAlert, Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: `About Us · ${BRAND.appName}` }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      {/* Hero section */}
      <section className="relative overflow-hidden py-24 px-6 text-center border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="container relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 uppercase tracking-wider">
            Our Story
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Redefining campus events.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {BRAND.appName} was born out of a simple idea: making it trivial for student chapters to organize, manage, and scale event operations without manual overhead.
          </p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="container mx-auto px-6 py-20 max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-4 p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-soft transition-all">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Compass className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Our Mission</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To empower student organizations and colleges with secure, modern digital infrastructure. We remove operational friction—from registrations and payments to attendance check-ins and certificate generation—enabling teams to focus entirely on crafting great fests.
            </p>
          </div>

          <div className="space-y-4 p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-soft transition-all">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <Eye className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Our Vision</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To become the unified standard platform trusted by universities worldwide for student activities. We envision a connected university ecosystem where student achievements, event credentials, and fests are transparent, verified, and instantly accessible.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-muted/10 border-t border-b border-border/50 py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center max-w-lg mx-auto mb-12">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Core Values</h2>
            <p className="mt-1 text-xs text-muted-foreground">The guidelines that define our software and team.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: "Student-First Design", desc: "Crafting interfaces that feel natural, delightful, and extremely fast on mobile devices." },
              { icon: Trophy, title: "Uncompromising Integrity", desc: "Automating certificates and check-ins to eliminate forgery and verify student participation." },
              { icon: Heart, title: "Continuous Innovation", desc: "Iterating on rolling QR ticketing, tenant security isolation, and direct payment integrations." }
            ].map((v, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <v.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 font-display text-sm font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="container mx-auto px-6 py-20 text-center max-w-2xl">
        <h2 className="font-display text-2xl font-bold text-foreground">Trusted by universities</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          From local technical institutes to national universities, {BRAND.appName} powers events with 99.9% uptime, verified PRN checks, and secure multi-tenant college environments.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
