import { Link } from "@tanstack/react-router";
import { Github, Heart, Mail, ExternalLink, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-background/50 py-16 backdrop-blur-sm">
      <div className="container mx-auto grid gap-8 px-4 sm:px-6 md:grid-cols-4 lg:gap-12">
        <div className="md:col-span-1 space-y-4">
          <Logo size="md" />
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {BRAND.appName} is the official event management platform for TGPCOP. We automate ticketing, payments, check-ins, and certificate distribution so students can easily discover and participate in campus activities.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105"
              aria-label="Email Support"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Quick Links</h4>
          <ul className="mt-3.5 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/events" className="hover:text-primary transition-colors">
                Explore Events
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary transition-colors">
                FAQ Center
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Platform</h4>
          <ul className="mt-3.5 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-primary transition-colors">
                About Mission
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary transition-colors">
                Support Helpdesk
              </Link>
            </li>
            <li>
              <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-primary transition-colors">
                {BRAND.supportEmail}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Legal</h4>
          <ul className="mt-3.5 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/cookies" className="hover:text-primary transition-colors">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto mt-12 border-t border-border/60 px-4 pt-6 text-[10px] text-muted-foreground sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} {BRAND.appName}. All rights reserved.</span>
          <Link to="/privacy" className="hover:text-primary hover:underline transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-primary hover:underline transition-colors">Terms</Link>
          <Link to="/cookies" className="hover:text-primary hover:underline transition-colors">Cookies</Link>
        </div>
        <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> ISO 27001 Secured
        </div>
      </div>
    </footer>
  );
}

