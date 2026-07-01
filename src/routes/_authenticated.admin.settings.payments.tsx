import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { testRazorpayConnection } from "@/lib/payment-pricing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CreditCard, KeyRound, CheckCircle2, XCircle, Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/settings/payments")({
  head: () => ({ meta: [{ title: "Payment Settings · Admin · CampusConnect" }] }),
  component: CollegePaymentSettingsPage,
});

function CollegePaymentSettingsPage() {
  const testConn = useServerFn(testRazorpayConnection);

  const [isActive, setIsActive] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mode, setMode] = useState<"platform" | "custom">("platform");
  
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load college and payment settings
  const { data: collegeData, refetch } = useQuery({
    queryKey: ["admin", "payment-settings-details"],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return null;

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("college_id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      if (!roleRow?.college_id) return null;

      const [{ data: settings }, { data: college }] = await Promise.all([
        supabase
          .from("college_payment_settings")
          .select("*")
          .eq("college_id", roleRow.college_id)
          .eq("provider_code", "razorpay")
          .maybeSingle(),
        supabase
          .from("colleges")
          .select("name, slug")
          .eq("id", roleRow.college_id)
          .single(),
      ]);

      return { settings, college, collegeId: roleRow.college_id };
    },
  });

  useEffect(() => {
    if (collegeData?.settings) {
      const s = collegeData.settings;
      setIsActive(s.is_active);
      setKeyId(s.key_id ?? "");
      setKeySecret((s.config as any)?.key_secret ?? "");
      setWebhookSecret((s.config as any)?.webhook_secret ?? "");
      setMode(s.mode);
    }
  }, [collegeData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeData?.collegeId) return;

    if (mode === "custom" && (!keyId.trim() || !keySecret.trim())) {
      toast.error("Please enter Key ID and Key Secret for Custom integration.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("college_payment_settings")
        .upsert(
          {
            college_id: collegeData.collegeId,
            provider_code: "razorpay",
            key_id: mode === "custom" ? keyId.trim() : null,
            config: mode === "custom" 
              ? { key_secret: keySecret.trim(), webhook_secret: webhookSecret.trim() }
              : {},
            mode,
            is_active: isActive,
          },
          { onConflict: "college_id,provider_code" }
        );

      if (error) throw error;
      toast.success("Razorpay settings updated successfully!");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  };

  const handleTestConnection = async () => {
    if (!keyId.trim() || !keySecret.trim()) {
      toast.error("Please fill in both Key ID and Key Secret to test connection.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConn({ data: { keyId: keyId.trim(), keySecret: keySecret.trim() } });
      if (res.ok) {
        setTestResult({ ok: true, msg: "Successfully authenticated with Razorpay!" });
        toast.success("Razorpay Connection Successful!");
      } else {
        setTestResult({ ok: false, msg: res.reason || "Authentication failed." });
        toast.error("Razorpay Connection Failed!");
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || "Failed to reach Razorpay API." });
      toast.error("Connection Check Error");
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = collegeData?.college ? `${window.location.origin}/api/public/payments/webhook` : "";

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      
      {/* Back button */}
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold mb-6"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Settings
      </Link>

      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" /> Razorpay Payment Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure how registrations fees are collected for **{collegeData?.college?.name || "your college"}**.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        
        {/* Toggle Switch */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <Label className="text-base font-semibold">Enable Student Payments</Label>
            <p className="text-xs text-muted-foreground">
              When disabled, students will not be able to checkout for paid events. Free events will remain unaffected.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} disabled={busy} />
        </div>

        {/* Integration Mode selection */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
          <Label className="text-base font-semibold">Integration Mode</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                id: "platform",
                title: "Use Platform Gateway",
                desc: "Payments will be processed via CampusConnect's master account. Settlement will be credited manually minus commission.",
              },
              {
                id: "custom",
                title: "Use Custom Credentials",
                desc: "Direct integration. Connect your college's official Razorpay account. 100% of event fees land directly in your bank account.",
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                  mode === m.id
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/45"
                    : "border-border bg-background/50 hover:bg-muted/40"
                }`}
              >
                <div className="text-xs font-bold">{m.title}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed mt-2">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Configuration Section */}
        {mode === "custom" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
            <h2 className="font-display text-base font-semibold flex items-center gap-2 border-b border-border/60 pb-2">
              <KeyRound className="h-4 w-4 text-primary" /> Razorpay API Credentials
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-id">Razorpay Key ID</Label>
                <Input
                  id="key-id"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder="rzp_live_xxxxxxxx"
                  className="rounded-xl h-10 border-border/80 font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="key-secret">Razorpay Key Secret</Label>
                <Input
                  id="key-secret"
                  type="password"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="rounded-xl h-10 border-border/80 font-mono text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Razorpay Webhook Secret (Recommended)</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="webhook_secret_key"
                className="rounded-xl h-10 border-border/80 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">
                Webhook secret verifies events sent from Razorpay are authentic. Configure webhooks in the Razorpay Dashboard using the URL below.
              </p>
            </div>

            <div className="p-3 bg-muted/60 border border-border/80 rounded-2xl space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Webhook Endpoint URL</div>
              <div className="flex items-center justify-between font-mono text-xs text-foreground select-all break-all pr-2">
                {webhookUrl}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("Webhook URL copied.");
                  }}
                  className="text-primary text-[10px] font-bold hover:underline select-none pl-2"
                >
                  Copy URL
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !keyId || !keySecret}
                variant="outline"
                className="rounded-full text-xs font-semibold cursor-pointer w-full sm:w-auto h-9"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>

              {testResult && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${testResult.ok ? "text-success" : "text-destructive"}`}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={busy}
            className="rounded-full bg-gradient-brand text-white font-semibold px-8 h-11 shadow-glow hover:opacity-90 cursor-pointer"
          >
            {busy ? "Saving Settings..." : "Save Payment Settings"}
          </Button>
        </div>

      </form>

      {/* Guide Links */}
      <div className="mt-12 p-5 border border-border/60 rounded-3xl bg-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Razorpay Configuration Guide</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Need help setting up custom gateways? You will need a verified merchant account on Razorpay. Follow the official documentation to obtain your credentials:
        </p>
        <div className="flex gap-4 pt-1">
          <a
            href="https://razorpay.com/docs/payments/dashboard/settings/api-keys/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            Obtaining Keys <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://razorpay.com/docs/webhooks/setup-dashboard/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            Webhook Setup <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

    </div>
  );
}
