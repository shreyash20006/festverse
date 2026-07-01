import { Link, useRouterState } from "@tanstack/react-router";
import { Ticket, Search, LayoutDashboard, User, LogIn, Menu, Plus, Building2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createCollegeTenant } from "@/lib/admin.functions";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/brand-logo";

const publicNavItems = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/colleges", label: "Colleges" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, roles, isAdmin } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Super Admin Create College Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colName, setColName] = useState("");
  const [colSlug, setColSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const submitCollege = useServerFn(createCollegeTenant);

  const isSuperAdmin = roles.includes("super_admin");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitCollege({ data: { name: colName, slug: colSlug.toLowerCase().trim() } });
      if (res?.ok) {
        toast.success(`Success! Registered college ${colName}`);
        setDialogOpen(false);
        setColName("");
        setColSlug("");
        window.location.href = `/c/${res.slug}`;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create college tenant");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/80 bg-background/70 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          {/* Mobile Sheet Nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
                <Logo size="md" />
              </div>
              <nav className="flex flex-col gap-1.5 p-4">
                {publicNavItems.map((it) => {
                  const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                        active
                          ? "bg-gradient-brand-soft text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      {it.label}
                    </Link>
                  );
                })}

                {user && (
                  <Link
                    to="/my-tickets"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
                  >
                    My Tickets
                  </Link>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setDialogOpen(true);
                    }}
                    className="flex items-center gap-3 text-left w-full rounded-xl px-3.5 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  >
                    <Plus className="h-4 w-4" /> Create College
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5 group">
            <Logo size="md" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {publicNavItems.map((it) => {
            const active =
              it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground border border-transparent hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {it.label}
              </Link>
            );
          })}

          {isSuperAdmin && (
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer text-blue-600 dark:text-blue-400 border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Create College
            </button>
          )}
        </nav>

        {/* Auth / Account Trigger */}
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
                
                {/* Student Dashboard Route */}
                <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                  <Link to="/student" className="cursor-pointer text-xs font-medium">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" /> Student Portal
                  </Link>
                </DropdownMenuItem>

                {/* My Tickets */}
                <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                  <Link to="/my-tickets" className="cursor-pointer text-xs font-medium">
                    <Ticket className="mr-2 h-4 w-4 text-muted-foreground" /> My Tickets
                  </Link>
                </DropdownMenuItem>

                {/* Admin Dashboard */}
                {isAdmin && (
                  <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                    <Link to="/admin" className="cursor-pointer text-xs font-medium">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" /> Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}

                {/* Super Admin Dashboard */}
                {isSuperAdmin && (
                  <DropdownMenuItem asChild className="rounded-xl mx-1.5 focus:bg-muted/80">
                    <Link to="/super-admin" className="cursor-pointer text-xs font-medium">
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" /> Platform Dashboard
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

      {/* Super Admin Create College Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-md shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Launch College Tenant</DialogTitle>
            <DialogDescription className="text-xs">
              Instantiate a branded event portal for a new college.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCollege} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="c-name" className="text-xs font-semibold">College Name</Label>
              <Input
                id="c-name"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="e.g. Harvard University"
                required
                className="rounded-xl h-10 border-border/85"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-slug" className="text-xs font-semibold">URL Subdomain Slug</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="c-slug"
                  value={colSlug}
                  onChange={(e) => setColSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                  placeholder="e.g. harvard"
                  required
                  className="rounded-xl h-10 border-border/85 text-right font-mono"
                />
                <span className="text-xs text-muted-foreground font-mono">.{BRAND.defaultDomain}</span>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-brand text-white mt-4 h-10 font-bold active:scale-98">
              {busy ? "Provisioning..." : "Launch Tenant Portal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
