import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  QrCode,
  GraduationCap,
  BarChart3,
  Settings,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ArrowLeft,
  Award,
  Megaphone,
  HandHelping,
  FileBarChart,
  LifeBuoy,
  ScrollText,
  PanelLeftClose,
  PanelLeft,
  Command as CommandIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "./command-palette";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/registrations", label: "Registrations", icon: Users },
  { to: "/admin/scanner", label: "QR Check-in", icon: QrCode },
  { to: "/admin/students", label: "Students", icon: GraduationCap },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/volunteers", label: "Volunteers", icon: HandHelping },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: true },
  { to: "/admin/settings/payments", label: "Payment Settings", icon: Settings },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
];

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("cc-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cc-theme");
      if (stored) setDark(stored === "dark");
    } catch {}
  }, []);
  return { dark, toggle: () => setDark((d) => !d) };
}

function SidebarNav({ collapsed, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { roles } = useAuth();

  const filteredNav = NAV.filter((it) => {
    if (roles.includes("scanner") && !roles.includes("college_admin") && !roles.includes("super_admin")) {
      return it.to === "/admin/scanner";
    }
    if (roles.includes("organizer") && !roles.includes("college_admin") && !roles.includes("super_admin")) {
      return it.to !== "/admin/settings" && it.to !== "/admin/settings/payments" && it.to !== "/admin/audit" && it.to !== "/admin/volunteers";
    }
    return true;
  });

  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {filteredNav.map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onItemClick}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              active
                ? "bg-primary/[0.08] text-primary shadow-sm"
                : "text-muted-foreground hover:bg-foreground/[0.02] hover:text-foreground dark:hover:bg-white/[0.02]"
            } ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? it.label : undefined}
          >
            {active && (
              <motion.span
                layoutId="admin-active-pill"
                className="absolute inset-y-2 left-0 w-0.75 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <it.icon className={`h-[16px] w-[16px] shrink-0 transition-transform group-hover:scale-105 ${active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"}`} />
            {!collapsed && (
              <>
                <span className="truncate">{it.label}</span>
                {it.soon && (
                  <span className="ml-auto rounded-full bg-muted border border-border/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                    Soon
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/admin" className="flex items-center gap-2.5 px-5 py-5 group">
      <Logo size="md" iconOnly={collapsed} />
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/85">Admin Panel</div>
        </div>
      )}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();
  
  const { roles, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (roles.includes("scanner") && !roles.includes("college_admin") && !roles.includes("super_admin")) {
      if (pathname !== "/admin/scanner") {
        window.location.href = "/admin/scanner";
      }
    }
  }, [roles, pathname]);

  // ✅ OPTIMIZED: Use profile from auth context + staleTime to avoid refetches
  const { data: me } = useQuery({
    queryKey: ["admin", "me", user?.id],
    queryFn: async () => {
      // Skip if no user
      if (!user) return null;
      
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();
      
      return {
        email: user.email,
        full_name: p?.full_name,
        avatar_url: p?.avatar_url,
      };
    },
    enabled: !!user, // ✅ Don't query if no user
    staleTime: 1000 * 60 * 10, // ✅ Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // ✅ Keep in memory for 30 minutes
  });

  const initials = (me?.full_name || me?.email || "A").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)] transition-colors duration-300">
      {/* Sidebar – desktop */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-md transition-[width] lg:flex ${
          collapsed ? "w-[72px]" : "w-[248px]"
        }`}
      >
        <Brand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto pb-4">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="border-t border-border/80 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {!collapsed && "Back to site"}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Sidebar – mobile */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <Brand />
          <div className="pb-6">
            <SidebarNav onItemClick={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          {/* Global search */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex h-9 max-w-md flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-background"
          >
            <Search className="h-4 w-4" />
            <span className="hidden truncate sm:inline">Search or jump to…</span>
            <span className="ml-auto hidden items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
              <CommandIcon className="h-2.5 w-2.5" /> K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1">
            {/* Quick actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Create</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/admin/events/new"><Plus className="mr-2 h-4 w-4" />New event</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/admin/scanner"><QrCode className="mr-2 h-4 w-4" />Open scanner</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/admin/registrations"><FileBarChart className="mr-2 h-4 w-4" />Export report</Link></DropdownMenuItem>
                <DropdownMenuItem><Megaphone className="mr-2 h-4 w-4" />Send notice</DropdownMenuItem>
                <DropdownMenuItem><Award className="mr-2 h-4 w-4" />Generate certificates</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <button className="relative grid h-9 w-9 place-items-center rounded-xl hover:bg-muted">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-card" />
            </button>

            {/* Theme */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted"
            >
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {/* College switcher (placeholder) */}
            <button
              className="hidden h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium hover:bg-muted md:inline-flex"
              title="College switcher (coming soon)"
            >
              Your College <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-muted">
                  {me?.avatar_url ? (
                    <img src={me.avatar_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-[11px] font-bold text-white">
                      {initials}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>
                  <div className="font-semibold">{me?.full_name || "Admin"}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{me?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/admin/settings">Settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/">View site</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
