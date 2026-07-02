"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, Clock, XCircle, Download, Calendar, MapPin, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, EVENT_CATEGORIES } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Registration } from "@/types/database";

interface Props {
  registrations: (Registration & { events?: any })[];
  events: { id: string; title: string }[];
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  confirmed: { label: "Confirmed", variant: "success" },
  pending_payment: { label: "Pending", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "muted" },
};

function exportCSV(data: any[]) {
  const headers = ["Name", "Email", "PRN", "Department", "Event", "Status", "Amount", "Date"];
  const rows = data.map((r) => [
    r.full_name,
    r.email,
    r.prn ?? "",
    r.department ?? "",
    r.events?.title ?? "",
    r.status,
    r.amount_paid,
    formatDate(r.created_at),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminRegistrationsClient({ registrations, events }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.prn ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchEvent = eventFilter === "all" || r.event_id === eventFilter;
    return matchSearch && matchStatus && matchEvent;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Registrations</h1>
          <p className="text-sm text-muted-foreground">{registrations.length} total registrations</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors card-shadow"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Confirmed", status: "confirmed", color: "text-success" },
          { label: "Pending", status: "pending_payment", color: "text-warning" },
          { label: "Cancelled", status: "cancelled", color: "text-destructive" },
        ].map(({ label, status, color }) => {
          const count = registrations.filter((r) => r.status === status).length;
          return (
            <div key={status} className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 card-shadow">
              <span className={`text-lg font-bold ${color}`}>{count}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, PRN…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No registrations match your filters.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((reg, idx) => {
                  const badge = STATUS_BADGE[reg.status] ?? STATUS_BADGE.confirmed;
                  return (
                    <motion.tr
                      key={reg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{reg.full_name}</p>
                          <p className="text-xs text-muted-foreground">{reg.email}</p>
                          {reg.prn && <p className="text-xs text-muted-foreground font-mono">PRN: {reg.prn}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[200px]">{(reg as any).events?.title ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{reg.department ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {reg.amount_paid > 0 ? formatCurrency(reg.amount_paid) : <span className="text-success font-semibold">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(reg.created_at)}</td>
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
