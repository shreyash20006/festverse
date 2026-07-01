import { Link, useRouterState } from "@tanstack/react-router";
import { Ticket, Search, LayoutDashboard, User, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth-provider";

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: Search },
  { to: "/my-tickets", label: "My Tickets", icon: Ticket, auth: true },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-350 ${
        scrolled
          ? "border-b border-border/80 bg-background/70 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm text-foreground transition-all hover:bg-muted hover:border-border cursor-pointer md:hidden active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r border-border/80 bg-card/95 backdrop-blur-lg">
              <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                <img
                  src="https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"
                  alt=""
                  className="h-9 w-9 rounded-xl object-contain shadow-glow-sm"
                />
                <div className="flex flex-col leading-none">
                  <span className="font-display text-base font-bold tracking-tight bg-gradient-brand bg-clip-text text-transparent">CampusConnect</span>
                </div>
              </div>
              <nav className="flex flex-col gap-1.5 p-4">
                {navItems.map((it) => {
                  if (it.auth && !user) return null;
                  const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                        active
                          ? "bg-gradient-brand-soft text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  );
                })}
                <Link
                  to="/admin"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" /> Admin
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
 
          <Link to="/" className="flex min-w-0 items-center gap-2.5 group">
            <div className="relative overflow-hidden rounded-xl transition-all duration-300 group-hover:scale-105 active:scale-95">
              <img
                src="https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"
                alt="CampusConnect"
                className="h-9 w-9 shrink-0 rounded-xl object-contain transition-transform duration-500 group-hover:rotate-6"
              />
            </div>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-display text-base font-extrabold tracking-tight sm:text-lg bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-foreground group-hover:text-primary transition-colors">
                CampusConnect
              </span>
            </div>
          </Link>
        </div>
 
        <nav className="hidden items-center gap-1.5 md:flex">
          {navItems.map((it) => {
            if (it.auth && !user) return null;
            const active =
              it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground border border-transparent hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
          <Link
            to="/admin"
            className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer text-muted-foreground border border-transparent hover:bg-muted/50 hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
 
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/80 bg-card p-1 pr-3 shadow-sm hover:shadow transition-all hover:bg-muted cursor-pointer active:scale-98">
                  <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-white">
                      {(profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-semibold text-foreground sm:inline max-w-[100px] truncate">
                    {profile?.full_name?.split(" ")[0] ?? "Account"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-elevated">
                <div className="px-3.5 py-2.5">
                  <div className="font-semibold text-sm truncate text-foreground">{profile?.full_name ?? "User"}</div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                  <Link to="/my-tickets" className="cursor-pointer text-xs font-medium">
                    <Ticket className="mr-2 h-4 w-4 text-muted-foreground" /> My Tickets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                  <Link to="/profile" className="cursor-pointer text-xs font-medium">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" /> Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                    <Link to="/admin" className="cursor-pointer text-xs font-medium">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" /> Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="cursor-pointer text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl mx-1.5"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full bg-gradient-brand text-xs font-bold text-white shadow-glow hover:opacity-90 hover:shadow-glow-primary active:scale-95 transition-all">
              <Link to="/auth" className="h-9 px-4 py-2">
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
