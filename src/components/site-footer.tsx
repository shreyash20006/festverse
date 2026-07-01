import { Link } from "@tanstack/react-router";
import { Github, Heart, Mail, ExternalLink, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-background/50 py-16 backdrop-blur-sm">
      <div className="container mx-auto grid gap-8 px-4 sm:px-6 md:grid-cols-4 lg:gap-12">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5 group">
            <img
              src="https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"
              alt="CampusConnect"
              className="h-8 w-8 rounded-xl object-contain shadow-glow-sm transition-transform group-hover:scale-105"
            />
            <span className="font-display text-lg font-bold tracking-tight bg-gradient-brand bg-clip-text text-transparent">
              CampusConnect
            </span>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            CampusConnect is the ultimate university event management platform. We automate ticketing, payments, check-ins, and certificate distribution so you can focus on building experiences.
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
              <Link to="/colleges" className="hover:text-primary transition-colors">
                Browse Colleges
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-primary transition-colors">
                Pricing Plans
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
              <Link to="/faq" className="hover:text-primary transition-colors">
                FAQ Center
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto mt-12 border-t border-border/60 px-4 pt-6 text-[10px] text-muted-foreground sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} CampusConnect. All rights reserved.</span>
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span className="hover:underline cursor-pointer">Terms of Service</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> ISO 27001 Secured
        </div>
      </div>
    </footer>
  );
}
