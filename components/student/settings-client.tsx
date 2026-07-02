"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, Shield, Bell, Moon, GraduationCap, AlertTriangle } from "lucide-react";

interface Props {
  profile: any;
  userId: string;
  userEmail: string;
}

export function StudentSettingsClient({ profile, userId, userEmail }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    setLoading("signout");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone. Your registrations and tickets will be preserved for admin records.")) return;
    const confirmText = prompt('Type "DELETE" to confirm:');
    if (confirmText !== "DELETE") return;

    setLoading("delete");
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(null);
    }
  };

  const handleReverifyPRN = () => {
    router.push("/verify-prn");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
            <span className="text-xs bg-muted text-muted-foreground rounded-lg px-2.5 py-1">via Google</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">PRN</p>
              <p className="text-sm text-muted-foreground font-mono">{profile?.prn ?? "Not verified"}</p>
            </div>
            {!profile?.prn && (
              <Button variant="outline" size="sm" onClick={handleReverifyPRN} className="gap-2">
                <GraduationCap className="h-3.5 w-3.5" /> Verify PRN
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Registration confirmations", desc: "When your registration is confirmed" },
              { label: "Event reminders", desc: "24h before an event you're registered for" },
              { label: "Certificate availability", desc: "When your certificate is ready to download" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <span className="text-xs text-muted-foreground italic">In-app only</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground">Sign out of your account on this device.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={loading === "signout"}
              className="gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loading === "signout" ? "Signing out…" : "Sign Out"}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your profile. Registrations are retained.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={loading === "delete"}
              className="gap-2 border-destructive/40 text-destructive hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {loading === "delete" ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
