"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Award, Download, CheckCircle, ExternalLink, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Certificate } from "@/types/database";

interface Props {
  certificates: (Certificate & { events?: any })[];
  events: { id: string; title: string; certificate_required: boolean }[];
}

function exportCSV(data: any[]) {
  const headers = ["Certificate Code", "Student Name", "Event", "Issued At", "Verification Token"];
  const rows = data.map((c) => [c.certificate_code, c.full_name, c.event_title, formatDate(c.issued_at), c.verification_token]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificates-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminCertificatesClient({ certificates, events }: Props) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [issuing, setIssuing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const filtered = certificates.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.full_name.toLowerCase().includes(q) || c.certificate_code.toLowerCase().includes(q) || c.event_title.toLowerCase().includes(q);
    const matchEvent = eventFilter === "all" || c.event_id === eventFilter;
    return matchSearch && matchEvent;
  });

  const handleBulkIssue = async (eventId: string) => {
    if (!confirm("Issue certificates to all confirmed attendees of this event?")) return;
    setIssuing(true);
    try {
      // Get confirmed registrations for this event that don't have certs yet
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, user_id, full_name, event_id, events(title)")
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if (!regs || regs.length === 0) {
        toast({ title: "No eligible registrations found." });
        return;
      }

      // Get existing certs for this event
      const { data: existingCerts } = await supabase
        .from("certificates")
        .select("registration_id")
        .eq("event_id", eventId);

      const existingRegIds = new Set(existingCerts?.map((c) => c.registration_id));
      const toIssue = regs.filter((r) => !existingRegIds.has(r.id));

      if (toIssue.length === 0) {
        toast({ title: "All eligible students already have certificates." });
        return;
      }

      const inserts = toIssue.map((reg) => ({
        event_id: eventId,
        user_id: reg.user_id,
        registration_id: reg.id,
        certificate_code: `CERT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        verification_token: crypto.randomUUID(),
        full_name: reg.full_name,
        event_title: (reg as any).events?.title ?? "",
        issued_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("certificates").insert(inserts);
      if (error) throw error;

      toast({ title: `Issued ${inserts.length} certificate(s)!` });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Certificates</h1>
          <p className="text-sm text-muted-foreground">{certificates.length} issued</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors card-shadow"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Bulk Issue Panel */}
      {events.filter((e) => e.certificate_required).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Bulk Issue Certificates
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Issue participation certificates to all confirmed registrations for an event.
            </p>
            <div className="flex gap-3 flex-wrap">
              {events
                .filter((e) => e.certificate_required)
                .map((event) => (
                  <Button
                    key={event.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkIssue(event.id)}
                    disabled={issuing}
                    className="gap-2"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {event.title}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, code or event…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Award className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Certificate Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issued</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((cert, idx) => (
                  <motion.tr
                    key={cert.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{cert.certificate_code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{cert.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{cert.event_title}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(cert.issued_at)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/verify/${cert.verification_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Verify
                      </a>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
