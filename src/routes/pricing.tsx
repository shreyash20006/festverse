import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Pricing Plans · FestVerse" }] }),
  component: () => null,
});

const PLANS = [
  {
    name: "Starter",
    price: "₹0",
    billing: "Free trial",
    desc: "Perfect for testing or small department fests.",
    features: [
      "1 College Admin",
      "Up to 100 Registrations",
      "Free Ticket QR Codes",
      "Shared Payment Gateway",
      "Standard Email Support",
      "Basic Analytics"
    ],
    cta: "Start for free",
    link: "/auth",
    featured: false
  },
  {
    name: "Professional",
    price: "₹4,999",
    billing: "Billed monthly",
    desc: "For active student councils and college fests.",
    features: [
      "5 Organizers & Scanner access",
      "Unlimited Registrations",
      "Custom Razorpay / Cashfree",
      "Custom Subdomain",
      "Excel/CSV Reports Export",
      "Auto Certificate Emails",
      "Priority 24/7 Support",
      "Real-time Analytics Dashboard"
    ],
    cta: "Launch Portal",
    link: "/auth",
    featured: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    billing: "Tailored agreements",
    desc: "For multi-college universities and major fests.",
    features: [
      "Unlimited Admin & Organizer roles",
      "Custom Domains (events.college.edu)",
      "SAML SSO Integration",
      "Custom Certificate Templates",
      "99.9% Uptime SLA",
      "Dedicated Account Manager",
      "Advanced API Access",
      "On-site deployment options"
    ],
    cta: "Contact Sales",
    link: "/contact",
    featured: false
  }
];

const COMPARISONS = [
  { feature: "Maximum registrations", starter: "100 / event", professional: "Unlimited", enterprise: "Unlimited" },
  { feature: "Staff / Scanner roles", starter: "1 role", professional: "5 roles", enterprise: "Unlimited" },
  { feature: "Branded Subdomain", starter: "❌", professional: "✅", enterprise: "✅ (or Custom Domain)" },
  { feature: "Payment Gateway Integration", starter: "Platform Gateway", professional: "Razorpay / Cashfree", enterprise: "Multiple Custom Gateways" },
  { feature: "Rolling QR Ticket scanner", starter: "✅", professional: "✅", enterprise: "✅" },
  { feature: "Auto Certificate Generation", starter: "❌", professional: "✅", enterprise: "✅ (Custom Layouts)" },
  { feature: "Support Tier", starter: "Standard Email", professional: "Priority Support", enterprise: "Dedicated Manager & SLA" },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      {/* Hero section */}
      <section className="relative overflow-hidden py-20 px-6 text-center border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="container relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 uppercase tracking-wider">
            Pricing Plans
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Plans built to scale your fests.
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-lg mx-auto">
            From single fests to comprehensive university portals, pick a plan that fits your campus scale.
          </p>
        </div>
      </section>

      {/* Plans Columns */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {PLANS.map((plan, idx) => (
            <div 
              key={idx} 
              className={`rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.featured 
                  ? "border-primary bg-primary/[0.02] shadow-elevated scale-102 relative" 
                  : "border-border bg-card shadow-sm hover:shadow-soft"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-xs text-muted-foreground ml-1">/{plan.billing.includes("monthly") ? "mo" : "trial"}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{plan.desc}</p>
                <div className="mt-6 border-t border-border/60 pt-6">
                  <ul className="space-y-3 text-xs">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button asChild className={`w-full rounded-xl mt-8 h-10 font-bold ${plan.featured ? "bg-gradient-brand text-white shadow-glow" : "border border-border bg-card text-foreground hover:bg-muted"}`}>
                <Link to={plan.link}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="container mx-auto px-6 py-12 max-w-4xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-center mb-8">Compare plans side-by-side</h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Features</th>
                <th className="px-6 py-4">Starter</th>
                <th className="px-6 py-4">Professional</th>
                <th className="px-6 py-4">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((row, idx) => (
                <tr key={idx} className="border-b border-border last:border-none hover:bg-muted/30">
                  <td className="px-6 py-4 font-semibold text-foreground">{row.feature}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{row.starter}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{row.professional}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
