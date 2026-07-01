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
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.session.user.id);
    const isSuper = (roles ?? []).some((r: any) => r.role === "super_admin");
    if (!isSuper) {
      throw redirect({ to: "/student" });
    }
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

  // Plan Management States
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    monthly_price: 0,
    yearly_price: 0,
    currency: "INR",
    max_events: 10,
    max_organizers: 2,
    max_students: 100,
    max_volunteers: 5,
    storage_limit_gb: 1,
    custom_domain: false,
    payment_gateway_access: false,
    qr_scanner: true,
    certificate_generation: false,
    analytics: false,
    google_forms_integration: false,
    api_access: false,
    priority_support: false,
    is_published: true
  });

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

          {activeTab === "subscriptions" && (() => {
            // Queries for Plans
            const { data: plans = [], refetch: refetchPlans } = useQuery({
              queryKey: ["super-admin", "plans"],
              queryFn: async () => {
                const { data } = await supabase
                  .from("subscription_plans")
                  .select("*")
                  .is("deleted_at", null)
                  .order("monthly_price", { ascending: true });
                return data ?? [];
              }
            });

            // Queries for Colleges Payments settings (Suspend checks)
            const { data: payConfigs = [], refetch: refetchConfigs } = useQuery({
              queryKey: ["super-admin", "colleges-payconfigs"],
              queryFn: async () => {
                const { data } = await supabase
                  .from("college_payment_settings")
                  .select("*, colleges(name)");
                return data ?? [];
              }
            });

            const handlePlanSubmit = async (e: React.FormEvent) => {
              e.preventDefault();
              setBusy(true);
              try {
                if (editingPlan?.id) {
                  // Update plan
                  const { error } = await supabase
                    .from("subscription_plans")
                    .update(planForm)
                    .eq("id", editingPlan.id);
                  if (error) throw error;
                  toast.success("Plan updated successfully!");
                } else {
                  // Create plan
                  const { error } = await supabase
                    .from("subscription_plans")
                    .insert(planForm);
                  if (error) throw error;
                  toast.success("Plan created successfully!");
                }
                setPlanDialogOpen(false);
                refetchPlans();
              } catch (err: any) {
                toast.error(err.message ?? "Failed to save plan.");
              } finally {
                setBusy(false);
              }
            };

            const handleEditPlan = (plan: any) => {
              setEditingPlan(plan);
              setPlanForm({
                name: plan.name,
                monthly_price: Number(plan.monthly_price),
                yearly_price: Number(plan.yearly_price),
                currency: plan.currency,
                max_events: plan.max_events,
                max_organizers: plan.max_organizers,
                max_students: plan.max_students,
                max_volunteers: plan.max_volunteers,
                storage_limit_gb: plan.storage_limit_gb,
                custom_domain: !!plan.custom_domain,
                payment_gateway_access: !!plan.payment_gateway_access,
                qr_scanner: !!plan.qr_scanner,
                certificate_generation: !!plan.certificate_generation,
                analytics: !!plan.analytics,
                google_forms_integration: !!plan.google_forms_integration,
                api_access: !!plan.api_access,
                priority_support: !!plan.priority_support,
                is_published: !!plan.is_published
              });
              setPlanDialogOpen(true);
            };

            const handleDuplicatePlan = async (plan: any) => {
              try {
                const { error } = await supabase
                  .from("subscription_plans")
                  .insert({
                    ...plan,
                    id: undefined,
                    name: `${plan.name} (Copy)`,
                    created_at: undefined,
                    updated_at: undefined
                  });
                if (error) throw error;
                toast.success(`Duplicated plan: ${plan.name}`);
                refetchPlans();
              } catch (err: any) {
                toast.error(err.message ?? "Could not duplicate plan.");
              }
            };

            const handleDeletePlan = async (planId: string) => {
              if (!confirm("Are you sure you want to delete this subscription plan? Existing subscribers will fall back to default.")) return;
              try {
                const { error } = await supabase
                  .from("subscription_plans")
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", planId);
                if (error) throw error;
                toast.success("Plan deleted.");
                refetchPlans();
              } catch (err: any) {
                toast.error(err.message ?? "Failed to delete plan.");
              }
            };

            const handlePublishToggle = async (plan: any) => {
              try {
                const { error } = await supabase
                  .from("subscription_plans")
                  .update({ is_published: !plan.is_published })
                  .eq("id", plan.id);
                if (error) throw error;
                toast.success(`Plan ${plan.is_published ? "unpublished" : "published"}.`);
                refetchPlans();
              } catch (err: any) {
                toast.error(err.message ?? "Failed to toggle publish status.");
              }
            };

            const handleSuspendPayment = async (config: any) => {
              try {
                const { error } = await supabase
                  .from("college_payment_settings")
                  .update({ is_active: !config.is_active })
                  .eq("id", config.id);
                if (error) throw error;
                toast.success(`College payments ${config.is_active ? "suspended" : "resumed"}.`);
                refetchConfigs();
              } catch (err: any) {
                toast.error(err.message ?? "Failed to suspend payments.");
              }
            };

            return (
              <div className="space-y-10">
                {/* Header Actions */}
                <div className="flex justify-between items-center">
                  <h2 className="font-display text-lg font-bold">Platform SaaS Plans</h2>
                  <Button
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({
                        name: "",
                        monthly_price: 0,
                        yearly_price: 0,
                        currency: "INR",
                        max_events: 10,
                        max_organizers: 2,
                        max_students: 100,
                        max_volunteers: 5,
                        storage_limit_gb: 1,
                        custom_domain: false,
                        payment_gateway_access: false,
                        qr_scanner: true,
                        certificate_generation: false,
                        analytics: false,
                        google_forms_integration: false,
                        api_access: false,
                        priority_support: false,
                        is_published: true
                      });
                      setPlanDialogOpen(true);
                    }}
                    className="rounded-full bg-gradient-brand text-white text-xs font-bold"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Create Plan
                  </Button>
                </div>

                {/* Plans Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((p: any) => (
                    <div key={p.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
                            <div className="text-xs text-muted-foreground capitalize mt-0.5">
                              {p.currency} {Number(p.monthly_price).toLocaleString()}/mo • {Number(p.yearly_price).toLocaleString()}/yr
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${p.is_published ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                            {p.is_published ? "Published" : "Draft"}
                          </span>
                        </div>

                        <ul className="text-xs space-y-2 border-t border-border/60 pt-4 text-muted-foreground">
                          <li className="flex justify-between"><span>Max Events:</span> <strong className="text-foreground">{p.max_events >= 9999 ? "Unlimited" : p.max_events}</strong></li>
                          <li className="flex justify-between"><span>Max Organizers:</span> <strong className="text-foreground">{p.max_organizers >= 999 ? "Unlimited" : p.max_organizers}</strong></li>
                          <li className="flex justify-between"><span>Max Students:</span> <strong className="text-foreground">{p.max_students >= 99999 ? "Unlimited" : p.max_students}</strong></li>
                          <li className="flex justify-between"><span>Custom Domain:</span> <strong className="text-foreground">{p.custom_domain ? "Yes" : "No"}</strong></li>
                          <li className="flex justify-between"><span>Payment Gateway:</span> <strong className="text-foreground">{p.payment_gateway_access ? "Yes" : "No"}</strong></li>
                          <li className="flex justify-between"><span>Analytics Dashboard:</span> <strong className="text-foreground">{p.analytics ? "Yes" : "No"}</strong></li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-2 mt-6 border-t border-border/60 pt-4">
                        <Button onClick={() => handleEditPlan(p)} variant="outline" size="sm" className="rounded-xl flex-1 text-xs">Edit</Button>
                        <Button onClick={() => handleDuplicatePlan(p)} variant="outline" size="sm" className="rounded-xl text-xs" title="Duplicate"><Plus className="h-3.5 w-3.5" /></Button>
                        <Button onClick={() => handlePublishToggle(p)} variant="outline" size="sm" className="rounded-xl text-xs">{p.is_published ? "Draft" : "Publish"}</Button>
                        <Button onClick={() => handleDeletePlan(p.id)} variant="outline" size="sm" className="rounded-xl text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Colleges Payment Suspension Controls */}
                <div className="border-t border-border/60 pt-8 space-y-4">
                  <h3 className="font-display text-lg font-bold">College Payment Gateway Gate</h3>
                  <p className="text-xs text-muted-foreground">Monitor payment gateway health and suspend transactions on university portals directly.</p>
                  
                  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/40 uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-6 py-4">College</th>
                          <th className="px-6 py-4">Gateway Mode</th>
                          <th className="px-6 py-4">Key ID</th>
                          <th className="px-6 py-4">Gateway Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {payConfigs.map((cfg: any) => (
                          <tr key={cfg.id} className="hover:bg-muted/10">
                            <td className="px-6 py-4 font-bold text-foreground">{cfg.colleges?.name || "College Portal"}</td>
                            <td className="px-6 py-4 capitalize font-semibold">{cfg.mode}</td>
                            <td className="px-6 py-4 font-mono text-muted-foreground">{cfg.key_id || "Platform Default"}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                cfg.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                              }`}>
                                {cfg.is_active ? "Active" : "Suspended"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                onClick={() => handleSuspendPayment(cfg)}
                                variant="outline"
                                size="sm"
                                className={`rounded-xl h-8 text-xs cursor-pointer ${cfg.is_active ? "hover:bg-destructive/10 text-destructive" : "hover:bg-emerald-500/10 text-emerald-500"}`}
                              >
                                {cfg.is_active ? "Suspend Payments" : "Resume Payments"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {payConfigs.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No college custom payment settings configured yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Plan Create/Edit Dialog Form */}
                <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                  <DialogContent className="rounded-3xl border border-border/80 bg-card max-w-lg shadow-elevated overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">{editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}</DialogTitle>
                      <DialogDescription className="text-xs">Define prices, limits, and boolean feature flags for this subscription tier.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePlanSubmit} className="space-y-4 mt-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-semibold">Plan Name *</Label>
                          <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required className="rounded-xl h-10 mt-1" placeholder="e.g. Starter" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Monthly Price (₹)</Label>
                          <Input type="number" min="0" value={planForm.monthly_price} onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Yearly Price (₹)</Label>
                          <Input type="number" min="0" value={planForm.yearly_price} onChange={(e) => setPlanForm({ ...planForm, yearly_price: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Max Events</Label>
                          <Input type="number" min="1" value={planForm.max_events} onChange={(e) => setPlanForm({ ...planForm, max_events: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Max Organizers</Label>
                          <Input type="number" min="1" value={planForm.max_organizers} onChange={(e) => setPlanForm({ ...planForm, max_organizers: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Max Students</Label>
                          <Input type="number" min="1" value={planForm.max_students} onChange={(e) => setPlanForm({ ...planForm, max_students: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Storage Limit (GB)</Label>
                          <Input type="number" min="1" value={planForm.storage_limit_gb} onChange={(e) => setPlanForm({ ...planForm, storage_limit_gb: Number(e.target.value) })} required className="rounded-xl h-10 mt-1" />
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-4 mt-2 grid gap-3 grid-cols-2 text-xs">
                        {[
                          { id: "custom_domain", label: "Custom Domain" },
                          { id: "payment_gateway_access", label: "Payment Gateway Access" },
                          { id: "qr_scanner", label: "QR Scanner" },
                          { id: "certificate_generation", label: "Certificate Issuance" },
                          { id: "analytics", label: "Analytics Dashboard" },
                          { id: "google_forms_integration", label: "Google Forms Sync" },
                          { id: "api_access", label: "Developer API Access" },
                          { id: "priority_support", label: "Priority Support" },
                        ].map((flag) => (
                          <label key={flag.id} className="flex items-center gap-2 cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={(planForm as any)[flag.id]}
                              onChange={(e) => setPlanForm({ ...planForm, [flag.id]: e.target.checked })}
                              className="rounded border-border text-primary focus:ring-primary/45 cursor-pointer h-4 w-4"
                            />
                            <span className="font-medium text-foreground">{flag.label}</span>
                          </label>
                        ))}
                      </div>

                      <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-brand text-white mt-6 h-10 font-bold">
                        {busy ? "Saving Plan..." : editingPlan ? "Save Plan" : "Create Plan"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })()}

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
