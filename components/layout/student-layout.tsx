import Link from "next/link";
import { Bell, Ticket, Award, ClipboardList, User, LayoutDashboard } from "lucide-react";
import { StudentMobileNav } from "@/components/layout/student-mobile-nav";

interface Props {
  children: React.ReactNode;
  avatarUrl?: string | null;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/certificates", label: "Certificates", icon: Award },
];

export function StudentLayout({ children, avatarUrl }: Props) {
  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold">
            <span className="gradient-brand-text">Fest</span>
            <span className="text-foreground">Verse</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Icon className="h-4 w-4" />{label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />
            </Link>
            <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <StudentMobileNav />
    </div>
  );
}
