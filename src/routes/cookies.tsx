import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { Cookie, Settings, BarChart2, ShieldCheck, Mail, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Cookie Policy — ${BRAND.appName}` },
      { name: "description", content: `Understand how ${BRAND.appName} uses cookies and similar technologies.` },
    ],
  }),
  component: CookiePolicyPage,
});

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="pl-12 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

interface CookieRow { name: string; purpose: string; duration: string; type: string; }

function CookieTable({ cookies }: { cookies: CookieRow[] }) {
  return (
    <div className="overflow-x-auto mt-3 rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-2.5 text-left font-semibold text-foreground">Cookie Name</th>
            <th className="px-4 py-2.5 text-left font-semibold text-foreground">Purpose</th>
            <th className="px-4 py-2.5 text-left font-semibold text-foreground">Duration</th>
            <th className="px-4 py-2.5 text-left font-semibold text-foreground">Type</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c, i) => (
            <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5 font-mono text-foreground/80">{c.name}</td>
              <td className="px-4 py-2.5">{c.purpose}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{c.duration}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold
                  ${c.type === "Essential" ? "bg-green-500/10 text-green-600" :
                    c.type === "Functional" ? "bg-blue-500/10 text-blue-600" :
                    "bg-amber-500/10 text-amber-600"}`}>
                  {c.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CookiePolicyPage() {
  const effectiveDate = "July 1, 2025";

  const essentialCookies: CookieRow[] = [
    { name: "sb-*-auth-token", purpose: "Supabase session token for authentication", duration: "1 week", type: "Essential" },
    { name: "sb-*-auth-token-code-verifier", purpose: "PKCE OAuth code verifier for secure Google login", duration: "Session", type: "Essential" },
    { name: "__Host-next-auth.csrf-token", purpose: "CSRF protection for form submissions", duration: "Session", type: "Essential" },
  ];

  const functionalCookies: CookieRow[] = [
    { name: "theme", purpose: "Stores your light/dark theme preference", duration: "1 year", type: "Functional" },
    { name: "locale", purpose: "Stores your language or region preference", duration: "1 year", type: "Functional" },
    { name: "sidebar-collapsed", purpose: "Remembers whether the admin sidebar is collapsed", duration: "30 days", type: "Functional" },
  ];

  const analyticsCookies: CookieRow[] = [
    { name: "_fv_session", purpose: "Anonymized page visit session tracking for platform improvement", duration: "30 minutes", type: "Analytics" },
    { name: "_fv_uid", purpose: "Anonymized unique user identifier for aggregate analytics", duration: "2 years", type: "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border/60 py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Cookie className="h-3.5 w-3.5" /> Legal Document
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Cookie Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
            This policy explains how {BRAND.appName} uses cookies and similar tracking technologies to operate and improve the platform.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Effective Date: <strong className="text-foreground">{effectiveDate}</strong></p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-14">

        <Section icon={Cookie} title="1. What Are Cookies?">
          <p>Cookies are small text files placed on your device when you visit a website. They allow websites to remember your preferences, keep you logged in, and understand how you use the site.</p>
          <p className="mt-2">We also use similar technologies like <strong className="text-foreground">localStorage</strong> and <strong className="text-foreground">sessionStorage</strong> in your browser to store session data securely on the client side.</p>
        </Section>

        <Section icon={ShieldCheck} title="2. Essential Cookies">
          <p>These cookies are strictly necessary for the Platform to function. They enable login sessions, CSRF protection, and secure authentication. You cannot opt out of these without losing access to the Platform.</p>
          <CookieTable cookies={essentialCookies} />
        </Section>

        <Section icon={Settings} title="3. Functional Cookies">
          <p>Functional cookies remember your preferences to give you a better experience. They do not track you across other websites.</p>
          <CookieTable cookies={functionalCookies} />
        </Section>

        <Section icon={BarChart2} title="4. Analytics Cookies">
          <p>Analytics cookies help us understand how users interact with {BRAND.appName} so we can improve features and performance. All analytics data is anonymized and aggregated — it cannot be used to identify you personally.</p>
          <CookieTable cookies={analyticsCookies} />
          <p className="mt-3">We do <strong className="text-foreground">not</strong> use cookies from Google Analytics, Facebook Pixel, or any advertising network.</p>
        </Section>

        <Section icon={Settings} title="5. How to Control Cookies">
          <p>You can manage or disable cookies through your browser settings:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong className="text-foreground">Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
            <li><strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
            <li><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong className="text-foreground">Edge:</strong> Settings → Site permissions → Cookies and site data</li>
          </ul>
          <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-700 dark:text-amber-400">
            ⚠️ Disabling essential cookies will prevent you from logging in and using core features of the Platform.
          </p>
        </Section>

        <Section icon={RefreshCw} title="6. Changes to This Cookie Policy">
          <p>We may update this Cookie Policy periodically to reflect changes in our cookie usage or applicable law. The Effective Date at the top of this page will always reflect the date of the latest revision.</p>
          <p className="mt-2">Continued use of {BRAND.appName} after changes to this policy constitutes your acceptance.</p>
        </Section>

        <Section icon={Mail} title="7. Contact Us">
          <p>If you have any questions about our use of cookies, contact us at:</p>
          <div className="mt-3 rounded-2xl border border-border bg-card/60 p-5 space-y-2">
            <p><strong className="text-foreground">{BRAND.appName} Privacy Team</strong></p>
            <p>Email: <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a></p>
            <p>Website: <a href={`https://${BRAND.defaultDomain}`} className="text-primary hover:underline">{BRAND.defaultDomain}</a></p>
          </div>
        </Section>

        <div className="mt-12 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border/60 pt-8">
          <Link to="/privacy" className="hover:text-primary hover:underline transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary hover:underline transition-colors">Terms of Service</Link>
          <Link to="/contact" className="hover:text-primary hover:underline transition-colors">Contact Support</Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
