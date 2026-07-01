import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Copy, Check, QrCode as QrIcon, AlertCircle, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/auth/mfa-enroll")({
  head: () => ({
    meta: [
      { title: `Enable Two-Factor Authentication — ${BRAND.appName}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MfaEnrollPage,
});

// Helper to generate a random recovery code block (e.g. CC-12AB-34CD)
function generateRecoveryCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  const part2 = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `CC-${part1}-${part2}`;
}

// Helper to compute SHA-256 hash using Web Crypto API on client side
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toUpperCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function MfaEnrollPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"intro" | "scan" | "verify" | "recovery">("intro");
  const [factorId, setFactorId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const startEnrollment = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: BRAND.appName,
        friendlyName: `${BRAND.appName} (${user?.email})`,
      });

      if (error) throw error;

      setFactorId(data.id);
      
      // If we got a TOTP URI, render it to PNG URL via qrcode library, otherwise fallback to qr_code string
      const totpUri = data.totp.qr_code;
      if (totpUri.startsWith("otpauth://")) {
        const qrUrl = await QRCode.toDataURL(totpUri);
        setQrCodeUrl(qrUrl);
      } else {
        setQrCodeUrl(totpUri); // svg string or fallback data url
      }
      
      setSecret(data.totp.secret);
      setStep("scan");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to initialize enrollment.");
    } finally {
      setBusy(false);
    }
  };

  const verifyFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || isNaN(Number(code))) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    setBusy(true);
    try {
      // 1. Challenge the newly created factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      // 2. Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      // 3. Generate 8 backup recovery codes
      const codes = Array.from({ length: 8 }, () => generateRecoveryCode());
      setRecoveryCodes(codes);

      // 4. Store plain recovery codes in user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          mfa_recovery_codes: codes,
        },
      });
      if (metaError) throw metaError;

      toast.success("MFA successfully enabled!");
      setStep("recovery");
    } catch (err: any) {
      toast.error(err.message ?? "MFA verification failed. Double check the code.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCodes = () => {
    const listText = recoveryCodes.join("\n");
    navigator.clipboard.writeText(listText);
    setCopiedCodes(true);
    toast.success("Recovery codes copied to clipboard.");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleFinish = async () => {
    await refresh();
    navigate({ to: "/student", replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-elevated transition-all duration-300">
        
        {step === "intro" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">Enable Two-Factor Authentication</h1>
              <p className="text-sm text-muted-foreground">
                Protect your account by requiring an authenticator code alongside your email OTP/Google login. Required for college administration.
              </p>
            </div>
            <Button
              onClick={startEnrollment}
              disabled={busy}
              className="w-full rounded-full bg-gradient-brand text-white h-11 font-semibold shadow-glow hover:opacity-90 cursor-pointer"
            >
              Set Up Authenticator App
            </Button>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight">Scan QR Code</h1>
              <p className="text-xs text-muted-foreground">
                Scan this QR code in your authenticator app (e.g. Google Authenticator, Authy, or Microsoft Authenticator).
              </p>
            </div>
            
            <div className="mx-auto border border-border/80 p-4 bg-white rounded-2xl w-48 h-48 flex items-center justify-center shadow-inner">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="TOTP QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrIcon className="h-20 w-20 text-muted-foreground animate-pulse" />
              )}
            </div>

            <div className="text-left space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Or enter key manually</Label>
              <div className="flex items-center gap-2 bg-muted p-2.5 rounded-xl border border-border">
                <span className="font-mono text-xs font-bold text-foreground break-all select-all flex-1">{secret}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast.success("Key copied to clipboard");
                  }}
                  className="p-1 hover:bg-card rounded-lg transition-colors"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep("intro")}
                className="w-1/2 rounded-full h-10 text-xs font-semibold cursor-pointer border border-border"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("verify")}
                className="w-1/2 rounded-full bg-gradient-brand text-white h-10 text-xs font-semibold cursor-pointer shadow-glow"
              >
                Next Step
              </Button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={verifyFactor} className="space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight">Verify Code</h1>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code displayed in your authenticator app to complete registration.
              </p>
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="mfa-code" className="text-xs font-semibold text-muted-foreground">Verification Code</Label>
              <Input
                id="mfa-code"
                type="text"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 123456"
                className="rounded-xl h-11 text-center font-mono tracking-widest text-lg font-bold"
                required
                autoFocus
                disabled={busy}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("scan")}
                className="w-1/2 rounded-full h-10 text-xs font-semibold cursor-pointer border border-border"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-1/2 rounded-full bg-gradient-brand text-white h-10 text-xs font-semibold cursor-pointer shadow-glow"
              >
                {busy ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          </form>
        )}

        {step === "recovery" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-success flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-6 w-6" /> MFA Enabled
              </h1>
              <p className="text-xs text-muted-foreground">
                Authenticator App linked successfully. Please save these backup recovery codes.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-[11px] text-foreground/80 leading-relaxed">
                If you lose your device or authenticator app, these codes can be used to bypass and reset your MFA. Each code works only **once**. Save them securely.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-2xl border border-border font-mono text-xs text-center font-bold">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="bg-card p-2 rounded-xl border border-border/40 select-all">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleCopyCodes}
                variant="outline"
                className="w-full rounded-full h-11 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4 text-success" /> Copied Codes
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4 text-muted-foreground" /> Copy Recovery Codes
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleFinish}
                className="w-full rounded-full bg-gradient-brand text-white h-11 font-semibold shadow-glow cursor-pointer"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
