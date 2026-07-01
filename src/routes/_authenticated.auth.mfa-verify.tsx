import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, Key, Loader2, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { bypassMfaWithRecoveryCode } from "@/lib/auth-security.functions";

export const Route = createFileRoute("/_authenticated/auth/mfa-verify")({
  head: () => ({
    meta: [
      { title: "Multi-Factor Authentication Verification — FestVerse" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MfaVerifyPage,
});

function MfaVerifyPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [busy, setBusy] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const resetMfa = useServerFn(bypassMfaWithRecoveryCode);

  useEffect(() => {
    // List user factors to find the active verified factor
    const loadFactors = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        
        // Find the first verified TOTP factor
        const verifiedFactor = data?.all?.find(f => f.factorType === "totp" && f.status === "verified");
        if (verifiedFactor) {
          setActiveFactorId(verifiedFactor.id);
        } else {
          // No active factor found, check session assurance level
          const { data: mfaInfo } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (mfaInfo?.nextLevel === "aal1") {
            // No factor configured at all, they shouldn't be here
            navigate({ to: "/student", replace: true });
          }
        }
      } catch (err: any) {
        toast.error("Failed to load authentication factors: " + err.message);
      }
    };
    
    if (user) loadFactors();
  }, [user, navigate]);

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFactorId) {
      toast.error("No active authenticator app factor identified.");
      return;
    }
    if (code.length !== 6 || isNaN(Number(code))) {
      toast.error("Code must be 6 digits.");
      return;
    }

    setBusy(true);
    try {
      // Challenge
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: activeFactorId,
      });
      if (challengeErr) throw challengeErr;

      // Verify
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: activeFactorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;

      // Success! Refresh authentication context and navigate to dashboard
      await refresh();
      toast.success("Welcome back! Authentication complete.");
      
      // Determine landing page after successful MFA verification
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      const rolesList = (rolesData ?? []).map(r => r.role);
      
      if (rolesList.includes("super_admin")) {
        window.location.href = "/super-admin";
      } else if (rolesList.includes("college_admin") || rolesList.includes("organizer")) {
        window.location.href = "/admin";
      } else if (rolesList.includes("scanner")) {
        window.location.href = "/admin/scanner";
      } else {
        window.location.href = "/student";
      }
    } catch (err: any) {
      toast.error(err.message ?? "Verification failed. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = recoveryCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a recovery code.");
      return;
    }

    setBusy(true);
    try {
      const res = await resetMfa({ data: { code: cleanCode } });
      if (res.ok) {
        toast.success("Security reset successful. Multi-factor authentication is now disabled.");
        await refresh();
        
        // Disabling MFA logs the user out globally on Supabase's side, so we redirect them to signin
        setTimeout(() => {
          navigate({ to: "/auth", replace: true });
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Recovery code verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated transition-all duration-300">
        
        {mode === "totp" ? (
          <form onSubmit={verifyCode} className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
              <ShieldAlert className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
              <p className="text-sm text-muted-foreground">
                Please enter the 6-digit verification code from your authenticator app.
              </p>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="auth-code" className="text-xs font-semibold text-muted-foreground">Authenticator Code</Label>
              <Input
                id="auth-code"
                type="text"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 000000"
                className="rounded-xl h-11 text-center font-mono tracking-widest text-lg font-bold"
                required
                autoFocus
                disabled={busy || !activeFactorId}
              />
            </div>

            <Button
              type="submit"
              disabled={busy || code.length !== 6 || !activeFactorId}
              className="w-full rounded-full bg-gradient-brand text-white h-11 font-semibold shadow-glow cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify Code <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setMode("recovery")}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Lost your device? Use a backup recovery code
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={verifyRecovery} className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Key className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight">MFA Recovery Code</h1>
              <p className="text-xs text-muted-foreground">
                Enter one of your 10-character backup recovery codes to reset and disable MFA on your account.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-left">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-[11px] text-foreground/80 leading-relaxed font-semibold">
                Using a valid recovery code will permanently disable MFA for your account. You will need to re-enroll next time you log in if MFA is required for your role.
              </p>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="mfa-recovery" className="text-xs font-semibold text-muted-foreground">Backup Recovery Code</Label>
              <Input
                id="mfa-recovery"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="e.g. CC-1234-ABCD"
                className="rounded-xl h-11 text-center font-mono tracking-widest text-sm font-bold"
                required
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("totp")}
                className="w-1/2 rounded-full h-10 text-xs font-semibold cursor-pointer border border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !recoveryCode.trim()}
                className="w-1/2 rounded-full bg-destructive text-white hover:bg-destructive/90 h-10 text-xs font-semibold cursor-pointer shadow-glow-destructive"
              >
                {busy ? "Verifying..." : "Disable MFA"}
              </Button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
