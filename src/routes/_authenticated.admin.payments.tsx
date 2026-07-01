import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { approveRefund } from "@/lib/payment-pricing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  CreditCard, Search, Filter, ArrowDownToLine, RefreshCcw, 
  Coins, CheckCircle2, XCircle, AlertCircle, Percent, Plus, Loader2 
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: `Payments · Admin · ${BRAND.appName}` }] }),
  component: PaymentsDashboard,
});

function PaymentsDashboard() {
  const refundFn = useServerFn(approveRefund);

  const [activeTab, setActiveTab] = useState<"transactions" | "analytics" | "coupons">("transactions");
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

  // Dialog states for Refund
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  // Dialog states for Coupon Creation
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [expiryDate, setExpiryDate] = useState("");
  const [minPurchase, setMinPurchase] = useState("0");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Fetch college details
  const { data: collegeInfo } = useQuery({
    queryKey: ["admin", "college-info"],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return null;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("college_id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      return roleRow?.college_id || null;
    }
  });

  const collegeId = collegeInfo;

  // Fetch Payments & Stats
  const { data: dashboardData, refetch } = useQuery({
    queryKey: ["admin", "payments-dashboard", collegeId],
    enabled: !!collegeId,
    queryFn: async () => {
      const [{ data: payments }, { data: events }, { data: coupons }] = await Promise.all([
        supabase
          .from("payments")
          .select(`
            id, amount_inr, status, provider_code, provider_order_id, provider_payment_id, created_at,
            event_id, user_id, registrations(full_name, email, prn), events(title), invoices(invoice_number)
          `)
          .eq("college_id", collegeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, title")
          .eq("college_id", collegeId),
        supabase
          .from("coupons")
          .select("*")
          .eq("college_id", collegeId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
      ]);

      const list = payments ?? [];
      
      // Calculate Stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let todayRev = 0;
      let monthRev = 0;
      let totalRev = 0;
      let pendingCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let refundedCount = 0;

      list.forEach((p) => {
        const amt = Number(p.amount_inr);
        const created = new Date(p.created_at);

        if (p.status === "success" || p.status === "refunded") {
          totalRev += amt;
          if (created >= todayStart) todayRev += amt;
          if (created >= monthStart) monthRev += amt;
        }

        if (p.status === "success") successCount++;
        else if (p.status === "created") pendingCount++;
        else if (p.status === "failed") failedCount++;
        else if (p.status === "refunded") refundedCount++;
      });

      return {
        payments: list,
        events: events ?? [],
        coupons: coupons ?? [],
        stats: {
          todayRev,
          monthRev,
          totalRev,
          pendingCount,
          successCount,
          failedCount,
          refundedCount,
        }
      };
    }
  });

  const payments = dashboardData?.payments ?? [];
  const events = dashboardData?.events ?? [];
  const coupons = dashboardData?.coupons ?? [];
  const stats = dashboardData?.stats ?? {
    todayRev: 0,
    monthRev: 0,
    totalRev: 0,
    pendingCount: 0,
    successCount: 0,
    failedCount: 0,
    refundedCount: 0,
  };

  // Filter Logic
  const filteredPayments = payments.filter((p) => {
    const student = p.registrations as any;
    const nameMatch = student?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                      student?.prn?.toLowerCase().includes(search.toLowerCase()) ||
                      p.provider_payment_id?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === "all" || p.status === statusFilter;
    const eventMatch = eventFilter === "all" || p.event_id === eventFilter;
    return nameMatch && statusMatch && eventMatch;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date", "Student", "PRN", "Event", "Amount (INR)", "Status", "Gateway ID", "Invoice"];
    const rows = filteredPayments.map((p) => {
      const student = p.registrations as any;
      const inv = p.invoices as any;
      return [
        new Date(p.created_at).toLocaleDateString(),
        student?.full_name ?? "—",
        student?.prn ?? "—",
        p.events?.title ?? "—",
        p.amount_inr,
        p.status.toUpperCase(),
        p.provider_payment_id ?? "—",
        inv?.invoice_number ?? "—",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export started!");
  };

  // Refund Submit
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    const amt = Number(refundAmount);
    if (isNaN(amt) || amt <= 0 || amt > Number(selectedPayment.amount_inr)) {
      toast.error(`Please enter a valid amount up to ₹${selectedPayment.amount_inr}`);
      return;
    }

    setProcessingRefund(true);
    try {
      await refundFn({
        data: {
          paymentId: selectedPayment.id,
          amount: amt,
          reason: refundReason.trim() || undefined,
        }
      });
      toast.success("Refund processed successfully!");
      setRefundDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to issue refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  // Coupon Submit
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId) return;

    if (!couponCode.trim() || !discountValue.trim()) {
      toast.error("Please enter a code and discount value.");
      return;
    }

    setCreatingCoupon(true);
    try {
      const { error } = await supabase
        .from("coupons")
        .insert({
          college_id: collegeId,
          code: couponCode.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          max_uses: Number(maxUses) || 100,
          min_purchase: Number(minPurchase) || 0,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
          status: "active"
        });

      if (error) throw error;
      toast.success("Coupon code created successfully!");
      setCouponDialogOpen(false);
      setCouponCode("");
      setDiscountValue("");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create coupon code.");
    } finally {
      setCreatingCoupon(false);
    }
  };

  // Toggle Coupon Status
  const toggleCouponStatus = async (id: string, current: string) => {
    try {
      const next = current === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("coupons")
        .update({ status: next })
        .eq("id", id);
      if (error) throw error;
      toast.success("Coupon status updated.");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update coupon.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="h-8 w-8 text-primary" /> College Payments Hub
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor event revenues, manage discounts, and handle student refunds.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="rounded-full h-10 w-10 p-0 cursor-pointer">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="rounded-full text-xs font-semibold h-10 px-5 cursor-pointer">
            <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Today's Revenue", val: `₹${stats.todayRev.toLocaleString("en-IN")}`, desc: "Captured today", icon: Coins, color: "text-primary bg-primary/10" },
          { label: "Monthly Revenue", val: `₹${stats.monthRev.toLocaleString("en-IN")}`, desc: "Current calendar month", icon: Coins, color: "text-violet-500 bg-violet-500/10" },
          { label: "Total Revenue", val: `₹${stats.totalRev.toLocaleString("en-IN")}`, desc: "Lifetime earnings", icon: Coins, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Success Rate", val: `${stats.successCount + stats.refundedCount}/${stats.payments.length}`, desc: "Processed payments", icon: CheckCircle2, color: "text-blue-500 bg-blue-500/10" },
        ].map((card, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-5 shadow-card flex flex-col justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight">{card.val}</h3>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{card.desc}</span>
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Controls */}
      <div className="mt-8 border-b border-border/60">
        <div className="flex gap-4">
          {[
            { id: "transactions", label: "Transactions", icon: CreditCard },
            { id: "coupons", label: "Discount Coupons", icon: Percent },
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

      {/* Tab Panels */}
      <div className="mt-6">
        
        {/* TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            
            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 bg-muted/40 p-4 border border-border/60 rounded-3xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search PRN, Student Name, Gateway Payment ID..."
                  className="pl-10 rounded-xl h-9 text-xs"
                />
              </div>

              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="created">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="max-w-[200px] truncate">{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Event</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Payment ID</th>
                      <th className="px-5 py-4">Invoice</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPayments.map((p: any) => {
                      const student = p.registrations as any;
                      const inv = p.invoices as any;
                      return (
                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-foreground">{student?.full_name ?? "Unknown Student"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{student?.prn ?? "—"}</div>
                          </td>
                          <td className="px-5 py-3.5 max-w-[200px] truncate font-medium">{p.events?.title || "—"}</td>
                          <td className="px-5 py-3.5 font-bold text-foreground">₹{Number(p.amount_inr).toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              p.status === "success" ? "bg-success/10 text-success border border-success/20" :
                              p.status === "refunded" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                              p.status === "failed" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                              "bg-muted text-muted-foreground border border-border"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted-foreground text-[10px]">
                            {p.provider_payment_id || "—"}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-primary">
                            {inv?.invoice_number ? (
                              <span className="cursor-pointer hover:underline" title="Invoice Code">{inv.invoice_number}</span>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {p.status === "success" && (
                              <Button
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setRefundAmount(String(p.amount_inr));
                                  setRefundReason("");
                                  setRefundDialogOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-8 text-[10px] border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              >
                                Refund
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                          No transactions found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Dialog Form */}
            <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
              <DialogContent className="rounded-3xl border border-border/80 bg-card max-w-sm shadow-elevated">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-1.5"><AlertCircle className="h-5 w-5 text-destructive" /> Issue Refund</DialogTitle>
                  <DialogDescription className="text-xs">This connects to Razorpay API and reverses payment capturing. This action is irreversible.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRefundSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Refund Amount (₹)</Label>
                    <Input
                      type="number"
                      max={selectedPayment?.amount_inr}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="rounded-xl h-10"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">Max refundable amount: ₹{selectedPayment?.amount_inr}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Reason for Refund</Label>
                    <Input
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="e.g. Student requested cancellation"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <Button type="submit" disabled={processingRefund} className="w-full rounded-full bg-destructive text-white h-10 font-bold">
                    {processingRefund ? "Processing..." : "Confirm Refund"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        )}

        {/* COUPONS TAB */}
        {activeTab === "coupons" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-lg font-bold">Manage Coupons</h2>
              <Button
                onClick={() => setCouponDialogOpen(true)}
                className="rounded-full bg-gradient-brand text-white text-xs font-bold h-9 px-5 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Coupon
              </Button>
            </div>

            {/* Coupons Table */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 uppercase font-bold text-muted-foreground tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Min Purchase</th>
                    <th className="px-6 py-4">Uses</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {coupons.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/10">
                      <td className="px-6 py-4 font-mono font-bold text-foreground text-sm tracking-wider">{c.code}</td>
                      <td className="px-6 py-4">
                        {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                      </td>
                      <td className="px-6 py-4">₹{c.min_purchase}</td>
                      <td className="px-6 py-4 font-semibold">
                        {c.uses_count} / {c.max_uses}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                          c.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => toggleCouponStatus(c.id, c.status)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-8 text-[10px] cursor-pointer"
                        >
                          {c.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No coupon codes created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Coupon Create Dialog */}
            <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
              <DialogContent className="rounded-3xl border border-border/80 bg-card max-w-sm shadow-elevated">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-1.5"><Percent className="h-5 w-5 text-primary" /> Create Coupon Code</DialogTitle>
                  <DialogDescription className="text-xs">Generate promotional codes for students checkout.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCouponSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Coupon Code *</Label>
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CAMPUS20"
                      className="rounded-xl h-10 font-mono tracking-wider font-bold"
                      required
                    />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Discount Type</Label>
                      <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Discount Value *</Label>
                      <Input
                        type="number"
                        min="0.1"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="e.g. 20"
                        className="rounded-xl h-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Max Uses Limit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="rounded-xl h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Min Purchase (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={minPurchase}
                        onChange={(e) => setMinPurchase(e.target.value)}
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Expiry Date</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <Button type="submit" disabled={creatingCoupon} className="w-full rounded-full bg-gradient-brand text-white h-10 font-bold">
                    {creatingCoupon ? "Creating..." : "Save Coupon"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        )}

      </div>

    </div>
  );
}
