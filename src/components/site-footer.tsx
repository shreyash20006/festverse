import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin, Heart, Mail, ExternalLink } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-muted/20 py-16 backdrop-blur-sm">
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
            The modern digital infrastructure for college events. Discover activities, book tickets, check in with QR codes, and download verified certificates—all in one secure platform.
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
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Discover</h4>
          <ul className="mt-3.5 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/events" className="hover:text-primary transition-colors flex items-center gap-1.5">
                All events <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            </li>
            <li>
              <Link to="/my-tickets" className="hover:text-primary transition-colors">
                My tickets
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">Account & Support</h4>
          <ul className="mt-3.5 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/auth" className="hover:text-primary transition-colors">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-primary transition-colors">
                Student Profile
              </Link>
            </li>
            <li>
              <a href="mailto:support@campusconnect.edu" className="hover:text-primary transition-colors flex items-center gap-1">
                <Mail className="h-3 w-3" /> Get Help
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto mt-12 border-t border-border/60 px-4 pt-6 text-[10px] text-muted-foreground sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} CampusConnect. All rights reserved.
        </div>
        <div className="flex items-center gap-1">
          Made with <Heart className="h-3 w-3 fill-rose-500 text-rose-500 animate-pulse" /> for students
        </div>
      </div>
    </footer>
  );
}
