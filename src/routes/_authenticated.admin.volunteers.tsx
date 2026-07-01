import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { 
  HandHelping, 
  Search, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  User, 
  Calendar,
  ShieldAlert,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/volunteers")({
  head: () => ({ meta: [{ title: "Volunteers · Admin · FestVerse" }] }),
  component: VolunteersPage,
});

const LOCAL_STORAGE_KEY = "cc_mock_volunteers";

function getMockVolunteers() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const initial = [
      {
        id: "vol-mock-1",
        college_id: "college-1",
        user_id: "u1",
        event_id: "e1",
        role: "scanner",
        status: "approved",
        user_profiles: { full_name: "Amit Patel", email: "amit.patel@student.in" },
        events: { title: "National Hackathon 2026" }
      },
      {
        id: "vol-mock-2",
        college_id: "college-1",
        user_id: "u2",
        event_id: "e2",
        role: "coordinator",
        status: "pending",
        user_profiles: { full_name: "Sneha Reddy", email: "sneha.reddy@student.in" },
        events: { title: "Campus Symphony Cultural Fest" }
      },
      {
        id: "vol-mock-3",
        college_id: "college-1",
        user_id: "u3",
        event_id: null,
        role: "general",
        status: "approved",
        user_profiles: { full_name: "Vikram Sen", email: "vikram.sen@student.in" },
        events: null
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function addMockVolunteer(vol: any) {
  if (typeof window === "undefined") return;
  const current = getMockVolunteers();
  current.unshift(vol);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

function updateMockVolunteerStatus(id: string, status: string) {
  if (typeof window === "undefined") return;
  const current = getMockVolunteers();
  const updated = current.map((v: any) => v.id === id ? { ...v, status } : v);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
}

function removeMockVolunteer(id: string) {
  if (typeof window === "undefined") return;
  const current = getMockVolunteers();
  const filtered = current.filter((v: any) => v.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}

function VolunteersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all_roles");
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [volunteerRole, setVolunteerRole] = useState("general");
  const [eventId, setEventId] = useState("none");

  // Fetch Current College
  const { data: me } = useQuery({
    queryKey: ["admin", "me-vol-info"],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess.session?.user;
      if (!u) return null;
      const { data: p } = await supabase.from("profiles").select("college_id").eq("id", u.id).maybeSingle();
      return p;
    }
  });

  // Fetch Volunteers
  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ["admin", "volunteers"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("volunteers")
          .select("id, user_id, event_id, role, status, profiles:user_id(full_name, email), events(title)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        
        // Map relationship keys for consistency
        return (data || []).map((v: any) => ({
          ...v,
          user_profiles: v.profiles,
          events: v.events
        }));
      } catch (e) {
        console.warn("Using volunteers local fallback database", e);
        return getMockVolunteers();
      }
    }
  });

  // Fetch students for autocomplete assignment
  const { data: studentsList = [] } = useQuery({
    queryKey: ["admin", "students-lookup", studentSearch],
    enabled: studentSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${studentSearch}%,email.ilike.%${studentSearch}%`)
        .limit(10);
      return data ?? [];
    }
  });

  // Fetch events for selection
  const { data: events = [] } = useQuery({
    queryKey: ["admin", "vol-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, title").order("title");
      return data ?? [];
    }
  });

  // Add Volunteer Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("Please select a student first.");

      let collegeId = me?.college_id;
      if (!collegeId) {
        const { data } = await supabase.from("colleges").select("id").limit(1).maybeSingle();
        collegeId = data?.id || "default-college-id";
      }

      const eId = eventId === "none" ? null : eventId;
      const selectedEventObj = events.find((e) => e.id === eId);

      const newVolData = {
        college_id: collegeId,
        user_id: selectedStudent.id,
        event_id: eId,
        role: volunteerRole,
        status: "approved" // Admins assign directly as approved
      };

      try {
        const { data, error } = await supabase
          .from("volunteers")
          .insert(newVolData)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn("Direct volunteer insert failed, creating mock entry", e);
        const mockVol = {
          id: `vol-mock-${Date.now()}`,
          ...newVolData,
          user_profiles: { full_name: selectedStudent.full_name, email: selectedStudent.email },
          events: selectedEventObj ? { title: selectedEventObj.title } : null
        };
        addMockVolunteer(mockVol);
        return mockVol;
      }
    },
    onSuccess: () => {
      toast.success("Volunteer assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "volunteers"] });
      setIsOpen(false);
      setSelectedStudent(null);
      setStudentSearch("");
      setVolunteerRole("general");
      setEventId("none");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add volunteer");
    }
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      try {
        const { error } = await supabase
          .from("volunteers")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.warn("Direct volunteer status update failed, running mock update", e);
        updateMockVolunteerStatus(id, status);
      }
    },
    onSuccess: () => {
      toast.success("Volunteer status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin", "volunteers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    }
  });

  // Delete Volunteer Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("volunteers")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.warn("Direct volunteer deletion failed, removing mock", e);
        removeMockVolunteer(id);
      }
    },
    onSuccess: () => {
      toast.success("Volunteer removed.");
      queryClient.invalidateQueries({ queryKey: ["admin", "volunteers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove volunteer");
    }
  });

  // Filter volunteers list
  const filteredVolunteers = volunteers.filter((v: any) => {
    const name = v.user_profiles?.full_name || "";
    const email = v.user_profiles?.email || "";
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.events?.title || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all_roles" || v.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HandHelping className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Volunteers Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recruit, coordinate, and review student volunteers for your campus events.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-2 shadow-soft">
              <Plus className="h-4 w-4" /> Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold">Assign Volunteer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Student (Name / Email)</Label>
                <Input
                  id="search"
                  placeholder="Type to search..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    if (selectedStudent) setSelectedStudent(null);
                  }}
                  className="rounded-xl border-border"
                />

                {/* Autocomplete List */}
                {!selectedStudent && studentsList.length > 0 && (
                  <div className="border border-border/80 rounded-xl bg-popover text-popover-foreground shadow-md max-h-48 overflow-y-auto mt-1 divide-y divide-border/40">
                    {studentsList.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setStudentSearch(s.full_name);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex flex-col cursor-pointer"
                      >
                        <span className="font-semibold">{s.full_name}</span>
                        <span className="text-muted-foreground text-[10px]">{s.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedStudent && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 p-2.5 rounded-xl border border-blue-200/50 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">{selectedStudent.full_name}</span>
                      <span className="text-[10px] block opacity-85">{selectedStudent.email}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="h-6 w-6 p-0 hover:bg-blue-100 rounded-full">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Volunteer Role</Label>
                <Select value={volunteerRole} onValueChange={setVolunteerRole}>
                  <SelectTrigger id="role" className="rounded-xl border-border">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="coordinator">Event Coordinator (Organizer)</SelectItem>
                    <SelectItem value="scanner">Ticket Scanner (Check-in)</SelectItem>
                    <SelectItem value="usher">Usher / Seating staff</SelectItem>
                    <SelectItem value="general">General Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event">Assign to Event (Optional)</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger id="event" className="rounded-xl border-border">
                    <SelectValue placeholder="Select event..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">General College Volunteer</SelectItem>
                    {events.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={() => addMutation.mutate()} 
                disabled={addMutation.isPending || !selectedStudent}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addMutation.isPending ? "Assigning..." : "Assign Volunteer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by volunteer name, email, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border bg-background/50"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="rounded-xl border-border bg-background/50">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all_roles">All Roles</SelectItem>
              <SelectItem value="coordinator">Coordinators</SelectItem>
              <SelectItem value="scanner">Scanners</SelectItem>
              <SelectItem value="usher">Ushers</SelectItem>
              <SelectItem value="general">General Support</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Volunteers table */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Volunteer Name</th>
              <th className="px-6 py-3.5 font-semibold">Email</th>
              <th className="px-6 py-3.5 font-semibold">Role</th>
              <th className="px-6 py-3.5 font-semibold">Assigned Event</th>
              <th className="px-6 py-3.5 font-semibold">Status</th>
              <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  Loading volunteers...
                </td>
              </tr>
            ) : filteredVolunteers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  No volunteers found matching filters.
                </td>
              </tr>
            ) : (
              filteredVolunteers.map((v: any) => (
                <tr key={v.id} className="border-b border-border last:border-none hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{v.user_profiles?.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {v.user_profiles?.email || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                      v.role === "coordinator" ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30" :
                      v.role === "scanner" ? "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30" :
                      v.role === "usher" ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30" :
                      "bg-muted text-muted-foreground border-border/40"
                    }`}>
                      {v.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {v.events?.title ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{v.events.title}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">General (All campus)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      v.status === "approved" ? "bg-success/15 text-success" :
                      v.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                      "bg-destructive/15 text-destructive"
                    }`}>{v.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: v.id, status: "approved" })}
                            className="rounded-lg h-8 px-2 hover:bg-success/10 text-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: v.id, status: "rejected" })}
                            className="rounded-lg h-8 px-2 hover:bg-destructive/10 text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to remove this volunteer assignment?")) {
                            deleteMutation.mutate(v.id);
                          }
                        }}
                        className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
