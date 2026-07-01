import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/components/auth-provider";
import { verifyAndLinkPrn } from "@/lib/student-prn.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Mail, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/brand-logo";

const SearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/_authenticated/verify-prn")({
  validateSearch: SearchSchema,
  head: () => ({
    meta: [
      { title: `Verify your student identity · ${BRAND.appName}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyPrnPage,
});

type Status = "idle" | "checking" | "success" | "not_found" | "taken" | "error";

function VerifyPrnPage() {
  const { user, profile, refresh, loading } = useAuth();
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyAndLinkPrn);

  const [prn, setPrn] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [supportEmail, setSupportEmail] = useState(BRAND.supportEmail);

  // Already verified → straight to the dashboard.
  useEffect(() => {
    if (!loading && profile?.verified) {
      const dest = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/my-tickets";
      navigate({ to: dest as never, replace: true });
    }
  }, [loading, profile?.verified, redirectTo, navigate]);

  useEffect(() => {
    supabase
      .from("colleges")
      .select("support_email, contact_email")
      .eq("slug", "tgpcop")
      .maybeSingle()
      .then(({ data }) => {
        const email = data?.support_email ?? data?.contact_email;
        if (email) setSupportEmail(email);
      });
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prn.trim()) return;
    setStatus("checking");
    try {
      const r = await verify({ data: { prn: prn.trim() } });
      if (r.ok) {
        setStatus("success");
        await refresh();
        setTimeout(() => {
          const dest = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/my-tickets";
          navigate({ to: dest as never, replace: true });
        }, 900);
        return;
      }
      if (r.reason === "taken") setStatus("taken");
      else if (r.reason === "not_found") setStatus("not_found");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const fullName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Student";
  const avatar =
    profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Logo size="xl" className="mx-auto" />
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Verify your student identity
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Enter your PRN so we can match you against the official student database.
        </p>

        <div className="mt-8 w-full rounded-3xl border border-border bg-card p-6 text-left shadow-card">
          {/* Google profile preview */}
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
            {avatar ? (
              <img src={avatar} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                {fullName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{fullName}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="mt-3 font-display text-lg font-semibold">PRN verified</p>
              <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="prn">PRN</Label>
                <Input
                  id="prn"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value)}
                  className="mt-1.5 h-11 rounded-xl font-mono tracking-wide"
                  placeholder="e.g. 2504673113823001"
                  autoFocus
                  required
                  disabled={status === "checking"}
                />
              </div>

              {status === "not_found" && (
                <ErrorBox icon={AlertTriangle} title="Couldn't verify your PRN">
                  Your PRN could not be verified against the official student database.
                  Please double-check and try again.
                </ErrorBox>
              )}
              {status === "taken" && (
                <ErrorBox icon={AlertTriangle} title="PRN already linked">
                  This PRN is already linked to another {BRAND.appName} account. If this is a
                  mistake, contact your administrator.
                </ErrorBox>
              )}
              {status === "error" && (
                <ErrorBox icon={AlertTriangle} title="Something went wrong">
                  We couldn't reach the verification service. Please try again in a moment.
                </ErrorBox>
              )}

              <Button
                type="submit"
                disabled={status === "checking" || !prn.trim()}
                className="h-11 w-full rounded-full bg-gradient-brand font-semibold text-white shadow-glow hover:opacity-90"
              >
                {status === "checking" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              {(status === "not_found" || status === "taken") && (
                <a
                  href={`mailto:${supportEmail}?subject=PRN%20verification%20issue&body=My%20PRN%3A%20${encodeURIComponent(prn)}%0AEmail%3A%20${encodeURIComponent(user?.email ?? "")}`}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-semibold hover:bg-muted"
                >
                  <Mail className="h-4 w-4" /> Contact Administrator
                </a>
              )}
            </form>
          )}
        </div>

        <p className="mt-6 max-w-sm text-xs text-muted-foreground">
          Verification is one-time. Your PRN is checked against the official database and
          cannot be linked to more than one account.
        </p>
      </div>
    </div>
  );
}

function ErrorBox({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof AlertTriangle;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="text-sm">
        <div className="font-semibold text-destructive">{title}</div>
        <p className="mt-0.5 text-xs text-foreground/80">{children}</p>
      </div>
    </div>
  );
}
