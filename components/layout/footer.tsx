import Link from "next/link";
import { Sparkles, MapPin, Phone, Mail, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold">
                <span className="gradient-brand-text">Fest</span>
                <span className="text-foreground">Verse</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The official event management platform of Tulsiramji Gaikwad-Patil College of Pharmacy.
            </p>
            <div className="flex gap-3 mt-4">
              {[
                { icon: Instagram, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Youtube, href: "#" },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { href: "/events", label: "Events" },
                { href: "/about", label: "About TGPCOP" },
                { href: "/faq", label: "FAQ" },
                { href: "/contact", label: "Contact Us" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Student */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Student Portal</h4>
            <ul className="space-y-2">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/registrations", label: "My Registrations" },
                { href: "/tickets", label: "My Tickets" },
                { href: "/certificates", label: "Certificates" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                TGPCOP, Nagpur, Maharashtra
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                admin@tgpcop.edu
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FestVerse · TGPCOP. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
