import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Ticket, Calendar, User, Phone, BookOpen, Fingerprint, 
  MapPin, CheckCircle, Clock, Sparkles, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: async ({ location }) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
  },
  head: () => ({ meta: [{ title: "Student Portal · CampusConnect" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { profile, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<"tickets" | "registrations" | "profile">("tickets");
  
  // Profile form states
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [dept, setDept] = useState(profile?.department ?? "");
  const [prn, setPrn] = useState(profile?.prn ?? "");
  const [updating, setUpdating] = useState(false);

  // Tickets Query
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["student", "tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id, created_at,
          events (id, title, banner_url, venue, start_at)
        `)
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Registrations Query
  const { data: registrations = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["student", "registrations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id, created_at, status,
          events (id, title, is_paid, price_inr)
        `)
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          department: dept,
          prn: prn.toUpperCase().trim(),
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated successfully!");
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
              <Sparkles className="h-3 w-3" /> Student Portal
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Hey, {profile?.full_name ?? "Student"}!
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Manage your event check-ins, ticket receipts, and university records.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="rounded-full bg-gradient-brand text-white font-bold h-9 text-xs px-5 shadow-glow cursor-pointer">
              <Link to="/events">Discover Events</Link>
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="mt-8 border-b border-border/60 flex gap-4">
          {[
            { id: "tickets", label: "My QR Tickets", icon: Ticket },
            { id: "registrations", label: "Registrations", icon: Calendar },
            { id: "profile", label: "My Profile", icon: User }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="mt-6">
          {activeTab === "tickets" && (
            <div>
              {loadingTickets ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
                  You haven't bought or claimed any event tickets yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {tickets.map((t: any) => (
                    <div key={t.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-card transition-shadow flex flex-col justify-between">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                          <img 
                            src={t.events?.banner_url ?? "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png"} 
                            alt="" 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-bold tracking-tight text-foreground line-clamp-1">{t.events?.title}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{t.events?.venue ?? "Campus"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{new Date(t.events?.start_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">ID: #{t.id.slice(0, 8)}</span>
                        <Button asChild size="sm" className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold h-8 text-[11px] px-4 cursor-pointer">
                          <Link to="/tickets/$id" params={{ id: t.id }}>
                            View QR Ticket <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "registrations" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {loadingRegs ? (
                <div className="p-6 space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : registrations.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No event registration records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-muted/40 uppercase font-bold text-muted-foreground tracking-wider border-b border-border">
                      <tr>
                        <th className="px-6 py-4">Event Name</th>
                        <th className="px-6 py-4">Registered Date</th>
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {registrations.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">{r.events?.title}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {r.events?.is_paid ? (
                              <span className="font-semibold text-foreground">₹{r.events?.price_inr}</span>
                            ) : (
                              <span className="text-muted-foreground">Free</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              r.status === "approved" || r.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : r.status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {r.status === "approved" || r.status === "completed" ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-lg">
              <h3 className="font-display text-base font-bold text-foreground">Update University Credentials</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Please ensure your PRN is entered correctly for attendance certificates validation.</p>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4 mt-6">
                <div className="space-y-1">
                  <Label htmlFor="s-name" className="text-xs font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      id="s-name" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      className="pl-9 h-10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="s-phone" className="text-xs font-semibold">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="s-phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="pl-9 h-10 rounded-xl"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="s-dept" className="text-xs font-semibold">Department</Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="s-dept" 
                        value={dept} 
                        onChange={(e) => setDept(e.target.value)} 
                        className="pl-9 h-10 rounded-xl"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="s-prn" className="text-xs font-semibold">University PRN / Registration ID</Label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      id="s-prn" 
                      value={prn} 
                      onChange={(e) => setPrn(e.target.value)} 
                      className="pl-9 h-10 rounded-xl font-mono uppercase"
                      placeholder="e.g. 202610992388"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={updating} className="w-full rounded-full bg-gradient-brand text-white h-10 font-bold mt-2">
                  {updating ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
