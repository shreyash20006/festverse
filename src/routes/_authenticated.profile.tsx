import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CampusConnect" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [prn, setPrn] = useState(profile?.prn ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [busy, setBusy] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ count: regs }, { count: attended }] = await Promise.all([
        supabase.from("registrations").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user!.id).not("checked_in_at", "is", null),
      ]);
      return { regs: regs ?? 0, attended: attended ?? 0 };
    },
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, prn: prn.toUpperCase() || null, phone: phone || null, department: department || null })
        .eq("id", user!.id);
      if (error) throw error;
      await refresh();
      qc.invalidateQueries({ queryKey: ["profile-stats"] });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-brand text-xl text-white">
              {(profile?.full_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {profile?.full_name ?? "Welcome"}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatCard label="Events registered" value={stats?.regs ?? 0} />
          <StatCard label="Events attended" value={stats?.attended ?? 0} />
        </div>

        <form onSubmit={save} className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Personal details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>PRN</Label>
              <Input value={prn} onChange={(e) => setPrn(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
          </div>
          <Button disabled={busy} className="mt-5 rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90">
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
