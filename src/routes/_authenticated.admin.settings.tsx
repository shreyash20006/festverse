import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { grantRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, ShieldCheck, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Admin · FestVerse" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const grant = useServerFn(grantRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "college_admin" | "organizer" | "scanner">("organizer");
  const [busy, setBusy] = useState(false);

  // Custom key states
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [cfAppId, setCfAppId] = useState("");
  const [cfSecretKey, setCfSecretKey] = useState("");
  const [savingKeys, setSavingKeys] = useState<string | null>(null);

  const { data: providers = [] } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_providers").select("*");
      return data ?? [];
    },
  });

  const { data: paymentSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["admin", "college-payment-settings"],
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

      const { data } = await supabase
        .from("college_payment_settings")
        .select("*")
        .eq("college_id", roleRow.college_id);
      return data ?? [];
    }
  });

  useEffect(() => {
    if (paymentSettings) {
      const rzp = paymentSettings.find((s) => s.provider_code === "razorpay");
      if (rzp) {
        setRzpKeyId(rzp.key_id ?? "");
        setRzpKeySecret((rzp.config as any)?.key_secret ?? "");
      }
      const cf = paymentSettings.find((s) => s.provider_code === "cashfree");
      if (cf) {
        setCfAppId(cf.key_id ?? "");
        setCfSecretKey((cf.config as any)?.key_secret ?? "");
      }
    }
  }, [paymentSettings]);

  const handleGrant = async () => {
    setBusy(true);
    try {
      await grant({ data: { userEmail: email, role } });
      toast.success(`Granted ${role} to ${email}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not grant role");
    } finally {
      setBusy(false);
    }
  };

  const saveKeys = async (provider: string, keyId: string, keySecret: string) => {
    setSavingKeys(provider);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("No active session");
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("college_id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      if (!roleRow?.college_id) throw new Error("No associated college found for your account.");

      const { error } = await supabase
        .from("college_payment_settings")
        .upsert({
          college_id: roleRow.college_id,
          provider_code: provider,
          key_id: keyId,
          config: { key_secret: keySecret },
          mode: "custom",
          is_active: true
        }, { onConflict: "college_id,provider_code" });

      if (error) throw error;
      toast.success(`${provider === "razorpay" ? "Razorpay" : "Cashfree"} settings updated!`);
      refetchSettings();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save settings");
    } finally {
      setSavingKeys(null);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Grant role
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          User must have signed in at least once. Use this to add admins, organizers and scanners.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_120px]">
          <div>
            <Label>User email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@college.edu" className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super admin</SelectItem>
                <SelectItem value="college_admin">College admin</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="scanner">Scanner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleGrant} disabled={!email || busy} className="h-10 w-full rounded-xl bg-gradient-brand text-white shadow-glow cursor-pointer">
              {busy ? "..." : "Grant"}
            </Button>
          </div>
        </div>
      </section>

      {/* CUSTOM PAYMENT GATEWAY INTEGRATIONS */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> College Payment Integration
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Input your university's own API credentials. This redirects event registration fees directly to your accounts.
        </p>

        <div className="mt-6 space-y-6 divide-y divide-border/60">
          {/* Razorpay Form */}
          <div className="pt-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Razorpay Settings
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">Key ID</Label>
                <Input 
                  value={rzpKeyId} 
                  onChange={(e) => setRzpKeyId(e.target.value)} 
                  placeholder="rzp_live_xxxxxxxx" 
                  className="mt-1.5 rounded-xl h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Key Secret</Label>
                <Input 
                  type="password"
                  value={rzpKeySecret} 
                  onChange={(e) => setRzpKeySecret(e.target.value)} 
                  placeholder="••••••••••••••••" 
                  className="mt-1.5 rounded-xl h-9 text-xs" 
                />
              </div>
            </div>
            <Button 
              onClick={() => saveKeys("razorpay", rzpKeyId, rzpKeySecret)}
              disabled={savingKeys === "razorpay" || !rzpKeyId || !rzpKeySecret}
              className="mt-4 rounded-full bg-gradient-brand text-white text-xs px-5 h-8 font-semibold shadow-glow cursor-pointer"
            >
              {savingKeys === "razorpay" ? "Updating..." : "Save Razorpay Keys"}
            </Button>
          </div>

          {/* Cashfree Form */}
          <div className="pt-6">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Cashfree Settings
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">App ID</Label>
                <Input 
                  value={cfAppId} 
                  onChange={(e) => setCfAppId(e.target.value)} 
                  placeholder="CFxxxxxx" 
                  className="mt-1.5 rounded-xl h-9 text-xs" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Secret Key</Label>
                <Input 
                  type="password"
                  value={cfSecretKey} 
                  onChange={(e) => setCfSecretKey(e.target.value)} 
                  placeholder="••••••••••••••••" 
                  className="mt-1.5 rounded-xl h-9 text-xs" 
                />
              </div>
            </div>
            <Button 
              onClick={() => saveKeys("cashfree", cfAppId, cfSecretKey)}
              disabled={savingKeys === "cashfree" || !cfAppId || !cfSecretKey}
              className="mt-4 rounded-full bg-gradient-brand text-white text-xs px-5 h-8 font-semibold shadow-glow cursor-pointer"
            >
              {savingKeys === "cashfree" ? "Updating..." : "Save Cashfree Keys"}
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Payment providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-enabled provider methods. Custom integrations will automatically take precedence when saved above.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {providers.map((p: any) => (
            <li key={p.code} className="flex items-center justify-between py-3">
              <div>
                <div className="font-semibold">{p.display_name}</div>
                <div className="text-xs text-muted-foreground">code: {p.code}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.is_enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {p.is_enabled ? "Available" : "Disabled"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
