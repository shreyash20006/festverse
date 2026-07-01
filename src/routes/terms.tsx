import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND } from "@/lib/brand";
import { FileText, AlertTriangle, Ban, Scale, CreditCard, Mail, Globe, ShieldCheck, Gavel, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND.appName}` },
      { name: "description", content: `Read the ${BRAND.appName} Terms of Service before using our platform.` },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
  const effectiveDate = "July 1, 2025";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-background border-b border-border/60 py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <FileText className="h-3.5 w-3.5" /> Legal Document
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
            By using {BRAND.appName}, you agree to these terms. Please read them carefully before using our platform.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Effective Date: <strong className="text-foreground">{effectiveDate}</strong></p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-14">

        <Section icon={Globe} title="1. Acceptance of Terms">
          <p>By accessing or using {BRAND.appName} (the "Platform"), you agree to be bound by these Terms of Service ("Terms") and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree, you must not use the Platform.</p>
          <p className="mt-2">These Terms apply to all users including students, college administrators, organizers, volunteers, and any other role on the Platform.</p>
        </Section>

        <Section icon={ShieldCheck} title="2. Eligibility & Account Registration">
          <p>To use {BRAND.appName}, you must:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Be at least 13 years of age (users under 18 require parental/guardian consent).</li>
            <li>Be a registered student, faculty member, or authorized representative of a participating institution.</li>
            <li>Provide accurate and complete information during registration.</li>
            <li>Keep your login credentials secure and not share them with others.</li>
          </ul>
          <p className="mt-3">You are responsible for all activities that occur under your account. Notify us immediately at <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a> if you suspect unauthorized access.</p>
        </Section>

        <Section icon={FileText} title="3. Use of the Platform">
          <p>You may use {BRAND.appName} solely for lawful purposes as a student or college administrator. You agree to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Provide truthful information including your PRN and college affiliation during verification.</li>
            <li>Register for events only at colleges where you are an enrolled student or have been granted permission.</li>
            <li>Use QR tickets only for the event and date for which they were issued.</li>
            <li>Respect other users and refrain from any form of harassment or abuse on the Platform.</li>
          </ul>
        </Section>

        <Section icon={Ban} title="4. Prohibited Activities">
          <p>You must not:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Impersonate another person, student, or institution.</li>
            <li>Forge, duplicate, or transfer QR tickets to unauthorized individuals.</li>
            <li>Attempt to reverse-engineer, hack, scrape, or exploit the Platform.</li>
            <li>Use automated bots, scripts, or tools to access or manipulate data.</li>
            <li>Upload malicious code, viruses, or content that infringes intellectual property rights.</li>
            <li>Circumvent security measures, payment verification, or PRN checks.</li>
            <li>Use the Platform to conduct unauthorized commercial activities.</li>
          </ul>
          <p className="mt-3">Violation of these prohibitions may result in immediate account suspension and legal action.</p>
        </Section>

        <Section icon={CreditCard} title="5. Payments & Refunds">
          <p>Certain events on {BRAND.appName} may require payment of a registration fee. By making a payment you agree to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>All payment processing is handled securely by Razorpay. {BRAND.appName} does not store your card or bank details.</li>
            <li>Fees displayed include applicable taxes (GST) where applicable.</li>
            <li>All payments are final. Refunds are available only if an event is cancelled by the organizer or at the sole discretion of the College Admin within their stated refund policy.</li>
            <li>Refund processing may take 5–10 business days depending on your payment method.</li>
            <li>{BRAND.appName} is not liable for failed payments due to issues with your bank or Razorpay.</li>
          </ul>
        </Section>

        <Section icon={Scale} title="6. Intellectual Property">
          <p>All content on the Platform including logos, designs, code, text, and data belongs to {BRAND.appName} or its licensors. You may not copy, reproduce, or distribute any part of the Platform without prior written consent.</p>
          <p className="mt-2">Content you upload (profile pictures, documents) remains yours, but you grant {BRAND.appName} a non-exclusive, worldwide license to display and process it for Platform operations.</p>
        </Section>

        <Section icon={AlertTriangle} title="7. Disclaimer of Warranties">
          <p>{BRAND.appName} is provided on an "as-is" and "as-available" basis without any warranty of any kind. We do not guarantee:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Uninterrupted, error-free, or secure operation of the Platform.</li>
            <li>That events listed will proceed as advertised (we are a platform, not an event organizer).</li>
            <li>The accuracy of information posted by colleges or organizers.</li>
          </ul>
          <p className="mt-3">To the fullest extent permitted by law, we disclaim all implied warranties including merchantability, fitness for a particular purpose, and non-infringement.</p>
        </Section>

        <Section icon={Gavel} title="8. Limitation of Liability">
          <p>{BRAND.appName} and its officers, directors, and employees shall not be liable for:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Any indirect, incidental, special, punitive, or consequential damages.</li>
            <li>Loss of data, profits, or goodwill arising from use of the Platform.</li>
            <li>Unauthorized access to your account if caused by your failure to secure credentials.</li>
            <li>Actions or inactions of third-party service providers (Razorpay, Supabase, Google).</li>
          </ul>
          <p className="mt-3">Our total liability to you for any claim arising out of or related to these Terms is limited to the amount you paid to {BRAND.appName} in the 3 months preceding the claim, or ₹500, whichever is greater.</p>
        </Section>

        <Section icon={Globe} title="9. Governing Law">
          <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in India.</p>
          <p className="mt-2">For any disputes, we encourage you to first contact us at <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a> to resolve the matter amicably before initiating legal proceedings.</p>
        </Section>

        <Section icon={RefreshCw} title="10. Changes to These Terms">
          <p>We reserve the right to update these Terms at any time. When we do, we will update the Effective Date and notify you via email or platform notice for material changes.</p>
          <p className="mt-2">Continued use of {BRAND.appName} after the effective date of any changes constitutes your agreement to the revised Terms.</p>
        </Section>

        <Section icon={Mail} title="11. Contact Us">
          <p>If you have questions or concerns about these Terms, please contact us:</p>
          <div className="mt-3 rounded-2xl border border-border bg-card/60 p-5 space-y-2">
            <p><strong className="text-foreground">{BRAND.appName} Legal</strong></p>
            <p>Email: <a href={`mailto:${BRAND.supportEmail}`} className="text-primary hover:underline">{BRAND.supportEmail}</a></p>
            <p>Website: <a href={`https://${BRAND.defaultDomain}`} className="text-primary hover:underline">{BRAND.defaultDomain}</a></p>
          </div>
        </Section>

        <div className="mt-12 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border/60 pt-8">
          <Link to="/privacy" className="hover:text-primary hover:underline transition-colors">Privacy Policy</Link>
          <Link to="/cookies" className="hover:text-primary hover:underline transition-colors">Cookie Policy</Link>
          <Link to="/contact" className="hover:text-primary hover:underline transition-colors">Contact Support</Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
