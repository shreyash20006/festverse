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
  head: () => ({ meta: [{ title: "Edit event · Admin · CampusConnect" }] }),
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
    is_paid: false,
    price_inr: "0",
    featured: false,
    status: "draft" as any,
    organizer_name: "",
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
      is_paid: !!ev.is_paid,
      price_inr: ev.price_inr != null ? String(ev.price_inr) : "0",
      featured: !!ev.featured,
      status: ev.status ?? "draft",
      organizer_name: ev.organizer_name ?? "",
    });
  }, [ev]);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at || form.start_at).toISOString(),
        registration_closes_at: form.registration_closes_at
          ? new Date(form.registration_closes_at).toISOString()
          : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        price_inr: Number(form.price_inr) || 0,
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

        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.is_paid} onCheckedChange={(v) => set("is_paid", v)} />
            <Label className="cursor-pointer">Paid event</Label>
          </div>
          {form.is_paid && (
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" min="0" step="1" value={form.price_inr} onChange={(e) => set("price_inr", e.target.value)} className="mt-1.5 w-32 rounded-xl" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <Label className="cursor-pointer">Featured on home</Label>
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
