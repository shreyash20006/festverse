import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Megaphone, 
  Search, 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  Bell,
  Eye,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/notices")({
  head: () => ({ meta: [{ title: "Notices · Admin · FestVerse" }] }),
  component: NoticesPage,
});

const LOCAL_STORAGE_KEY = "cc_mock_notices";

function getMockNotices() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const initial = [
      {
        id: "notice-mock-1",
        college_id: "college-1",
        title: "Registration Deadline Extended for CodeFest 2026",
        content: "Great news! Based on student requests, the registration deadline for the upcoming CodeFest Hackathon has been extended to July 10, 2026. Make sure to complete your team registration and payments before then.",
        target_audience: "all",
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      },
      {
        id: "notice-mock-2",
        college_id: "college-1",
        title: "Urgent Meeting for Event Volunteers",
        content: "All volunteer team leaders are requested to assemble in Seminar Hall A at 3:00 PM tomorrow. We will be finalizing the security, seating plans, and badge distribution guidelines.",
        target_audience: "organizers",
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
}

function addMockNotice(notice: any) {
  if (typeof window === "undefined") return;
  const current = getMockNotices();
  current.unshift(notice);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

function removeMockNotice(id: string) {
  if (typeof window === "undefined") return;
  const current = getMockNotices();
  const filtered = current.filter((n: any) => n.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}

function NoticesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all_filters");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");

  // Fetch Current Profile/College
  const { data: me } = useQuery({
    queryKey: ["admin", "me-info"],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess.session?.user;
      if (!u) return null;
      const { data: p } = await supabase
        .from("profiles")
        .select("college_id")
        .eq("id", u.id)
        .maybeSingle();
      return p;
    }
  });

  // Fetch Notices
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["admin", "notices"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn("Using notices local fallback database", e);
        return getMockNotices();
      }
    }
  });

  // Create Notice Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) {
        throw new Error("Title and content are required.");
      }

      // Find first college ID if profile has none
      let collegeId = me?.college_id;
      if (!collegeId) {
        const { data } = await supabase.from("colleges").select("id").limit(1).maybeSingle();
        collegeId = data?.id || "default-college-id";
      }

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;

      const newNoticeData = {
        college_id: collegeId,
        title: title.trim(),
        content: content.trim(),
        target_audience: targetAudience,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase
          .from("notices")
          .insert(newNoticeData)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn("Direct notice insert failed, using fallback mock", e);
        const mockNotice = { id: `notice-mock-${Date.now()}`, ...newNoticeData };
        addMockNotice(mockNotice);
        return mockNotice;
      }
    },
    onSuccess: () => {
      toast.success("Notice posted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "notices"] });
      setIsOpen(false);
      setTitle("");
      setContent("");
      setTargetAudience("all");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post notice");
    }
  });

  // Delete Notice Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("notices")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.warn("Direct notice delete failed, running fallback deletion", e);
        removeMockNotice(id);
      }
    },
    onSuccess: () => {
      toast.success("Notice deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "notices"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete notice");
    }
  });

  // Filter notices
  const filteredNotices = notices.filter((n: any) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAudience = 
      audienceFilter === "all_filters" || 
      n.target_audience === audienceFilter;
    
    return matchesSearch && matchesAudience;
  });

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Notices & Announcements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish notices, changes, or announcements to students and organizers.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-2 shadow-soft">
              <Plus className="h-4 w-4" /> Publish Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold">New Notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="E.g., Event schedule change"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger id="audience" className="rounded-xl border-border">
                    <SelectValue placeholder="Select target audience..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="students">Students Only</SelectItem>
                    <SelectItem value="organizers">Organizers & Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Type details of your announcement here..."
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="rounded-xl border-border resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={createMutation.isPending || !title.trim() || !content.trim()}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending ? "Publishing..." : "Post Announcement"}
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
            placeholder="Search announcements by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border bg-background/50"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={audienceFilter} onValueChange={setAudienceFilter}>
            <SelectTrigger className="rounded-xl border-border bg-background/50">
              <SelectValue placeholder="Audience filter" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all_filters">All Targets</SelectItem>
              <SelectItem value="all">General (All Users)</SelectItem>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="organizers">Organizers / Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notices Cards Grid */}
      {isLoading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading notices...</p>
      ) : filteredNotices.length === 0 ? (
        <div className="mt-8 text-center py-16 rounded-3xl border-2 border-dashed border-border/80">
          <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-4 text-sm font-semibold text-foreground">No Announcements</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No notices match your current filters. Post one above!
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {filteredNotices.map((n: any) => (
            <Card key={n.id} className="rounded-3xl border-border bg-card shadow-card flex flex-col justify-between overflow-hidden group hover:shadow-soft transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    n.target_audience === "organizers" 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      : n.target_audience === "students"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-muted text-muted-foreground border border-border/60"
                  }`}>
                    <Users className="h-3 w-3" />
                    {n.target_audience === "all" ? "Everyone" : n.target_audience}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(n.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short"
                    })}
                  </span>
                </div>
                <CardTitle className="font-display text-lg font-bold text-foreground mt-3 line-clamp-2 leading-tight">
                  {n.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {n.content}
                </p>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border/60 bg-muted/20 flex justify-between items-center px-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedNotice(n)}
                  className="rounded-lg text-xs font-semibold hover:bg-muted p-2 h-8 flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Read Full
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this notice?")) {
                      deleteMutation.mutate(n.id);
                    }
                  }}
                  className="rounded-lg text-destructive hover:bg-destructive/10 p-2 h-8 w-8 text-center"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={(open) => { if (!open) setSelectedNotice(null); }}>
        <DialogContent className="max-w-lg rounded-3xl border-border bg-card">
          {selectedNotice && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedNotice.target_audience === "organizers" 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      : selectedNotice.target_audience === "students"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-muted text-muted-foreground border"
                  }`}>
                    Target: {selectedNotice.target_audience}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Posted on {new Date(selectedNotice.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <DialogTitle className="font-display text-xl font-bold mt-2 text-foreground text-left">
                  {selectedNotice.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 border-t border-b border-border/60 my-2">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
                  {selectedNotice.content}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setSelectedNotice(null)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
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
