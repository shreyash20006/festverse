import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { grantRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Admin · CampusConnect" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const grant = useServerFn(grantRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "college_admin" | "organizer" | "scanner">("organizer");
  const [busy, setBusy] = useState(false);

  const { data: providers = [] } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_providers").select("*");
      return data ?? [];
    },
  });

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

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Grant role</h2>
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
            <Button onClick={handleGrant} disabled={!email || busy} className="h-10 w-full rounded-xl bg-gradient-brand text-white shadow-glow">
              {busy ? "..." : "Grant"}
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Payment providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Available providers. To enable Razorpay live transactions, add{" "}
          <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> as secrets,
          then activate the provider for your college.
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
