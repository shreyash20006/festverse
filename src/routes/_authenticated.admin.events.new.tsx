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
  head: () => ({ meta: [{ title: "Create event · Admin · CampusConnect" }] }),
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
    is_paid: false,
    price_inr: "0",
    featured: false,
    status: "draft" as const,
    organizer_name: "",
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
        price_inr: Number(form.price_inr) || 0,
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

        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.is_paid} onCheckedChange={(v) => set("is_paid", v)} />
            <Label className="cursor-pointer">Paid event</Label>
          </div>
          {form.is_paid && (
            <div>
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.price_inr}
                onChange={(e) => set("price_inr", e.target.value)}
                className="mt-1.5 w-32 rounded-xl"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <Label className="cursor-pointer">Featured on home</Label>
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
