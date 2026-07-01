import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { grantRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CreditCard, ShieldCheck, KeyRound, Building2, ImagePlus, Upload, X,
  Globe, Phone, Mail, MapPin, Palette, RefreshCw, CheckCircle2, Loader2
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Admin · FestVerse" }] }),
  component: SettingsPage,
});

// ─── Helper: get the current college id for admin ─────────────────────────
async function getAdminCollegeId(): Promise<string | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("user_roles")
    .select("college_id")
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();
  return data?.college_id ?? null;
}

function SettingsPage() {
  const qc = useQueryClient();
  const grant = useServerFn(grantRole);

  // ── Role Grant ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "college_admin" | "organizer" | "scanner">("organizer");
  const [grantBusy, setGrantBusy] = useState(false);

  // ── College Branding ──────────────────────────────────────────────────────
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [collegeName, setCollegeName] = useState("");
  const [collegeShortName, setCollegeShortName] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegePhone, setCollegePhone] = useState("");
  const [collegeAddress, setCollegeAddress] = useState("");
  const [collegeWebsite, setCollegeWebsite] = useState("");
  const [collegePrimaryColor, setCollegePrimaryColor] = useState("#6D28D9");
  const [collegeLogoUrl, setCollegeLogoUrl] = useState("");

  // ── Custom Payment Keys ───────────────────────────────────────────────────
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [cfAppId, setCfAppId] = useState("");
  const [cfSecretKey, setCfSecretKey] = useState("");
  const [savingKeys, setSavingKeys] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: collegeProfile, refetch: refetchCollege } = useQuery({
    queryKey: ["admin", "college-profile"],
    queryFn: async () => {
      const cid = await getAdminCollegeId();
      if (!cid) return null;
      const { data } = await supabase
        .from("colleges")
        .select("id, name, short_name, logo_url, primary_color, contact_email, contact_phone, address, slug")
        .eq("id", cid)
        .maybeSingle();
      return data;
    },
  });

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
      const cid = await getAdminCollegeId();
      if (!cid) return [];
      const { data } = await supabase
        .from("college_payment_settings")
        .select("*")
        .eq("college_id", cid);
      return data ?? [];
    },
  });

  // ── Effects: populate form fields from queries ────────────────────────────
  useEffect(() => {
    if (collegeProfile) {
      setCollegeName(collegeProfile.name ?? "");
      setCollegeShortName(collegeProfile.short_name ?? "");
      setCollegeEmail(collegeProfile.contact_email ?? "");
      setCollegePhone(collegeProfile.contact_phone ?? "");
      setCollegeAddress(collegeProfile.address ?? "");
      setCollegePrimaryColor(collegeProfile.primary_color ?? "#6D28D9");
      setCollegeLogoUrl(collegeProfile.logo_url ?? "");
      setLogoPreview(collegeProfile.logo_url ?? null);
    }
  }, [collegeProfile]);

  useEffect(() => {
    if (paymentSettings) {
      const rzp = paymentSettings.find((s: any) => s.provider_code === "razorpay");
      if (rzp) { setRzpKeyId(rzp.key_id ?? ""); setRzpKeySecret((rzp.config as any)?.key_secret ?? ""); }
      const cf = paymentSettings.find((s: any) => s.provider_code === "cashfree");
      if (cf) { setCfAppId(cf.key_id ?? ""); setCfSecretKey((cf.config as any)?.key_secret ?? ""); }
    }
  }, [paymentSettings]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGrant = async () => {
    setGrantBusy(true);
    try {
      await grant({ data: { userEmail: email, role } });
      toast.success(`Granted ${role} to ${email}`);
      setEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not grant role");
    } finally {
      setGrantBusy(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file must be smaller than 2 MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, SVG, or WebP image.");
      return;
    }

    setUploadingLogo(true);
    try {
      const cid = await getAdminCollegeId();
      if (!cid) throw new Error("No college associated with your account.");

      // Preview locally immediately
      const localUrl = URL.createObjectURL(file);
      setLogoPreview(localUrl);

      // Upload to Supabase Storage
      const ext = file.name.split(".").pop();
      const path = `college-logos/${cid}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("college-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("college-assets")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // bust cache
      setCollegeLogoUrl(publicUrl);
      setLogoPreview(publicUrl);
      toast.success("Logo uploaded! Save profile to apply changes.");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed. Make sure the 'college-assets' bucket exists in Supabase Storage.");
      setLogoPreview(collegeLogoUrl || null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveCollegeProfile = async () => {
    setSavingProfile(true);
    try {
      const cid = await getAdminCollegeId();
      if (!cid) throw new Error("No college found for your account.");

      const { error } = await supabase
        .from("colleges")
        .update({
          name: collegeName.trim(),
          short_name: collegeShortName.trim() || null,
          logo_url: collegeLogoUrl || null,
          primary_color: collegePrimaryColor || null,
          contact_email: collegeEmail.trim() || null,
          contact_phone: collegePhone.trim() || null,
          address: collegeAddress.trim() || null,
        })
        .eq("id", cid);

      if (error) throw error;
      toast.success("College profile saved successfully!");
      refetchCollege();
      qc.invalidateQueries({ queryKey: ["admin", "college-profile"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveKeys = async (provider: string, keyId: string, keySecret: string) => {
    setSavingKeys(provider);
    try {
      const cid = await getAdminCollegeId();
      if (!cid) throw new Error("No associated college found for your account.");

      const { error } = await supabase
        .from("college_payment_settings")
        .upsert({
          college_id: cid,
          provider_code: provider,
          key_id: keyId,
          config: { key_secret: keySecret },
          mode: "custom",
          is_active: true,
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
    <div className="container mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your college's profile, branding, roles, and payment integrations.</p>
      </div>

      {/* ── COLLEGE BRANDING & PROFILE ───────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> College Profile & Branding
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This information appears on your college's public page, event cards, certificates, and QR tickets.
        </p>

        {/* Logo Upload */}
        <div className="mt-6">
          <Label className="text-xs font-semibold mb-2 block">College Logo</Label>
          <div className="flex items-start gap-5">
            {/* Logo Preview */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-muted/40 overflow-hidden flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="College Logo" className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground/40" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {logoPreview && (
                <button
                  onClick={() => { setLogoPreview(null); setCollegeLogoUrl(""); }}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
                  title="Remove logo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="rounded-xl h-9 text-xs font-semibold gap-2 cursor-pointer"
              >
                <ImagePlus className="h-4 w-4" />
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                PNG, JPG, SVG, or WebP. Max 2 MB.<br />
                Recommended: 400×400 px, transparent background.
              </p>

              {/* Or paste URL */}
              <div className="pt-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Or paste an image URL</Label>
                <Input
                  value={collegeLogoUrl}
                  onChange={(e) => {
                    setCollegeLogoUrl(e.target.value);
                    setLogoPreview(e.target.value || null);
                  }}
                  placeholder="https://example.com/logo.png"
                  className="mt-1 h-8 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">College Name *</Label>
            <Input
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. TGPCOP College"
              className="mt-1.5 rounded-xl h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Short Name / Abbreviation</Label>
            <Input
              value={collegeShortName}
              onChange={(e) => setCollegeShortName(e.target.value)}
              placeholder="e.g. TGPCOP"
              className="mt-1.5 rounded-xl h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Contact Email</Label>
            <Input
              type="email"
              value={collegeEmail}
              onChange={(e) => setCollegeEmail(e.target.value)}
              placeholder="admin@college.edu"
              className="mt-1.5 rounded-xl h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contact Phone</Label>
            <Input
              type="tel"
              value={collegePhone}
              onChange={(e) => setCollegePhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1.5 rounded-xl h-9 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address</Label>
            <Input
              value={collegeAddress}
              onChange={(e) => setCollegeAddress(e.target.value)}
              placeholder="123 College Road, City, State – 000000"
              className="mt-1.5 rounded-xl h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Brand Color</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={collegePrimaryColor}
                onChange={(e) => setCollegePrimaryColor(e.target.value)}
                className="h-9 w-12 rounded-lg border border-border cursor-pointer p-0.5 bg-card"
              />
              <Input
                value={collegePrimaryColor}
                onChange={(e) => setCollegePrimaryColor(e.target.value)}
                placeholder="#6D28D9"
                className="rounded-xl h-9 text-sm font-mono flex-1"
                maxLength={7}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Used in event cards, certificates and QR tickets.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> College Slug / URL</Label>
            <Input
              value={`${collegeProfile?.slug ?? "—"}.festverse.app`}
              readOnly
              className="mt-1.5 rounded-xl h-9 text-sm bg-muted/40 text-muted-foreground cursor-not-allowed"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Slug is set at creation and cannot be changed.</p>
          </div>
        </div>

        <Button
          onClick={saveCollegeProfile}
          disabled={savingProfile || !collegeName}
          className="mt-6 rounded-full bg-gradient-brand text-white shadow-glow px-6 h-10 font-bold cursor-pointer gap-2"
        >
          {savingProfile ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Save College Profile</>
          )}
        </Button>
      </section>

      {/* ── GRANT ROLE ───────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Grant Role
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          User must have signed in at least once. Use this to add admins, organizers, and scanners.
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
            <Button onClick={handleGrant} disabled={!email || grantBusy} className="h-10 w-full rounded-xl bg-gradient-brand text-white shadow-glow cursor-pointer">
              {grantBusy ? "..." : "Grant"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── CUSTOM PAYMENT GATEWAY ───────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> College Payment Integration
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Input your university's own API credentials. This redirects event registration fees directly to your accounts.
        </p>

        <div className="mt-6 space-y-6 divide-y divide-border/60">
          {/* Razorpay */}
          <div className="pt-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Razorpay Settings
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">Key ID</Label>
                <Input value={rzpKeyId} onChange={(e) => setRzpKeyId(e.target.value)} placeholder="rzp_live_xxxxxxxx" className="mt-1.5 rounded-xl h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Key Secret</Label>
                <Input type="password" value={rzpKeySecret} onChange={(e) => setRzpKeySecret(e.target.value)} placeholder="••••••••••••••••" className="mt-1.5 rounded-xl h-9 text-xs" />
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

          {/* Cashfree */}
          <div className="pt-6">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Cashfree Settings
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold">App ID</Label>
                <Input value={cfAppId} onChange={(e) => setCfAppId(e.target.value)} placeholder="CFxxxxxx" className="mt-1.5 rounded-xl h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Secret Key</Label>
                <Input type="password" value={cfSecretKey} onChange={(e) => setCfSecretKey(e.target.value)} placeholder="••••••••••••••••" className="mt-1.5 rounded-xl h-9 text-xs" />
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

      {/* ── PAYMENT PROVIDERS ────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Payment Providers</h2>
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
