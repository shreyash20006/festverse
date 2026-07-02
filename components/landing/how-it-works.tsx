"use client";

import { motion } from "framer-motion";
import { LogIn, UserCheck, Calendar, QrCode } from "lucide-react";

const STEPS = [
  {
    icon: LogIn,
    title: "Sign In",
    desc: "Log in with your Google account (@tgpcop). Your profile is created automatically.",
    color: "#FF6B35",
    step: "01",
  },
  {
    icon: UserCheck,
    title: "Verify PRN",
    desc: "Enter your PRN number once to link your student identity to your account.",
    color: "#7C3AED",
    step: "02",
  },
  {
    icon: Calendar,
    title: "Register for Events",
    desc: "Browse events, register in seconds. Pay via Razorpay for paid events.",
    color: "#10B981",
    step: "03",
  },
  {
    icon: QrCode,
    title: "Attend with QR",
    desc: "Get your QR ticket via email and app. Scan at the gate for instant check-in.",
    color: "#F59E0B",
    step: "04",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-2">How It Works</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Four Simple Steps</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">From sign-up to attendance, FestVerse makes the entire college event experience seamless.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, desc, color, step }, idx) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="relative group"
            >
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%_-_1rem)] w-8 border-t-2 border-dashed border-border z-10" />
              )}
              <div className="rounded-2xl border border-border bg-background p-6 card-shadow hover:card-shadow-hover transition-all duration-200 group-hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <span className="font-display text-4xl font-black text-border">{step}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
