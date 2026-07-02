"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, IndianRupee, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types/database";

interface Props {
  payments: (Payment & { events?: any })[];
  totalRevenue: number;
  successCount: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  success: { label: "Success", variant: "success" },
  created: { label: "Created", variant: "muted" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "muted" },
};

function exportCSV(data: any[]) {
  const headers = ["Provider Order ID", "Payment ID", "Event", "Amount", "Status", "Date"];
  const rows = data.map((p) => [
    p.provider_order_id ?? "",
    p.provider_payment_id ?? "",
    p.events?.title ?? "",
    p.amount_inr,
    p.status,
    formatDate(p.created_at),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminPaymentsClient({ payments, totalRevenue, successCount }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || (p.provider_order_id ?? "").toLowerCase().includes(q) || (p.provider_payment_id ?? "").toLowerCase().includes(q) || ((p as any).events?.title ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground">{payments.length} total transactions</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors card-shadow"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* KPI summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: IndianRupee, color: "#10B981" },
          { label: "Successful", value: successCount.toString(), icon: CheckCircle, color: "#10B981" },
          { label: "Failed", value: payments.filter((p) => p.status === "failed").length.toString(), icon: XCircle, color: "#EF4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order ID or event…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <IndianRupee className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No payments found.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((payment, idx) => {
                  const badge = STATUS_BADGE[payment.status] ?? STATUS_BADGE.pending;
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-foreground">{payment.provider_order_id ?? "—"}</p>
                        {payment.provider_payment_id && (
                          <p className="font-mono text-xs text-muted-foreground">{payment.provider_payment_id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{(payment as any).events?.title ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(payment.amount_inr)}</td>
                      <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(payment.created_at)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
