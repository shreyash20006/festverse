import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createOrUpdateEvent, getEventForEdit, deleteEvent } from "@/lib/admin.functions";
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

export const Route = createFileRoute("/_authenticated/admin/events/$id/edit")({
  head: () => ({ meta: [{ title: "Edit event · Admin · FestVerse" }] }),
  component: EditEventPage,
});

function toLocal(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const save = useServerFn(createOrUpdateEvent);
  const remove = useServerFn(deleteEvent);
  const load = useServerFn(getEventForEdit);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: ev, isLoading } = useQuery({
    queryKey: ["admin", "event", id],
    queryFn: () => load({ data: { id } }),
  });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    short_description: "",
    description: "",
    category: "technical" as any,
    banner_url: "",
    venue: "",
    start_at: "",
    end_at: "",
    registration_closes_at: "",
    capacity: "",
    featured: false,
    status: "draft" as any,
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

  useEffect(() => {
    if (!ev) return;
    setForm({
      title: ev.title ?? "",
      slug: ev.slug ?? "",
      short_description: ev.short_description ?? "",
      description: ev.description ?? "",
      category: ev.category ?? "technical",
      banner_url: ev.banner_url ?? "",
      venue: ev.venue ?? "",
      start_at: toLocal(ev.start_at),
      end_at: toLocal(ev.end_at),
      registration_closes_at: toLocal(ev.registration_closes_at),
      capacity: ev.capacity != null ? String(ev.capacity) : "",
      featured: !!ev.featured,
      status: ev.status ?? "draft",
      organizer_name: ev.organizer_name ?? "",
      // Advanced pricing
      registration_type: (ev.registration_type as any) ?? (ev.is_paid ? "paid" : "free"),
      registration_fee: ev.registration_fee != null ? String(ev.registration_fee) : "0",
      early_bird_price: ev.early_bird_price != null ? String(ev.early_bird_price) : "",
      early_bird_deadline: ev.early_bird_deadline ? toLocal(ev.early_bird_deadline) : "",
      late_registration_price: ev.late_registration_price != null ? String(ev.late_registration_price) : "",
      gst_percent: ev.gst_percent != null ? String(ev.gst_percent) : "0",
      discount_amount: ev.discount_amount != null ? String(ev.discount_amount) : "0",
      coupon_code: ev.coupon_code ?? "",
      max_registrations: ev.max_registrations != null ? String(ev.max_registrations) : "",
      registration_deadline: ev.registration_deadline ? toLocal(ev.registration_deadline) : "",
    });
  }, [ev]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        slug: form.slug,
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
      await save({ data: { id, event: payload } });
      toast.success("Event updated");
      navigate({ to: "/admin/events" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save event");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this event? Registrations and tickets linked to it may also be affected. This cannot be undone.")) return;
    setDeleting(true);
    try {
      await remove({ data: { id } });
      toast.success("Event deleted");
      navigate({ to: "/admin/events" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete event");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-6 py-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Edit event</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update details or remove the event entirely.</p>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={onDelete}
          className="rounded-full"
        >
          {deleting ? "Deleting…" : "Delete event"}
        </Button>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title *</Label>
            <Input required value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input required value={form.slug} onChange={(e) => set("slug", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
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
            <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} className="mt-1.5 rounded-xl" maxLength={280} />
          </div>
          <div className="sm:col-span-2">
            <Label>Full description</Label>
            <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div className="sm:col-span-2">
            <Label>Banner / Poster image</Label>
            <div className="mt-1.5">
              <BannerUpload value={form.banner_url} onChange={(v) => set("banner_url", v)} />
            </div>
            <Input value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} className="mt-2 rounded-xl" placeholder="https://... (optional external URL)" />
          </div>
          <div>
            <Label>Venue</Label>
            <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Start *</Label>
            <Input required type="datetime-local" value={form.start_at} onChange={(e) => set("start_at", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>End *</Label>
            <Input required type="datetime-local" value={form.end_at} onChange={(e) => set("end_at", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Registration closes</Label>
            <Input type="datetime-local" value={form.registration_closes_at} onChange={(e) => set("registration_closes_at", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Organizer name</Label>
            <Input value={form.organizer_name} onChange={(e) => set("organizer_name", e.target.value)} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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

          <div className="flex items-center gap-3 border-t border-border/50 pt-4 mt-2">
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <Label className="cursor-pointer">Featured on home page</Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={busy} className="rounded-full bg-gradient-brand text-white shadow-glow hover:opacity-90">
            {busy ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate({ to: "/admin/events" })}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
