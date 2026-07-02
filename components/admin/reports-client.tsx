"use client";

import { useState } from "react";
import { Download, FileText, Users, IndianRupee, Calendar, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Props {
  registrations: any[];
  payments: any[];
  attendance: any[];
  certificates: any[];
  events: any[];
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminReportsClient({ registrations, payments, attendance, certificates, events }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const generateReport = (type: string) => {
    setLoading(type);
    try {
      if (type === "registrations") {
        const headers = ["Name", "Email", "PRN", "Department", "Event", "Status", "Amount Paid", "Registered On"];
        const rows = registrations.map((r) => [r.full_name, r.email, r.prn ?? "", r.department ?? "", r.events?.title ?? "", r.status, r.amount_paid > 0 ? r.amount_paid : "Free", formatDate(r.created_at)]);
        downloadCSV([headers, ...rows], "registrations-report");
      } else if (type === "payments") {
        const headers = ["Order ID", "Payment ID", "Event", "Amount (INR)", "Status", "Date"];
        const rows = payments.map((p) => [p.provider_order_id ?? "", p.provider_payment_id ?? "", p.events?.title ?? "", p.amount_inr, p.status, formatDate(p.created_at)]);
        downloadCSV([headers, ...rows], "payments-report");
      } else if (type === "attendance") {
        const headers = ["Ticket Code", "Student", "Event", "Check-In Time", "Scan Method", "Scanned By"];
        const rows = attendance.map((a) => [a.tickets?.ticket_code ?? "", a.tickets?.registrations?.full_name ?? "", a.events?.title ?? "", formatDate(a.scanned_at), a.scan_method ?? "", a.scanned_by ?? ""]);
        downloadCSV([headers, ...rows], "attendance-report");
      } else if (type === "certificates") {
        const headers = ["Certificate Code", "Student Name", "Event", "Issued At", "Verification Token"];
        const rows = certificates.map((c) => [c.certificate_code, c.full_name, c.event_title, formatDate(c.issued_at), c.verification_token]);
        downloadCSV([headers, ...rows], "certificates-report");
      } else if (type === "events") {
        const headers = ["Title", "Category", "Status", "Start Date", "Venue", "Registrations", "Capacity", "Price"];
        const rows = events.map((e) => [e.title, e.category, e.status, formatDate(e.start_at), e.venue ?? "", e.registrations ?? 0, e.capacity ?? "Unlimited", e.is_paid ? formatCurrency(e.price_inr) : "Free"]);
        downloadCSV([headers, ...rows], "events-report");
      }
    } finally {
      setLoading(null);
    }
  };

  const REPORTS = [
    { type: "registrations", label: "Registrations Report", description: "All student registrations with status and payment info.", icon: Users, color: "#7C3AED", count: registrations.length },
    { type: "payments", label: "Payments Report", description: "All Razorpay transactions with order and payment IDs.", icon: IndianRupee, color: "#10B981", count: payments.length },
    { type: "attendance", label: "Attendance Report", description: "Gate check-in log for all events.", icon: Calendar, color: "#F59E0B", count: attendance.length },
    { type: "certificates", label: "Certificates Report", description: "All issued certificates with verification tokens.", icon: Award, color: "#3B82F6", count: certificates.length },
    { type: "events", label: "Events Summary", description: "All events with registration counts and revenue.", icon: FileText, color: "#FF6B35", count: events.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Download data exports as CSV files.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map(({ type, label, description, icon: Icon, color, count }) => (
          <Card key={type} className="hover:card-shadow-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <span className="text-sm font-bold text-muted-foreground">{count} records</span>
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">{label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              <Button
                onClick={() => generateReport(type)}
                disabled={loading === type}
                variant="outline"
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                {loading === type ? "Generating…" : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
