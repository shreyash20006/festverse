import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useServerFn } from "@tanstack/react-start";
import { getUserLoginHistory } from "@/lib/auth-security.functions";
import { ShieldCheck, ShieldAlert, Key, LogOut, History, Copy, Check, Lock, Smartphone, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile & Security — FestVerse" }] }),
  component: ProfilePage,
});

// Helper to generate a random recovery code block (e.g. CC-12AB-34CD)
function generateRecoveryCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  const part2 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `CC-${part1}-${part2}`;
}

function ProfilePage() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [prn, setPrn] = useState(profile?.prn ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [busy, setBusy] = useState(false);

  // Security Modal / State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingCodes, setViewingCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const getHistory = useServerFn(getUserLoginHistory);

  // 1. Fetch Login History
  const { data: history = [] } = useQuery({
    queryKey: ["login-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return await getHistory();
    },
  });

  // 2. Fetch MFA Factors from Supabase
  const { data: mfaFactors, refetch: refetchMfa } = useQuery({
    queryKey: ["mfa-factors", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data ?? { all: [], active: [], totp: [] };
    },
  });

  const activeMfa = mfaFactors?.all?.find(
    (f) => f.factorType === "totp" && f.status === "verified"
  );

  // 3. Stats Query
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
        .update({
          full_name: fullName,
          prn: prn.toUpperCase() || null,
          phone: phone || null,
          department: department || null,
        })
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

  const handleDisableMfa = async () => {
    if (!activeMfa) return;
    if (
      !confirm(
        "Are you sure you want to disable Two-Factor Authentication? This will significantly lower your account security."
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeMfa.id,
      });
      if (error) throw error;

      // Clear recovery codes
      await supabase.auth.updateUser({
        data: { mfa_recovery_codes: null },
      });

      toast.success("Two-Factor Authentication has been disabled.");
      refetchMfa();
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to disable 2FA.");
    } finally {
      setBusy(false);
    }
  };

  const handleViewRecoveryCodes = () => {
    const codes = user?.user_metadata?.mfa_recovery_codes || [];
    if (codes.length === 0) {
      toast.error("No recovery codes are currently generated. Please regenerate them.");
      return;
    }
    setViewingCodes(codes);
    setDialogOpen(true);
  };

  const handleRegenerateCodes = async () => {
    if (!confirm("Regenerating recovery codes will invalidate all previously saved codes. Proceed?")) return;
    
    setBusy(true);
    try {
      const newCodes = Array.from({ length: 8 }, () => generateRecoveryCode());
      const { error } = await supabase.auth.updateUser({
        data: {
          mfa_recovery_codes: newCodes,
        },
      });
      if (error) throw error;
      
      setViewingCodes(newCodes);
      toast.success("Recovery codes regenerated!");
      setDialogOpen(true);
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to regenerate recovery codes.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(viewingCodes.join("\n"));
    setCopiedCodes(true);
    toast.success("Recovery codes copied.");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleSignOutAll = async () => {
    if (!confirm("Are you sure you want to sign out from all active devices? This will invalidate all active sessions.")) return;
    
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Successfully logged out from all devices.");
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message ?? "Failed to sign out globally.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6">
        
        {/* Avatar Header */}
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

        {/* Stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatCard label="Events registered" value={stats?.regs ?? 0} />
          <StatCard label="Events attended" value={stats?.attended ?? 0} />
        </div>

        {/* Personal Details Form */}
        <form onSubmit={save} className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/60 pb-2">
            Personal details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>PRN</Label>
              <Input value={prn} onChange={(e) => setPrn(e.target.value)} className="mt-1.5 rounded-xl" disabled />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1.5 rounded-xl" disabled />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
          </div>
          <Button disabled={busy} className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90 cursor-pointer">
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </form>

        {/* Security & MFA Settings */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 border-b border-border/60 pb-2">
            Security & Authentication
          </h2>

          {/* MFA Panel */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl border ${activeMfa ? "bg-success/15 border-success/30 text-success" : "bg-muted border-border text-muted-foreground"}`}>
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  Two-Factor Authentication (2FA)
                  {activeMfa && (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                      Enabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                  Protect your account with an Authenticator App code. Required for admin, volunteers, and organizers.
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 shrink-0">
              {activeMfa ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleViewRecoveryCodes}
                    className="rounded-full text-xs font-semibold cursor-pointer border-border hover:bg-muted"
                  >
                    <Key className="mr-1.5 h-3.5 w-3.5" /> View Codes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisableMfa}
                    disabled={busy}
                    className="rounded-full text-xs font-semibold hover:bg-destructive/10 hover:text-destructive border-border cursor-pointer"
                  >
                    Disable 2FA
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  className="rounded-full bg-primary text-white text-xs font-semibold shadow-glow cursor-pointer"
                >
                  <Link to="/auth/mfa-enroll">Enable 2FA</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Sessions Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">Session Controls</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/10 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-destructive uppercase">Global Sign Out</div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                  Lost your phone or left a session logged in elsewhere? Terminate all active logins across all devices immediately.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOutAll}
                className="rounded-full text-xs font-semibold hover:bg-destructive/15 text-destructive border-destructive/20 hover:border-destructive cursor-pointer shrink-0"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out All Devices
              </Button>
            </div>
          </div>

          {/* Login History */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <History className="h-4 w-4 text-muted-foreground" /> Recent Login Sessions
            </h3>
            
            <div className="overflow-hidden rounded-2xl border border-border bg-background/30">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/50 font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Location IP</th>
                      <th className="px-4 py-3">Device / Browser</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {history.map((log: any) => {
                      const ua = log.user_agent || "Unknown Browser";
                      const date = new Date(log.created_at).toLocaleString();
                      const method = log.metadata?.method === "google" ? "Google" : "Email OTP";
                      return (
                        <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold">{log.ip_address || "127.0.0.1"}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={ua}>{ua}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-muted border px-2 py-0.5 text-[9px] font-semibold">
                              {method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{date}</td>
                        </tr>
                      );
                    })}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          No recent login logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Recovery Codes Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-md shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <Key className="h-5 w-5 text-primary" /> Active Backup Recovery Codes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Copy these codes to a password manager. They can bypass MFA if you lose access to your device.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-2xl border border-border font-mono text-xs text-center font-bold my-2">
            {viewingCodes.map((code, idx) => (
              <div key={idx} className="bg-card p-2 rounded-xl border border-border/40 select-all">
                {code}
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={handleRegenerateCodes}
              disabled={busy}
              className="w-full sm:w-auto rounded-full text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" /> Regenerate Codes
            </Button>
            <Button
              onClick={handleCopyCodes}
              className="w-full sm:w-auto rounded-full bg-gradient-brand text-white text-xs font-semibold cursor-pointer shadow-glow ml-auto"
            >
              {copiedCodes ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copiedCodes ? "Copied" : "Copy All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
