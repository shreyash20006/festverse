import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { Shield, Eye, Database, Lock, Mail, AlertCircle, FileText, Globe, Users, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${BRAND.appName}` },
      { name: "description", content: `Read the ${BRAND.appName} Privacy Policy to understand how we collect, use, and protect your personal data.` },
    ],
  }),
  component: PrivacyPolicyPage,
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

function PrivacyPolicyPage() {
  const effectiveDate = "July 1, 2025";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border/60 py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Shield className="h-3.5 w-3.5" /> Legal Document
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
            This policy explains how {BRAND.appName} collects, uses, and protects your personal information when you use our platform.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Effective Date: <strong className="text-foreground">{effectiveDate}</strong></p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-14">

        <Section icon={Eye} title="1. Information We Collect">
          <p>We collect information you provide directly when you register, verify your PRN, register for events, or contact support. This includes:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Identity Data:</strong> Full name, PRN (Permanent Registration Number), college name, department, academic year.</li>
            <li><strong className="text-foreground">Contact Data:</strong> Email address, phone number.</li>
            <li><strong className="text-foreground">Profile Data:</strong> Avatar photo, social connections (if signed in via Google).</li>
            <li><strong className="text-foreground">Transactional Data:</strong> Event registrations, payment records, ticket IDs, QR codes.</li>
            <li><strong className="text-foreground">Technical Data:</strong> IP address, browser type, device identifiers, usage logs, and cookies.</li>
          </ul>
          <p className="mt-3">We also collect data automatically through cookies and analytics tools when you browse our platform.</p>
        </Section>

        <Section icon={Database} title="2. How We Use Your Information">
          <p>We use your information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>To verify your student identity via PRN and link your account to the correct college.</li>
            <li>To manage event registrations, generate QR tickets, and track attendance.</li>
            <li>To process payments, issue invoices, and handle refunds securely through Razorpay.</li>
            <li>To generate participation certificates at the end of events.</li>
            <li>To send transactional notifications (email confirmation, event reminders).</li>
            <li>To improve the platform through aggregated, anonymized analytics.</li>
            <li>To comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
          <p className="mt-3">We do <strong className="text-foreground">not</strong> use your data for advertising or sell it to third parties.</p>
        </Section>

        <Section icon={Users} title="3. Who We Share Your Data With">
          <p>Your data is shared only in the following limited circumstances:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-foreground">College Administrators:</strong> Your college admin can view registrations, attendance, and profile data for students of their institution only.</li>
            <li><strong className="text-foreground">Payment Processors:</strong> Razorpay processes your payment data under their own privacy policy. We do not store raw card numbers.</li>
            <li><strong className="text-foreground">Service Providers:</strong> Supabase (database & authentication), Google (OAuth login), Cloudinary (image storage) handle data under strict data processing agreements.</li>
            <li><strong className="text-foreground">Legal Compliance:</strong> We may disclose data if required by law, court order, or government authority.</li>
          </ul>
          <p className="mt-3">All third-party services are contractually bound to keep your data secure and confidential.</p>
        </Section>

        <Section icon={Lock} title="4. Data Security">
          <p>We implement industry-standard security measures to protect your personal information:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>All data is encrypted in transit using TLS 1.3 and at rest using AES-256.</li>
            <li>Authentication is powered by Supabase Auth with support for Multi-Factor Authentication (MFA).</li>
            <li>Row Level Security (RLS) ensures users can only access data they are authorized to view.</li>
            <li>Sensitive credentials (Razorpay keys) are stored in encrypted environment variables, never in the database.</li>
            <li>Access logs are maintained and audited regularly.</li>
          </ul>
          <p className="mt-3">Despite these measures, no system is 100% secure. We encourage you to use strong passwords and enable MFA on your account.</p>
        </Section>

        <Section icon={Globe} title="5. Cookies & Tracking">
          <p>We use the following types of cookies:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Essential Cookies:</strong> Required for authentication, session management, and security. Cannot be disabled.</li>
            <li><strong className="text-foreground">Functional Cookies:</strong> Remember your preferences (theme, language).</li>
            <li><strong className="text-foreground">Analytics Cookies:</strong> Aggregated usage data to improve platform features (anonymized).</li>
          </ul>
          <p className="mt-3">You can manage cookies through your browser settings. Disabling essential cookies may prevent login functionality from working correctly.</p>
          <p className="mt-2">Read our full <Link to="/cookies" className="text-primary hover:underline font-medium">Cookie Policy</Link> for more details.</p>
        </Section>

        <Section icon={RefreshCw} title="6. Data Retention">
          <p>We retain your data for as long as your account is active or as needed to fulfill the purposes described above:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Account Data:</strong> Retained for the duration of your account and up to 2 years after deletion for legal compliance.</li>
            <li><strong className="text-foreground">Event & Payment Records:</strong> Retained for 7 years to satisfy financial and legal obligations.</li>
            <li><strong className="text-foreground">Audit Logs:</strong> Retained for 12 months and then purged automatically.</li>
          </ul>
          <p className="mt-3">You may request deletion of your account and associated data by contacting us at <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a>. Some data may be retained for legal reasons even after a deletion request.</p>
        </Section>

        <Section icon={FileText} title="7. Your Rights">
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-foreground">Right to Access:</strong> Request a copy of all personal data we hold about you.</li>
            <li><strong className="text-foreground">Right to Rectification:</strong> Correct inaccurate or incomplete information in your profile.</li>
            <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your account and personal data ("Right to be Forgotten").</li>
            <li><strong className="text-foreground">Right to Portability:</strong> Export your data in a machine-readable format (JSON/CSV).</li>
            <li><strong className="text-foreground">Right to Object:</strong> Object to processing of your data for non-essential purposes.</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, email <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a> with your request. We will respond within 30 days.</p>
        </Section>

        <Section icon={AlertCircle} title="8. Children's Privacy">
          <p>{BRAND.appName} is intended for use by college students aged 17 and above. We do not knowingly collect data from children under the age of 13. If you believe a child has provided personal information to us, please contact us immediately so we can delete it.</p>
        </Section>

        <Section icon={Mail} title="9. Changes to This Policy">
          <p>We may update this Privacy Policy periodically. When we do, we will update the "Effective Date" at the top of this page and notify you via email or a prominent platform notice if the changes are material.</p>
          <p className="mt-2">Continued use of {BRAND.appName} after changes become effective constitutes your acceptance of the updated policy.</p>
        </Section>

        <Section icon={Mail} title="10. Contact Us">
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our Data Protection team:</p>
          <div className="mt-3 rounded-2xl border border-border bg-card/60 p-5 space-y-2">
            <p><strong className="text-foreground">{BRAND.appName} Data Privacy</strong></p>
            <p>Email: <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a></p>
            <p>Website: <a href={`https://${BRAND.defaultDomain}`} className="text-primary hover:underline">{BRAND.defaultDomain}</a></p>
          </div>
        </Section>

        <div className="mt-12 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border/60 pt-8">
          <Link to="/terms" className="hover:text-primary hover:underline transition-colors">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-primary hover:underline transition-colors">Cookie Policy</Link>
          <Link to="/contact" className="hover:text-primary hover:underline transition-colors">Contact Support</Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
