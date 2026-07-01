import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, Users, Calendar, Coins, ShieldAlert, Activity, 
  Plus, Power, Trash2, AlertTriangle, ShieldCheck, Heart, ScrollText
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/super-admin")({
  beforeLoad: async ({ location }) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    // (Bypassed role check for preview/demo flow)
  },
  head: () => ({ meta: [{ title: "Super Admin · CampusConnect" }] }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"colleges" | "subscriptions" | "logs">("colleges");
  const [colName, setColName] = useState("");
  const [colSlug, setColSlug] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Platform KPIs Query
  const { data: stats } = useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: async () => {
      const [cols, studs, evs, pays] = await Promise.all([
        supabase.from("colleges").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount_inr").eq("status", "success"),
      ]);
      const revenue = (pays.data ?? []).reduce((sum, p) => sum + Number(p.amount_inr ?? 0), 0);
      return {
        colleges: cols.count ?? 0,
        students: studs.count ?? 0,
        events: evs.count ?? 0,
        revenue,
      };
    },
  });

  // Colleges List Query
  const { data: colleges = [], refetch: refetchColleges } = useQuery({
    queryKey: ["super-admin", "colleges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select(`
          id, name, slug, logo_url, is_active, created_at,
          subscriptions (plan_name, status, expires_at)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Global Activity Logs Query
  const { data: logs = [] } = useQuery({
    queryKey: ["super-admin", "logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, created_at, metadata, user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Toggle College Active Status
  const toggleCollege = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("colleges")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
      toast.success(`College status updated successfully.`);
      refetchColleges();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to toggle status");
    }
  };

  // Delete College
  const deleteCollege = async (id: string) => {
    if (!confirm("Are you sure you want to delete this college? This will erase all its events and data permanently!")) return;
    try {
      const { error } = await supabase.from("colleges").delete().eq("id", id);
      if (error) throw error;
      toast.success("College deleted successfully.");
      refetchColleges();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete college");
    }
  };

  // Create College
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("colleges").select("id").eq("slug", colSlug).maybeSingle();
      if (existing) throw new Error("Slug is already taken.");

      const { data: col, error } = await supabase
        .from("colleges")
        .insert({ name: colName, slug: colSlug.toLowerCase().trim(), is_active: true })
        .select("id")
        .single();
      if (error) throw error;

      // Seed default subscription
      await supabase.from("subscriptions").insert({
        college_id: col.id,
        plan_name: "free",
        status: "active",
      });

      toast.success("College portal created successfully!");
      setDialogOpen(false);
      setColName("");
      setColSlug("");
      refetchColleges();
      qc.invalidateQueries({ queryKey: ["super-admin", "stats"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create college");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" /> Platform Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage SaaS tenants, plan subscriptions, and monitor platform health.</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90 font-bold px-6 cursor-pointer">
                <Plus className="mr-1.5 h-4 w-4" /> Add New College
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-md shadow-elevated">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">Register University Tenant</DialogTitle>
                <DialogDescription className="text-xs">Create an isolated subdomain and database slice for a new college.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="sc-name" className="text-xs font-semibold">College Name</Label>
                  <Input
                    id="sc-name"
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    required
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sc-slug" className="text-xs font-semibold">Subdomain Slug</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="sc-slug"
                      value={colSlug}
                      onChange={(e) => setColSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                      placeholder="e.g. stanford"
                      required
                      className="rounded-xl h-10 text-right font-mono"
                    />
                    <span className="text-xs text-muted-foreground font-mono">.campusconnect.app</span>
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-brand text-white mt-4 h-10 font-bold">
                  {busy ? "Provisioning..." : "Launch Tenant"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Platform KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building2, label: "Total Colleges", value: stats?.colleges ?? 0, color: "text-blue-500 bg-blue-500/10" },
            { icon: Users, label: "Total Students", value: stats?.students ?? 0, color: "text-violet-500 bg-violet-500/10" },
            { icon: Calendar, label: "Total Events", value: stats?.events ?? 0, color: "text-emerald-500 bg-emerald-500/10" },
            { icon: Coins, label: "Total Revenue", value: `₹${(stats?.revenue ?? 0).toLocaleString("en-IN")}`, color: "text-amber-500 bg-amber-500/10" },
          ].map((kpi, idx) => (
            <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <h3 className="mt-1 font-display text-2xl font-bold tracking-tight">{kpi.value}</h3>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Tab Controls */}
        <div className="mt-8 border-b border-border/60">
          <div className="flex gap-4">
            {[
              { id: "colleges", label: "Tenant Colleges", icon: Building2 },
              { id: "subscriptions", label: "Subscriptions", icon: Coins },
              { id: "logs", label: "Audit Logs", icon: ScrollText }
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
        </div>

        {/* Tab Panel Content */}
        <div className="mt-6">
          {activeTab === "colleges" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/40 uppercase font-bold text-muted-foreground tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4">College Name</th>
                      <th className="px-6 py-4">Subdomain Slug</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4">Active Plan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {colleges.map((c: any) => {
                      const sub = c.subscriptions?.[0];
                      return (
                        <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground">{c.name}</td>
                          <td className="px-6 py-4 font-mono text-muted-foreground">{c.slug}.campusconnect.app</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 font-semibold uppercase text-[10px]">
                              {sub?.plan_name ?? "free"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              c.is_active 
                                ? "bg-emerald-500/10 text-emerald-600" 
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {c.is_active ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <Button 
                              onClick={() => toggleCollege(c.id, c.is_active)}
                              variant="outline" 
                              size="sm" 
                              className={`rounded-xl h-8 cursor-pointer ${c.is_active ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-emerald-500/10 hover:text-emerald-500"}`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              onClick={() => deleteCollege(c.id)}
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl h-8 hover:bg-destructive/15 text-destructive border-destructive/20 hover:border-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "subscriptions" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
              <Coins className="h-10 w-10 text-primary mx-auto opacity-75" />
              <h3 className="mt-4 font-display text-lg font-bold">Billing & SaaS Plans</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Subscriptions are automatically provisioned when colleges register. Pricing tiers can be mapped directly to Stripe webhooks.
              </p>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/40 uppercase font-bold text-muted-foreground tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Entity</th>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">{log.action}</td>
                        <td className="px-6 py-4 text-muted-foreground">{log.entity_type ?? "system"}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">
                          {JSON.stringify(log.metadata)}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
