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
  CreditCard, ShieldCheck, KeyRound, Building2, ImagePlus, X,
  Globe, Phone, Mail, MapPin, Palette, CheckCircle2, Loader2,
  Image, Video, Monitor, Layout, BookImage, Sparkles, Star
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

// ─── Reusable media upload field component ──────────────────────────────────
function MediaUploadField({
  label, hint, value, preview, mediaType, uploading,
  accept, onFileChange, onUrlChange, onRemove, onTypeChange,
  showTypeToggle = false
}: {
  label: string; hint: string; value: string; preview: string | null;
  mediaType?: "image" | "video"; uploading: boolean;
  accept: string; onFileChange: (f: File) => void;
  onUrlChange: (v: string) => void; onRemove: () => void;
  onTypeChange?: (t: "image" | "video") => void; showTypeToggle?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isVideo = mediaType === "video";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <ImagePlus className="h-3.5 w-3.5" /> {label}
        </Label>
        {showTypeToggle && onTypeChange && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onTypeChange("image")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer ${mediaType === "image" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Image className="h-3 w-3" /> Image
            </button>
            <button
              type="button"
              onClick={() => onTypeChange("video")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer ${mediaType === "video" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Video className="h-3 w-3" /> Video
            </button>
          </div>
        )}
      </div>

      {/* Preview Area */}
      <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/20 overflow-hidden" style={{ minHeight: "120px" }}>
        {preview ? (
          isVideo ? (
            <video
              src={preview}
              className="w-full h-36 object-cover rounded-xl"
              muted autoPlay loop playsInline
            />
          ) : (
            <img
              src={preview}
              alt={label}
              className="w-full h-36 object-contain rounded-xl p-3"
              onError={() => {}}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-28 gap-2 text-muted-foreground/50">
            {isVideo ? <Video className="h-8 w-8" /> : <Image className="h-8 w-8" />}
            <span className="text-[10px] font-medium">No {isVideo ? "video" : "image"} set</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {preview && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }} />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="rounded-xl h-8 text-xs font-semibold gap-1.5 cursor-pointer flex-1"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : `Upload ${isVideo ? "Video" : "Image"}`}
        </Button>
      </div>

      <div>
        <Label className="text-[10px] font-medium text-muted-foreground">Or paste URL</Label>
        <Input
          value={value}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={isVideo ? "https://example.com/banner.mp4" : "https://example.com/banner.jpg"}
          className="mt-1 h-8 rounded-lg text-xs"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────
function SettingsPage() {
  const qc = useQueryClient();
  const grant = useServerFn(grantRole);

  // Role Grant
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "college_admin" | "organizer" | "scanner">("organizer");
  const [grantBusy, setGrantBusy] = useState(false);

  // College Branding
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [collegeName, setCollegeName] = useState("");
  const [collegeShortName, setCollegeShortName] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegePhone, setCollegePhone] = useState("");
  const [collegeAddress, setCollegeAddress] = useState("");
  const [collegeTagline, setCollegeTagline] = useState("");
  const [collegePrimaryColor, setCollegePrimaryColor] = useState("#6D28D9");

  // Media URLs & Previews
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerMediaType, setHeaderMediaType] = useState<"image" | "video">("image");
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [footerMediaUrl, setFooterMediaUrl] = useState("");
  const [footerMediaType, setFooterMediaType] = useState<"image" | "video">("image");
  const [footerPreview, setFooterPreview] = useState<string | null>(null);
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [ogPreview, setOgPreview] = useState<string | null>(null);

  // Payment Keys
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
        .select("id, name, short_name, logo_url, favicon_url, primary_color, contact_email, contact_phone, address, slug, tagline, header_media_url, header_media_type, footer_media_url, footer_media_type, og_image_url")
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
      const { data } = await supabase.from("college_payment_settings").select("*").eq("college_id", cid);
      return data ?? [];
    },
  });

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!collegeProfile) return;
    setCollegeName(collegeProfile.name ?? "");
    setCollegeShortName(collegeProfile.short_name ?? "");
    setCollegeEmail(collegeProfile.contact_email ?? "");
    setCollegePhone(collegeProfile.contact_phone ?? "");
    setCollegeAddress(collegeProfile.address ?? "");
    setCollegeTagline(collegeProfile.tagline ?? "");
    setCollegePrimaryColor(collegeProfile.primary_color ?? "#6D28D9");

    setLogoUrl(collegeProfile.logo_url ?? "");
    setLogoPreview(collegeProfile.logo_url ?? null);
    setFaviconUrl(collegeProfile.favicon_url ?? "");
    setFaviconPreview(collegeProfile.favicon_url ?? null);
    setHeaderMediaUrl(collegeProfile.header_media_url ?? "");
    setHeaderMediaType((collegeProfile.header_media_type as "image" | "video") ?? "image");
    setHeaderPreview(collegeProfile.header_media_url ?? null);
    setFooterMediaUrl(collegeProfile.footer_media_url ?? "");
    setFooterMediaType((collegeProfile.footer_media_type as "image" | "video") ?? "image");
    setFooterPreview(collegeProfile.footer_media_url ?? null);
    setOgImageUrl(collegeProfile.og_image_url ?? "");
    setOgPreview(collegeProfile.og_image_url ?? null);
  }, [collegeProfile]);

  useEffect(() => {
    if (!paymentSettings) return;
    const rzp = paymentSettings.find((s: any) => s.provider_code === "razorpay");
    if (rzp) { setRzpKeyId(rzp.key_id ?? ""); setRzpKeySecret((rzp.config as any)?.key_secret ?? ""); }
    const cf = paymentSettings.find((s: any) => s.provider_code === "cashfree");
    if (cf) { setCfAppId(cf.key_id ?? ""); setCfSecretKey((cf.config as any)?.key_secret ?? ""); }
  }, [paymentSettings]);

  // ── Upload Helper ─────────────────────────────────────────────────────────
  const uploadMedia = async (
    file: File,
    folder: string,
    fieldKey: string,
    maxBytes: number,
    acceptedTypes: string[]
  ): Promise<string | null> => {
    if (file.size > maxBytes) {
      toast.error(`File too large. Max size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return null;
    }
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.type}`);
      return null;
    }

    setUploadingField(fieldKey);
    try {
      const cid = await getAdminCollegeId();
      if (!cid) throw new Error("No college associated with your account.");
      const ext = file.name.split(".").pop();
      const path = `${folder}/${cid}/${fieldKey}.${ext}`;
      const { error } = await supabase.storage
        .from("college-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("college-assets").getPublicUrl(path);
      return `${urlData.publicUrl}?t=${Date.now()}`;
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed. Ensure 'college-assets' bucket exists in Supabase Storage.");
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const saveCollegeProfile = async () => {
    setSavingProfile(true);
    try {
      const cid = await getAdminCollegeId();
      if (!cid) throw new Error("No college found for your account.");
      const { error } = await supabase.from("colleges").update({
        name: collegeName.trim(),
        short_name: collegeShortName.trim() || null,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
        primary_color: collegePrimaryColor || null,
        contact_email: collegeEmail.trim() || null,
        contact_phone: collegePhone.trim() || null,
        address: collegeAddress.trim() || null,
        tagline: collegeTagline.trim() || null,
        header_media_url: headerMediaUrl || null,
        header_media_type: headerMediaType,
        footer_media_url: footerMediaUrl || null,
        footer_media_type: footerMediaType,
        og_image_url: ogImageUrl || null,
      }).eq("id", cid);
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
      const { error } = await supabase.from("college_payment_settings").upsert({
        college_id: cid, provider_code: provider, key_id: keyId,
        config: { key_secret: keySecret }, mode: "custom", is_active: true,
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

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your college's profile, branding, media, and payment integrations.</p>
      </div>

      {/* ── 1. COLLEGE IDENTITY ─────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> College Identity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Displayed on your college's public page, event cards, certificates, and QR tickets.
        </p>

        {/* Logo + Favicon row */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Logo */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">College Logo</Label>
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border bg-muted/40 overflow-hidden flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-2" />
                  ) : <Building2 className="h-8 w-8 text-muted-foreground/40" />}
                  {uploadingField === "logo" && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-2xl">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {logoPreview && (
                  <button onClick={() => { setLogoPreview(null); setLogoUrl(""); }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setLogoPreview(URL.createObjectURL(f));
                    const url = await uploadMedia(f, "college-logos", "logo", 2 * 1024 * 1024, ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
                    if (url) { setLogoUrl(url); setLogoPreview(url); toast.success("Logo uploaded! Save to apply."); }
                    else setLogoPreview(logoUrl || null);
                  }}
                />
                <Button type="button" variant="outline" disabled={uploadingField === "logo"}
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-xl h-8 text-xs font-semibold gap-1.5 cursor-pointer w-full">
                  <ImagePlus className="h-3.5 w-3.5" /> {uploadingField === "logo" ? "Uploading..." : "Upload Logo"}
                </Button>
                <Input value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setLogoPreview(e.target.value || null); }}
                  placeholder="https://example.com/logo.png" className="h-8 rounded-lg text-xs" />
                <p className="text-[10px] text-muted-foreground">PNG/JPG/SVG/WebP · Max 2 MB · 400×400 px recommended</p>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div>
            <Label className="text-xs font-semibold mb-2 block flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" /> Favicon (Browser Tab Icon)
            </Label>
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border bg-muted/40 overflow-hidden flex items-center justify-center">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="h-12 w-12 object-contain" />
                  ) : <Star className="h-8 w-8 text-muted-foreground/40" />}
                  {uploadingField === "favicon" && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-2xl">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {faviconPreview && (
                  <button onClick={() => { setFaviconPreview(null); setFaviconUrl(""); }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input type="file" accept="image/png,image/x-icon,image/svg+xml,image/webp" className="hidden" id="favicon-upload"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setFaviconPreview(URL.createObjectURL(f));
                    const url = await uploadMedia(f, "college-favicons", "favicon", 512 * 1024, ["image/png", "image/x-icon", "image/svg+xml", "image/webp"]);
                    if (url) { setFaviconUrl(url); setFaviconPreview(url); toast.success("Favicon uploaded! Save to apply."); }
                    else setFaviconPreview(faviconUrl || null);
                  }}
                />
                <Button type="button" variant="outline" disabled={uploadingField === "favicon"}
                  onClick={() => document.getElementById("favicon-upload")?.click()}
                  className="rounded-xl h-8 text-xs font-semibold gap-1.5 cursor-pointer w-full">
                  <ImagePlus className="h-3.5 w-3.5" /> {uploadingField === "favicon" ? "Uploading..." : "Upload Favicon"}
                </Button>
                <Input value={faviconUrl} onChange={(e) => { setFaviconUrl(e.target.value); setFaviconPreview(e.target.value || null); }}
                  placeholder="https://example.com/favicon.ico" className="h-8 rounded-lg text-xs" />
                <p className="text-[10px] text-muted-foreground">ICO/PNG/SVG · Max 512 KB · 32×32 or 64×64 px</p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-semibold">College Name *</Label>
            <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. TGPCOP College" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Short Name / Abbreviation</Label>
            <Input value={collegeShortName} onChange={(e) => setCollegeShortName(e.target.value)}
              placeholder="e.g. TGPCOP" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> College Tagline</Label>
            <Input value={collegeTagline} onChange={(e) => setCollegeTagline(e.target.value)}
              placeholder="e.g. Excellence in Pharmacy Education" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Contact Email</Label>
            <Input type="email" value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)}
              placeholder="admin@college.edu" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contact Phone</Label>
            <Input type="tel" value={collegePhone} onChange={(e) => setCollegePhone(e.target.value)}
              placeholder="+91 98765 43210" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address</Label>
            <Input value={collegeAddress} onChange={(e) => setCollegeAddress(e.target.value)}
              placeholder="123 College Road, City, State – 000000" className="mt-1.5 rounded-xl h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Brand Color</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={collegePrimaryColor} onChange={(e) => setCollegePrimaryColor(e.target.value)}
                className="h-9 w-12 rounded-lg border border-border cursor-pointer p-0.5 bg-card" />
              <Input value={collegePrimaryColor} onChange={(e) => setCollegePrimaryColor(e.target.value)}
                placeholder="#6D28D9" className="rounded-xl h-9 text-sm font-mono flex-1" maxLength={7} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Used in event cards, certificates, and QR tickets.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Portal URL (slug)</Label>
            <Input value={`${collegeProfile?.slug ?? "—"}.festverse.app`} readOnly
              className="mt-1.5 rounded-xl h-9 text-sm bg-muted/40 text-muted-foreground cursor-not-allowed" />
            <p className="mt-1 text-[10px] text-muted-foreground">Slug cannot be changed after creation.</p>
          </div>
        </div>

        <Button onClick={saveCollegeProfile} disabled={savingProfile || !collegeName}
          className="mt-6 rounded-full bg-gradient-brand text-white shadow-glow px-6 h-10 font-bold cursor-pointer gap-2">
          {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-4 w-4" /> Save College Profile</>}
        </Button>
      </section>

      {/* ── 2. HEADER MEDIA ─────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" /> Header / Hero Banner Media
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The background image or looping video displayed in the hero section of your college's homepage.
        </p>
        <div className="mt-5">
          <MediaUploadField
            label="Header Banner"
            hint="Recommended: 1920×600 px image or 1920×1080 MP4/WebM video. Max 50 MB."
            value={headerMediaUrl}
            preview={headerPreview}
            mediaType={headerMediaType}
            uploading={uploadingField === "header"}
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            showTypeToggle
            onTypeChange={setHeaderMediaType}
            onUrlChange={(v) => { setHeaderMediaUrl(v); setHeaderPreview(v || null); }}
            onFileChange={async (f) => {
              setHeaderPreview(URL.createObjectURL(f));
              const isVid = f.type.startsWith("video/");
              if (isVid) setHeaderMediaType("video");
              const url = await uploadMedia(f, "college-media", "header",
                50 * 1024 * 1024,
                ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]
              );
              if (url) { setHeaderMediaUrl(url); setHeaderPreview(url); toast.success("Header media uploaded! Save to apply."); }
              else setHeaderPreview(headerMediaUrl || null);
            }}
            onRemove={() => { setHeaderPreview(null); setHeaderMediaUrl(""); }}
          />
        </div>
        <Button onClick={saveCollegeProfile} disabled={savingProfile}
          className="mt-5 rounded-full bg-gradient-brand text-white shadow-glow px-6 h-9 text-xs font-bold cursor-pointer gap-2">
          {savingProfile ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Save Header Media</>}
        </Button>
      </section>

      {/* ── 3. FOOTER MEDIA ─────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <BookImage className="h-5 w-5 text-primary" /> Footer Background Media
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional background image or subtle looping video for your college footer section.
        </p>
        <div className="mt-5">
          <MediaUploadField
            label="Footer Background"
            hint="Recommended: 1920×400 px image or short looping WebM/MP4 video. Max 50 MB."
            value={footerMediaUrl}
            preview={footerPreview}
            mediaType={footerMediaType}
            uploading={uploadingField === "footer"}
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            showTypeToggle
            onTypeChange={setFooterMediaType}
            onUrlChange={(v) => { setFooterMediaUrl(v); setFooterPreview(v || null); }}
            onFileChange={async (f) => {
              setFooterPreview(URL.createObjectURL(f));
              const isVid = f.type.startsWith("video/");
              if (isVid) setFooterMediaType("video");
              const url = await uploadMedia(f, "college-media", "footer",
                50 * 1024 * 1024,
                ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]
              );
              if (url) { setFooterMediaUrl(url); setFooterPreview(url); toast.success("Footer media uploaded! Save to apply."); }
              else setFooterPreview(footerMediaUrl || null);
            }}
            onRemove={() => { setFooterPreview(null); setFooterMediaUrl(""); }}
          />
        </div>
        <Button onClick={saveCollegeProfile} disabled={savingProfile}
          className="mt-5 rounded-full bg-gradient-brand text-white shadow-glow px-6 h-9 text-xs font-bold cursor-pointer gap-2">
          {savingProfile ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Save Footer Media</>}
        </Button>
      </section>

      {/* ── 4. SEO / OG IMAGE ───────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> SEO & Social Share Image
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The OG image shown when your college portal is shared on WhatsApp, Twitter, LinkedIn, etc.
        </p>
        <div className="mt-5">
          <MediaUploadField
            label="Social Share / OG Image"
            hint="Recommended: 1200×630 px JPG or PNG. Max 2 MB. Shown in social media link previews."
            value={ogImageUrl}
            preview={ogPreview}
            uploading={uploadingField === "og"}
            accept="image/png,image/jpeg,image/webp"
            onUrlChange={(v) => { setOgImageUrl(v); setOgPreview(v || null); }}
            onFileChange={async (f) => {
              setOgPreview(URL.createObjectURL(f));
              const url = await uploadMedia(f, "college-seo", "og-image",
                2 * 1024 * 1024,
                ["image/png", "image/jpeg", "image/webp"]
              );
              if (url) { setOgImageUrl(url); setOgPreview(url); toast.success("OG image uploaded! Save to apply."); }
              else setOgPreview(ogImageUrl || null);
            }}
            onRemove={() => { setOgPreview(null); setOgImageUrl(""); }}
          />
        </div>
        <Button onClick={saveCollegeProfile} disabled={savingProfile}
          className="mt-5 rounded-full bg-gradient-brand text-white shadow-glow px-6 h-9 text-xs font-bold cursor-pointer gap-2">
          {savingProfile ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Save SEO Settings</>}
        </Button>
      </section>

      {/* ── 5. GRANT ROLE ───────────────────────────────────────────────────── */}
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
            <Button onClick={handleGrant} disabled={!email || grantBusy}
              className="h-10 w-full rounded-xl bg-gradient-brand text-white shadow-glow cursor-pointer">
              {grantBusy ? "..." : "Grant"}
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
