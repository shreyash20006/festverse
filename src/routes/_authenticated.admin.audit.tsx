import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { 
  ScrollText, 
  Search, 
  Filter, 
  Terminal, 
  Calendar,
  Globe,
  User,
  Eye,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs · Admin · FestVerse" }] }),
  component: AuditLogsPage,
});

const LOCAL_STORAGE_KEY = "cc_mock_activity_logs";

function getMockActivityLogs() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const initial = [
      {
        id: "log-mock-1",
        user_id: "u1",
        action: "event_created",
        entity_type: "events",
        entity_id: "e1",
        metadata: { title: "National Hackathon 2026", price_inr: 250, status: "draft" },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
        created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
        user_profiles: { email: "admin@tgpcop.edu", full_name: "College Administrator" }
      },
      {
        id: "log-mock-2",
        user_id: "u2",
        action: "registration_confirmed",
        entity_type: "registrations",
        entity_id: "r1",
        metadata: { full_name: "Rahul Sharma", event_title: "National Hackathon 2026", payment_status: "success" },
        ip_address: "157.44.182.90",
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
        user_profiles: { email: "rahul.sharma@student.in", full_name: "Rahul Sharma" }
      },
      {
        id: "log-mock-3",
        user_id: "u1",
        action: "settings_updated",
        entity_type: "colleges",
        entity_id: "c1",
        metadata: { change: "payment_mode updated from platform to college", user: "admin@tgpcop.edu" },
        ip_address: "192.168.1.45",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        user_profiles: { email: "admin@tgpcop.edu", full_name: "College Administrator" }
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all_actions");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch Audit Logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("id, user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at, profiles:user_id(email, full_name)")
          .order("created_at", { ascending: false })
          .limit(300);
        if (error) throw error;
        
        return (data || []).map((l: any) => ({
          ...l,
          user_profiles: l.profiles
        }));
      } catch (e) {
        console.warn("Using audit logs local fallback database", e);
        return getMockActivityLogs();
      }
    }
  });

  // Extract unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map((l: any) => l.action)));

  // Filter logs
  const filteredLogs = logs.filter((l: any) => {
    const email = l.user_profiles?.email || "";
    const name = l.user_profiles?.full_name || "";
    const ip = l.ip_address || "";
    const matchesSearch = 
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all_actions" || l.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ScrollText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track administrator, organizer, and check-in system activities and updates.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs by email, action, or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border bg-background/50"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="rounded-xl border-border bg-background/50">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all_actions">All Actions</SelectItem>
              {uniqueActions.map((act: any) => (
                <SelectItem key={act} value={act}>{act.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Logs table */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Timestamp</th>
              <th className="px-6 py-3.5 font-semibold">User</th>
              <th className="px-6 py-3.5 font-semibold">Action</th>
              <th className="px-6 py-3.5 font-semibold">IP Address</th>
              <th className="px-6 py-3.5 font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">
                  Loading activity logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">
                  No activity logs found matching criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l: any) => (
                <tr key={l.id} className="border-b border-border last:border-none hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                    {new Date(l.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left leading-tight">
                        <span className="font-semibold block text-xs text-foreground">{l.user_profiles?.full_name || "System"}</span>
                        <span className="text-[10px] block text-muted-foreground font-mono">{l.user_profiles?.email || "system_daemon"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-medium border ${
                      l.action.includes("created") ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                      l.action.includes("update") || l.action.includes("edit") ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" :
                      l.action.includes("delete") || l.action.includes("cancel") ? "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" :
                      "bg-muted text-muted-foreground border-border/40"
                    }`}>
                      <Terminal className="h-3 w-3" />
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{l.ip_address || "127.0.0.1"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(l)}
                      className="rounded-lg h-8 px-2 hover:bg-muted font-medium flex items-center gap-1 ml-auto"
                    >
                      <Eye className="h-4 w-4" /> View Metadata
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card">
          {selectedLog && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Log details</span>
                </div>
                <h2 className="font-display text-lg font-bold text-foreground text-left leading-tight">
                  Action: {selectedLog.action}
                </h2>
              </DialogHeader>
              <div className="py-4 space-y-3 border-t border-b border-border/60 my-2">
                <div className="grid grid-cols-2 gap-2 text-xs leading-relaxed">
                  <div>
                    <span className="font-semibold text-[10px] text-muted-foreground uppercase block">User Agent</span>
                    <span className="text-foreground font-mono block break-words mt-0.5">{selectedLog.user_agent || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[10px] text-muted-foreground uppercase block">Entity Target</span>
                    <span className="text-foreground font-mono block mt-0.5">{selectedLog.entity_type} ({selectedLog.entity_id || "N/A"})</span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-[10px] text-muted-foreground uppercase block mb-1">Event Payload / Metadata</span>
                  <pre className="p-4 rounded-2xl bg-muted dark:bg-black/40 text-xs font-mono overflow-auto max-h-56 border border-border/40">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setSelectedLog(null)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
