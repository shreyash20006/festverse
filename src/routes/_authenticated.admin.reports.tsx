import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { 
  FileBarChart, 
  Download, 
  Calendar, 
  Users, 
  CreditCard, 
  CheckSquare, 
  FileSpreadsheet,
  Filter,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Admin · CampusConnect" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [reportType, setReportType] = useState("registrations");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Fetch events list for dropdown
  const { data: events = [] } = useQuery({
    queryKey: ["admin", "reports-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title").order("title");
      return data ?? [];
    }
  });

  // Fetch summary metrics
  const { data: metrics = { regs: 0, revenue: 0, attendance: 0, activeEvents: 0 } } = useQuery({
    queryKey: ["admin", "reports-metrics"],
    queryFn: async () => {
      // 1. Total registrations
      const { count: regsCount } = await supabase.from("registrations").select("*", { count: "exact", head: true });
      
      // 2. Total revenue (sum of payments with success status)
      const { data: payments } = await supabase.from("payments").select("amount_inr").eq("status", "success");
      const totalRev = (payments || []).reduce((sum, p) => sum + Number(p.amount_inr), 0);

      // 3. Checked-in attendance
      const { count: attendanceCount } = await supabase.from("attendance").select("*", { count: "exact", head: true });

      // 4. Active/Published events
      const { count: eventsCount } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published");

      return {
        regs: regsCount ?? 0,
        revenue: totalRev,
        attendance: attendanceCount ?? 0,
        activeEvents: eventsCount ?? 0
      };
    }
  });

  // Handle generating preview
  const handleGeneratePreview = async () => {
    setIsPreviewLoading(true);
    try {
      if (reportType === "registrations") {
        let query = supabase
          .from("registrations")
          .select("id, full_name, prn, email, phone, status, amount_paid, created_at, events(title)")
          .order("created_at", { ascending: false });
        
        if (selectedEventId !== "all") {
          query = query.eq("event_id", selectedEventId);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;
        setPreviewData(data || []);
      } 
      
      else if (reportType === "revenue") {
        let query = supabase
          .from("payments")
          .select("id, amount_inr, status, provider_code, created_at, events(title)")
          .order("created_at", { ascending: false });

        if (selectedEventId !== "all") {
          query = query.eq("event_id", selectedEventId);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;
        setPreviewData(data || []);
      } 
      
      else if (reportType === "attendance") {
        let query = supabase
          .from("attendance")
          .select("id, scanned_at, scan_method, ticket_id, user_id, events(title)")
          .order("scanned_at", { ascending: false });

        if (selectedEventId !== "all") {
          query = query.eq("event_id", selectedEventId);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;

        // Fetch profiles separately for users if needed, or map cleanly
        const mapped = await Promise.all((data || []).map(async (a: any) => {
          const { data: prof } = await supabase.from("profiles").select("full_name, prn").eq("id", a.user_id).maybeSingle();
          return {
            id: a.id,
            scanned_at: a.scanned_at,
            scan_method: a.scan_method,
            event_title: a.events?.title || "—",
            student_name: prof?.full_name || "—",
            prn: prof?.prn || "—"
          };
        }));
        setPreviewData(mapped);
      }
      
      else if (reportType === "volunteers") {
        // Fetch from volunteers table (with localStorage fallback check)
        try {
          let query = supabase
            .from("volunteers")
            .select("id, role, status, created_at, profiles:user_id(full_name, email), events(title)")
            .order("created_at", { ascending: false });
          
          if (selectedEventId !== "all") {
            query = query.eq("event_id", selectedEventId);
          }

          const { data, error } = await query;
          if (error) throw error;
          setPreviewData((data || []).map((v: any) => ({
            id: v.id,
            role: v.role,
            status: v.status,
            created_at: v.created_at,
            full_name: v.profiles?.full_name || "—",
            email: v.profiles?.email || "—",
            event_title: v.events?.title || "General"
          })));
        } catch {
          // localStorage fallback
          const stored = localStorage.getItem("cc_mock_volunteers");
          const vList = stored ? JSON.parse(stored) : [];
          const filtered = vList.filter((v: any) => selectedEventId === "all" || v.event_id === selectedEventId);
          setPreviewData(filtered.map((v: any) => ({
            id: v.id,
            role: v.role,
            status: v.status,
            created_at: v.created_at || new Date().toISOString(),
            full_name: v.user_profiles?.full_name || "—",
            email: v.user_profiles?.email || "—",
            event_title: v.events?.title || "General"
          })));
        }
      }
      toast.success("Report preview generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to load report data");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Convert array of objects to CSV download
  const handleExportCSV = () => {
    if (previewData.length === 0) {
      toast.error("Please generate a report preview first.");
      return;
    }

    let csvContent = "";
    
    // Define headers based on report type
    if (reportType === "registrations") {
      const headers = ["Name", "PRN", "Email", "Phone", "Event", "Status", "Amount Paid", "Registration Date"];
      csvContent += headers.join(",") + "\n";
      previewData.forEach((r: any) => {
        const row = [
          `"${r.full_name}"`,
          `"${r.prn || ""}"`,
          `"${r.email}"`,
          `"${r.phone || ""}"`,
          `"${r.events?.title || ""}"`,
          `"${r.status}"`,
          `"${r.amount_paid}"`,
          `"${new Date(r.created_at).toLocaleDateString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } 
    
    else if (reportType === "revenue") {
      const headers = ["Payment ID", "Event", "Provider", "Amount INR", "Status", "Date"];
      csvContent += headers.join(",") + "\n";
      previewData.forEach((p: any) => {
        const row = [
          `"${p.id}"`,
          `"${p.events?.title || ""}"`,
          `"${p.provider_code || ""}"`,
          `"${p.amount_inr}"`,
          `"${p.status}"`,
          `"${new Date(p.created_at).toLocaleDateString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } 
    
    else if (reportType === "attendance") {
      const headers = ["Student Name", "PRN", "Event Name", "Scan Method", "Scanned At"];
      csvContent += headers.join(",") + "\n";
      previewData.forEach((a: any) => {
        const row = [
          `"${a.student_name}"`,
          `"${a.prn}"`,
          `"${a.event_title}"`,
          `"${a.scan_method}"`,
          `"${new Date(a.scanned_at).toLocaleString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }
    
    else if (reportType === "volunteers") {
      const headers = ["Volunteer Name", "Email", "Role", "Event Title", "Status", "Assigned Date"];
      csvContent += headers.join(",") + "\n";
      previewData.forEach((v: any) => {
        const row = [
          `"${v.full_name}"`,
          `"${v.email}"`,
          `"${v.role}"`,
          `"${v.event_title}"`,
          `"${v.status}"`,
          `"${new Date(v.created_at).toLocaleDateString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `campusconnect_report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export downloaded!");
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileBarChart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Reports Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View analytics dashboards, summarize event registrations, and export CSV reports.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Total Registrations</span>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black">{metrics.regs.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> Growth</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Revenue Generated</span>
            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black">₹{metrics.revenue.toLocaleString("en-IN")}</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100">Live</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Scanned Attendees</span>
            <CheckSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black">{metrics.attendance.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-medium">check-ins</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Active Events</span>
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black">{metrics.activeEvents}</span>
            <span className="text-xs text-muted-foreground font-medium">published</span>
          </div>
        </div>
      </div>

      {/* Report Generator Controls */}
      <div className="mt-10 p-6 rounded-3xl border border-border bg-card/60 backdrop-blur-md shadow-card">
        <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Report Configuration
        </h2>
        <div className="grid gap-6 md:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={(val) => {
              setReportType(val);
              setPreviewData([]);
            }}>
              <SelectTrigger id="report-type" className="rounded-xl border-border bg-background/50">
                <SelectValue placeholder="Choose report type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="registrations">Event Registrations</SelectItem>
                <SelectItem value="revenue">Payments & Revenues</SelectItem>
                <SelectItem value="attendance">Student Attendance Logs</SelectItem>
                <SelectItem value="volunteers">Volunteers registry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-filter">Target Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger id="event-filter" className="rounded-xl border-border bg-background/50">
                <SelectValue placeholder="Choose event" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Events</SelectItem>
                {events.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleGeneratePreview}
              disabled={isPreviewLoading}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isPreviewLoading ? "Generating..." : "Generate Preview"}
            </Button>
            <Button 
              onClick={handleExportCSV}
              disabled={previewData.length === 0}
              variant="outline"
              className="rounded-xl font-semibold gap-1.5 border-border"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="mt-8">
        <h3 className="font-display text-md font-bold text-foreground mb-4 flex items-center gap-1.5">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" /> Report Data Preview
        </h3>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {reportType === "registrations" ? (
                <tr>
                  <th className="px-6 py-3">Registrant Name</th>
                  <th className="px-6 py-3">PRN</th>
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Amount Paid</th>
                </tr>
              ) : reportType === "revenue" ? (
                <tr>
                  <th className="px-6 py-3">Payment ID</th>
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">Provider</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              ) : reportType === "attendance" ? (
                <tr>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">PRN</th>
                  <th className="px-6 py-3">Event Name</th>
                  <th className="px-6 py-3">Scan Method</th>
                  <th className="px-6 py-3">Scanned At</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3">Volunteer Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Assigned Event</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    No data to preview. Choose filters and click "Generate Preview".
                  </td>
                </tr>
              ) : (
                previewData.map((d: any, idx: number) => {
                  if (reportType === "registrations") {
                    return (
                      <tr key={d.id || idx} className="border-b border-border last:border-none hover:bg-muted/30">
                        <td className="px-6 py-3.5 font-semibold text-foreground">{d.full_name}</td>
                        <td className="px-6 py-3.5 font-mono text-xs">{d.prn || "—"}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{d.events?.title}</td>
                        <td className="px-6 py-3.5 capitalize">{d.status}</td>
                        <td className="px-6 py-3.5 font-medium">₹{d.amount_paid}</td>
                      </tr>
                    );
                  } else if (reportType === "revenue") {
                    return (
                      <tr key={d.id || idx} className="border-b border-border last:border-none hover:bg-muted/30">
                        <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{d.id}</td>
                        <td className="px-6 py-3.5 text-foreground font-semibold">{d.events?.title || "—"}</td>
                        <td className="px-6 py-3.5 capitalize">{d.provider_code}</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">₹{d.amount_inr}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            d.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          }`}>{d.status}</span>
                        </td>
                      </tr>
                    );
                  } else if (reportType === "attendance") {
                    return (
                      <tr key={d.id || idx} className="border-b border-border last:border-none hover:bg-muted/30">
                        <td className="px-6 py-3.5 text-foreground font-semibold">{d.student_name}</td>
                        <td className="px-6 py-3.5 font-mono text-xs">{d.prn}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{d.event_title}</td>
                        <td className="px-6 py-3.5 uppercase text-xs">{d.scan_method}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{new Date(d.scanned_at).toLocaleString()}</td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={d.id || idx} className="border-b border-border last:border-none hover:bg-muted/30">
                        <td className="px-6 py-3.5 text-foreground font-semibold">{d.full_name}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{d.email}</td>
                        <td className="px-6 py-3.5 capitalize font-medium">{d.role}</td>
                        <td className="px-6 py-3.5 text-muted-foreground">{d.event_title}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            d.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20" : "bg-amber-100 text-amber-700"
                          }`}>{d.status}</span>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
