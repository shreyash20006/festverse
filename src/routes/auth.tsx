import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { Mail, ArrowRight, Calendar, Loader2, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { logUserLoginEvent } from "@/lib/auth-security.functions";

const SearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — CampusConnect" },
      { name: "description", content: "Sign in using Google or secure passwordless Email OTP to join events." },
    ],
  }),
  component: AuthPage,
});

const LOGO = "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logLogin = useServerFn(logUserLoginEvent);

  // Timer effect for Resend OTP button
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  const startOtpTimer = () => {
    setTimer(60);
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/student",
        },
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success("Security code sent to your email!");
      setStep("otp");
      startOtpTimer();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  };

  // Auto-submit OTP when length reaches 6 digits
  useEffect(() => {
    if (otpCode.length === 6) {
      handleVerifyOtp();
    }
  }, [otpCode]);

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6) return;

    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: "email",
      });

      if (error) throw error;

      // Log login event via server function
      try {
        await logLogin({ data: { method: "email_otp" } });
      } catch (err) {
        console.error("Failed to write login audit log:", err);
      }

      setStep("success");
      await refresh();

      // Trigger navigation after success animation
      setTimeout(async () => {
        // Evaluate redirects and MFA checks
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) {
          navigate({ to: "/student" });
          return;
        }

        const [{ data: rolesData }, { data: mfaInfo }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);

        const rolesList = (rolesData ?? []).map(r => r.role);
        const hasAdminRole = rolesList.some(r => ["super_admin", "college_admin", "organizer"].includes(r));

        // Redirect policy matching layout check
        if (hasAdminRole) {
          if (mfaInfo?.nextLevel === "aal1") {
            navigate({ to: "/auth/mfa-enroll" });
            return;
          }
          if (mfaInfo?.nextLevel === "aal2" && mfaInfo?.currentLevel === "aal1") {
            navigate({ to: "/auth/mfa-verify" });
            return;
          }
        } else {
          // Student / Volunteer
          if (mfaInfo?.nextLevel === "aal2" && mfaInfo?.currentLevel === "aal1") {
            navigate({ to: "/auth/mfa-verify" });
            return;
          }
        }

        // If redirect param is set, route there
        if (redirect && redirect.startsWith("/")) {
          window.location.href = redirect;
          return;
        }

        // Default role based dashboards
        if (rolesList.includes("super_admin")) {
          window.location.href = "/super-admin";
        } else if (rolesList.includes("college_admin") || rolesList.includes("organizer")) {
          window.location.href = "/admin";
        } else if (rolesList.includes("scanner")) {
          window.location.href = "/admin/scanner";
        } else {
          window.location.href = "/student";
        }
      }, 1500);

    } catch (err: any) {
      toast.error(err?.message ?? "Invalid or expired verification code.");
      setOtpCode(""); // reset
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side: branding/hero panel */}
      <div className="relative hidden overflow-hidden bg-gradient-brand lg:block">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="" className="h-9 w-9 rounded-xl object-contain shadow-glow-sm" />
            <span className="font-display text-lg font-bold tracking-tight">CampusConnect</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Production-Ready Identity Gate
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight max-w-lg">
              The official events platform for your college.
            </h1>
            <p className="mt-4 max-w-md text-white/80 text-sm leading-relaxed">
              Register for events in seconds, carry a secure QR ticket on your phone, and earn verifiable certificates after every attendance.
            </p>
          </div>
          <div className="text-xs text-white/50">© CampusConnect. Secure authentication powered by Supabase Auth.</div>
        </div>
      </div>

      {/* Right side: Login forms */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-12 relative overflow-hidden">
        {/* Animated Background Mesh for glassmorphism layout */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="w-full max-w-md bg-card/40 border border-border/60 p-8 rounded-3xl backdrop-blur-xl shadow-elevated">
          <AnimatePresence mode="wait">
            
            {step === "email" && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 lg:hidden mb-2">
                    <img src={LOGO} alt="" className="h-8 w-8 object-contain" />
                    <span className="font-display font-bold text-foreground">CampusConnect</span>
                  </div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Welcome Back</h2>
                  <p className="text-xs text-muted-foreground">Sign in to manage your tickets, registrations, and certificates.</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="h-11 w-full rounded-full font-semibold border-border hover:bg-muted/80 cursor-pointer flex items-center justify-center gap-2"
                >
                  <GoogleIcon className="h-4 w-4" /> Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">or email passwordless</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">College Email Address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@college.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-xl pl-10 h-11 border-border/80"
                        required
                        disabled={busy}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy || !email}
                    className="w-full rounded-full bg-gradient-brand text-white h-11 font-semibold shadow-glow hover:opacity-90 cursor-pointer"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...
                      </>
                    ) : (
                      <>
                        Send Security OTP <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-muted-foreground">
                    Need help? <a href="mailto:support@campusconnect.edu" className="font-semibold text-primary hover:underline">Contact Support</a>
                  </span>
                </div>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div className="text-left">
                  <button
                    onClick={() => setStep("email")}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold mb-4"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to Email
                  </button>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Verify Your Identity</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    We've emailed a 6-digit one-time password to <span className="font-semibold text-foreground">{email}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider self-start">One-Time Password</Label>
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={busy}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <InputOTPSlot
                            key={idx}
                            index={idx}
                            className="rounded-xl border border-border/80 bg-background/50 h-12 w-12 text-lg font-bold text-center"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy || otpCode.length !== 6}
                    className="w-full rounded-full bg-gradient-brand text-white h-11 font-semibold shadow-glow cursor-pointer"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Code...
                      </>
                    ) : (
                      "Confirm & Sign In"
                    )}
                  </Button>
                </form>

                <div className="flex flex-col items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleSendOtp()}
                    disabled={busy || timer > 0}
                    className="text-xs font-semibold hover:bg-transparent text-primary hover:underline cursor-pointer"
                  >
                    {timer > 0 ? `Resend OTP in ${timer}s` : "Resend Verification Code"}
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    By continuing, you agree to our <a href="/terms" className="underline">Terms</a> & <a href="/privacy" className="underline">Privacy Policy</a>
                  </span>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center space-y-4"
              >
                <div className="grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success animate-bounce">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold text-foreground">Verified Successfully</h3>
                  <p className="text-xs text-muted-foreground">Taking you to your secure dashboard...</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
