import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrUpdateEvent } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BannerUpload } from "@/components/banner-upload";

export const Route = createFileRoute("/_authenticated/admin/events/new")({
  head: () => ({ meta: [{ title: "Create event · Admin · FestVerse" }] }),
  component: NewEventPage,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function NewEventPage() {
  const navigate = useNavigate();
  const save = useServerFn(createOrUpdateEvent);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    short_description: "",
    description: "",
    category: "technical" as const,
    banner_url: "",
    venue: "",
    start_at: "",
    end_at: "",
    registration_closes_at: "",
    capacity: "",
    featured: false,
    status: "draft" as const,
    organizer_name: "",
    // Advanced pricing configuration
    registration_type: "free" as "free" | "paid",
    registration_fee: "0",
    early_bird_price: "",
    early_bird_deadline: "",
    late_registration_price: "",
    gst_percent: "0",
    discount_amount: "0",
    coupon_code: "",
    max_registrations: "",
    registration_deadline: "",
  });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at || form.start_at).toISOString(),
        registration_closes_at: form.registration_closes_at
          ? new Date(form.registration_closes_at).toISOString()
          : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        // Legacy compatibility
        is_paid: form.registration_type === "paid",
        price_inr: form.registration_type === "paid" ? Number(form.registration_fee) : 0,
        // Advanced pricing details
        registration_fee: Number(form.registration_fee) || 0,
        early_bird_price: form.early_bird_price ? Number(form.early_bird_price) : null,
        early_bird_deadline: form.early_bird_deadline ? new Date(form.early_bird_deadline).toISOString() : null,
        late_registration_price: form.late_registration_price ? Number(form.late_registration_price) : null,
        gst_percent: Number(form.gst_percent) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        coupon_code: form.coupon_code || null,
        max_registrations: form.max_registrations ? Number(form.max_registrations) : null,
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
      };
      await save({ data: { event: payload } });
      toast.success("Event saved");
      navigate({ to: "/admin/events" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save event");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Create event</h1>
      <p className="mt-1 text-sm text-muted-foreground">Save as draft, then publish when ready.</p>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (!form.slug) set("slug", slugify(e.target.value));
              }}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input
              required
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v as any)}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["technical","cultural","sports","workshop","placement","pharmacy","seminar","other"].map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Short description</Label>
            <Input
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              className="mt-1.5 rounded-xl"
              maxLength={280}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Full description</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Banner / Poster image</Label>
            <div className="mt-1.5">
              <BannerUpload value={form.banner_url} onChange={(v) => set("banner_url", v)} />
            </div>
            <Input
              value={form.banner_url}
              onChange={(e) => set("banner_url", e.target.value)}
              className="mt-2 rounded-xl"
              placeholder="https://... (optional external URL)"
            />
          </div>
          <div>
            <Label>Venue</Label>
            <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Start *</Label>
            <Input
              required
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => set("start_at", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>End *</Label>
            <Input
              required
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => set("end_at", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Registration closes</Label>
            <Input
              type="datetime-local"
              value={form.registration_closes_at}
              onChange={(e) => set("registration_closes_at", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Organizer name</Label>
            <Input
              value={form.organizer_name}
              onChange={(e) => set("organizer_name", e.target.value)}
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as any)}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Registration Pricing Configuration */}
        <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
          <h3 className="font-display font-semibold text-sm">Event Registration Pricing</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Registration Type</Label>
              <Select value={form.registration_type} onValueChange={(v) => set("registration_type", v as any)}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Registration</SelectItem>
                  <SelectItem value="paid">Paid Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.registration_type === "paid" && (
              <div>
                <Label>Base Registration Fee (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.registration_fee}
                  onChange={(e) => set("registration_fee", e.target.value)}
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
            )}
          </div>

          {form.registration_type === "paid" && (
            <div className="grid gap-4 sm:grid-cols-2 border-t border-border/50 pt-4 mt-2">
              <div>
                <Label>GST Percent (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.gst_percent}
                  onChange={(e) => set("gst_percent", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label>Max Registrations Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_registrations}
                  onChange={(e) => set("max_registrations", e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label>Early Bird Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.early_bird_price}
                  onChange={(e) => set("early_bird_price", e.target.value)}
                  placeholder="Optional"
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label>Early Bird Deadline</Label>
                <Input
                  type="datetime-local"
                  value={form.early_bird_deadline}
                  onChange={(e) => set("early_bird_deadline", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label>Late Registration Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.late_registration_price}
                  onChange={(e) => set("late_registration_price", e.target.value)}
                  placeholder="Optional"
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label>Specific Pricing Deadline</Label>
                <Input
                  type="datetime-local"
                  value={form.registration_deadline}
                  onChange={(e) => set("registration_deadline", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
          )}

          {form.registration_type === "paid" && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Estimated Student Cost Summary</h4>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-card p-3 border border-border">
                  <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Regular Registration</span>
                  <div className="mt-1 font-bold text-base text-foreground">
                    ₹{(Number(form.registration_fee) + (Number(form.registration_fee) * (Number(form.gst_percent) || 0) / 100)).toFixed(2)}
                  </div>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">
                    (₹{Number(form.registration_fee).toFixed(2)} base + {Number(form.gst_percent) || 0}% GST)
                  </span>
                </div>
                
                {form.early_bird_price && (
                  <div className="rounded-lg bg-card p-3 border border-border">
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold text-emerald-600">Early Bird</span>
                    <div className="mt-1 font-bold text-base text-emerald-600">
                      ₹{(Number(form.early_bird_price) + (Number(form.early_bird_price) * (Number(form.gst_percent) || 0) / 100)).toFixed(2)}
                    </div>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">
                      (₹{Number(form.early_bird_price).toFixed(2)} base + {Number(form.gst_percent) || 0}% GST)
                    </span>
                  </div>
                )}

                {form.late_registration_price && (
                  <div className="rounded-lg bg-card p-3 border border-border">
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold text-amber-600">Late Registration</span>
                    <div className="mt-1 font-bold text-base text-amber-600">
                      ₹{(Number(form.late_registration_price) + (Number(form.late_registration_price) * (Number(form.gst_percent) || 0) / 100)).toFixed(2)}
                    </div>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">
                      (₹{Number(form.late_registration_price).toFixed(2)} base + {Number(form.gst_percent) || 0}% GST)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-border/50 pt-4 mt-2">
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <Label className="cursor-pointer">Featured on home page</Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90"
        >
          {busy ? "Saving..." : "Save event"}
        </Button>
      </form>
    </div>
  );
}
