"use client";

import { motion } from "framer-motion";
import { Building2, GraduationCap, FlaskConical } from "lucide-react";

export function LandingAbout() {
  return (
    <section className="py-20 bg-gradient-to-br from-orange-50 to-purple-50/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-3">About</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tulsiramji Gaikwad-Patil<br />College of Pharmacy
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              TGPCOP is a premier pharmacy college committed to academic excellence, research, and student development.
              FestVerse is our official digital platform connecting students with college events, workshops, seminars, and cultural activities.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "1000+", label: "Students" },
                { value: "50+", label: "Faculty" },
                { value: "10+", label: "Years" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center rounded-xl bg-white border border-border p-4 card-shadow">
                  <div className="font-display text-2xl font-bold gradient-brand-text">{value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-4"
          >
            {[
              { icon: Building2, title: "Infrastructure", desc: "State-of-the-art labs, auditoriums, and event spaces for every kind of campus activity.", color: "#FF6B35" },
              { icon: GraduationCap, title: "Academic Excellence", desc: "Award-winning faculty and curriculum designed to produce pharmacy leaders of tomorrow.", color: "#7C3AED" },
              { icon: FlaskConical, title: "Research & Innovation", desc: "Active research programs and industry collaborations that bring science to life.", color: "#10B981" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-white border border-border p-5 card-shadow">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
