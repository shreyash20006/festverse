"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Who can register for events?", a: "Any TGPCOP student with a valid PRN can register. You'll need to sign in with your Google account and complete a one-time PRN verification." },
  { q: "How do I get my QR ticket?", a: "After successful registration (and payment for paid events), your QR ticket is instantly generated and available in the My Tickets section. You can download or screenshot it." },
  { q: "What if the event is paid?", a: "Paid events use Razorpay for secure payments. You'll be redirected to a checkout page where you can pay via UPI, card, or netbanking. Registration is confirmed only after payment." },
  { q: "How does attendance scanning work?", a: "At the event gate, a volunteer scans your QR code using the FestVerse Scanner app. It instantly marks you as checked-in and prevents duplicate entries." },
  { q: "How do I download my certificate?", a: "Certificates are issued after the event to students who attended. You can find and download them in the Certificates section of your dashboard." },
  { q: "Can I cancel my registration?", a: "Cancellation policies vary per event. Contact the event organizer or college administration for refund-related queries." },
];

export function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-2">FAQ</span>
          <h2 className="font-display text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-2xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between text-left px-6 py-4 hover:bg-muted/40 transition-colors"
                onClick={() => setOpen(open === idx ? null : idx)}
              >
                <span className="font-semibold text-sm text-foreground pr-4">{faq.q}</span>
                <motion.div animate={{ rotate: open === idx ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {open === idx && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
