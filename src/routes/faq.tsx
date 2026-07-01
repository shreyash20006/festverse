import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { Search, HelpCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ Center · FestVerse" }] }),
  component: FAQPage,
});

const FAQS = [
  {
    q: "How does PRN verification work?",
    a: "When students register, FestVerse cross-references their PRN (Permanent Registration Number) with their college's uploaded student list. This ensures only authenticated college students can register for restricted events, eliminating seat theft."
  },
  {
    q: "Are the QR tickets screenshot-proof?",
    a: "Yes! FestVerse tickets use a rolling cryptographic QR token that refreshes every 30 seconds. Screenshots or static printouts will fail at the scanning gate, entirely preventing ticket sharing and fraud."
  },
  {
    q: "How do we receive payments for paid events?",
    a: "Colleges can link their own Razorpay or Cashfree keys in the settings page. All registration fees go directly from the student's UPI/card to the college's bank account. FestVerse charges 0% commission on payments."
  },
  {
    q: "How are certificates generated?",
    a: "Once an organizer scans a student's QR ticket at the event gate, their attendance is recorded. After the event concludes, the system automatically generates participation certificates with verified blockchain-style hashes and emails them to verified students."
  },
  {
    q: "Can volunteers scan tickets?",
    a: "Yes! Admin managers can assign students as 'Scanners'. Scanners receive a simplified UI where they can use their mobile camera to scan tickets in real-time, even during peak rush hours."
  },
  {
    q: "Is data isolated between different colleges?",
    a: "Absolutely. FestVerse is built as a multi-tenant SaaS. Each college gets an isolated tenant environment, separate settings, isolated student lists, payments keys, and event logs. There is zero overlap of private data."
  }
];

function FAQPage() {
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      {/* Hero section */}
      <section className="relative overflow-hidden py-20 px-6 text-center border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="container relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 uppercase tracking-wider">
            FAQ Center
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Find answers to common questions about ticket security, payment setups, RLS isolation, and certificate generation.
          </p>

          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-full border-border bg-background shadow-soft"
            />
          </div>
        </div>
      </section>

      {/* Accordion list */}
      <section className="container mx-auto px-6 py-16 max-w-3xl">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No FAQs match your search.</p>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {filtered.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`} 
                className="border border-border/80 bg-card rounded-2xl px-6 py-1.5 shadow-sm hover:shadow-soft transition-all duration-200"
              >
                <AccordionTrigger className="font-display font-bold text-foreground text-sm hover:no-underline text-left">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    {faq.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-xs leading-relaxed pl-6 pt-1 border-t border-border/20 mt-2">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
