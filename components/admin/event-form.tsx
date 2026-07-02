"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_CATEGORIES } from "@/lib/utils";
import type { Event } from "@/types/database";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  slug: z.string().min(3, "Slug required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  short_description: z.string().max(300).optional(),
  description: z.string().optional(),
  category: z.enum(["technical", "cultural", "sports", "workshop", "placement", "pharmacy", "seminar", "other"]),
  venue: z.string().optional(),
  start_at: z.string().min(1, "Start date/time is required"),
  end_at: z.string().min(1, "End date/time is required"),
  registration_opens_at: z.string().optional(),
  registration_closes_at: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  is_paid: z.boolean().default(false),
  price_inr: z.coerce.number().min(0).default(0),
  organizer_name: z.string().optional(),
  organizer_contact: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).default("draft"),
  featured: z.boolean().default(false),
  rules: z.string().optional(),
  what_to_bring: z.string().optional(),
  dress_code: z.string().optional(),
  google_form_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  qr_required: z.boolean().default(true),
  certificate_required: z.boolean().default(false),
  tags: z.string().optional(),
}).refine(
  (data) => !data.end_at || !data.start_at || new Date(data.end_at) > new Date(data.start_at),
  { message: "End time must be after start time", path: ["end_at"] }
);

type EventFormData = z.infer<typeof eventSchema>;

interface Props {
  mode: "create" | "edit";
  event?: Partial<Event>;
}

function toLocalDatetimeInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 16);
}

export function EventForm({ mode, event }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      slug: event?.slug ?? "",
      short_description: event?.short_description ?? "",
      description: event?.description ?? "",
      category: event?.category ?? "other",
      venue: event?.venue ?? "",
      start_at: toLocalDatetimeInput(event?.start_at),
      end_at: toLocalDatetimeInput(event?.end_at),
      registration_opens_at: toLocalDatetimeInput(event?.registration_opens_at),
      registration_closes_at: toLocalDatetimeInput(event?.registration_closes_at),
      capacity: event?.capacity ?? null,
      is_paid: event?.is_paid ?? false,
      price_inr: event?.price_inr ?? 0,
      organizer_name: event?.organizer_name ?? "",
      organizer_contact: event?.organizer_contact ?? "",
      status: event?.status ?? "draft",
      featured: event?.featured ?? false,
      rules: event?.rules ?? "",
      what_to_bring: event?.what_to_bring ?? "",
      dress_code: event?.dress_code ?? "",
      google_form_url: event?.google_form_url ?? "",
      qr_required: event?.qr_required ?? true,
      certificate_required: event?.certificate_required ?? false,
      tags: event?.tags?.join(", ") ?? "",
    },
  });

  const isPaid = watch("is_paid");
  const titleVal = watch("title");

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("title", e.target.value);
    if (mode === "create") {
      setValue("slug", generateSlug(e.target.value));
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: college } = await supabase
        .from("colleges")
        .select("id")
        .eq("slug", "tgpcop")
        .single();

      if (!college) throw new Error("College not found");

      const payload = {
        college_id: college.id,
        title: data.title,
        slug: data.slug,
        short_description: data.short_description || null,
        description: data.description || null,
        category: data.category,
        venue: data.venue || null,
        start_at: new Date(data.start_at).toISOString(),
        end_at: new Date(data.end_at).toISOString(),
        registration_opens_at: data.registration_opens_at ? new Date(data.registration_opens_at).toISOString() : null,
        registration_closes_at: data.registration_closes_at ? new Date(data.registration_closes_at).toISOString() : null,
        capacity: data.capacity || null,
        is_paid: data.is_paid,
        price_inr: data.is_paid ? data.price_inr : 0,
        organizer_name: data.organizer_name || null,
        organizer_contact: data.organizer_contact || null,
        status: data.status,
        featured: data.featured,
        rules: data.rules || null,
        what_to_bring: data.what_to_bring || null,
        dress_code: data.dress_code || null,
        google_form_url: data.google_form_url || null,
        qr_required: data.qr_required,
        certificate_required: data.certificate_required,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        created_by: mode === "create" ? user.id : event?.created_by,
      };

      if (mode === "create") {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast({ title: "Event created!", description: `"${data.title}" is now ${data.status}.` });
      } else {
        const { error } = await supabase.from("events").update(payload).eq("id", event!.id!);
        if (error) throw error;
        toast({ title: "Event updated!", description: `"${data.title}" has been updated.` });
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                {...register("title")}
                onChange={handleTitleChange}
                placeholder="e.g. National Pharmacy Quiz 2025"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input id="slug" {...register("slug")} placeholder="national-pharmacy-quiz-2025" />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...register("category")}
                className="flex h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="short_description">Short Description</Label>
              <Input id="short_description" {...register("short_description")} placeholder="One-liner for event cards" />
              {errors.short_description && <p className="text-xs text-destructive">{errors.short_description.message}</p>}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Full Description</Label>
              <Textarea id="description" {...register("description")} rows={6} placeholder="Detailed event description, schedule, prizes, etc." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & Venue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date, Time & Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start_at">Start Date & Time *</Label>
              <Input id="start_at" type="datetime-local" {...register("start_at")} />
              {errors.start_at && <p className="text-xs text-destructive">{errors.start_at.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_at">End Date & Time *</Label>
              <Input id="end_at" type="datetime-local" {...register("end_at")} />
              {errors.end_at && <p className="text-xs text-destructive">{errors.end_at.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registration_opens_at">Registration Opens</Label>
              <Input id="registration_opens_at" type="datetime-local" {...register("registration_opens_at")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registration_closes_at">Registration Closes</Label>
              <Input id="registration_closes_at" type="datetime-local" {...register("registration_closes_at")} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="venue">Venue / Location</Label>
              <Input id="venue" {...register("venue")} placeholder="e.g. Main Auditorium, TGPCOP" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (seats)</Label>
              <Input id="capacity" type="number" {...register("capacity")} placeholder="Leave blank for unlimited" min={1} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration & Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("is_paid")} className="h-4 w-4 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">This is a paid event</span>
          </label>
          {isPaid && (
            <div className="space-y-1.5">
              <Label htmlFor="price_inr">Registration Fee (₹) *</Label>
              <Input id="price_inr" type="number" step="0.01" min={1} {...register("price_inr")} placeholder="100" />
              {errors.price_inr && <p className="text-xs text-destructive">{errors.price_inr.message}</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="google_form_url">Google Form URL (optional)</Label>
            <Input id="google_form_url" type="url" {...register("google_form_url")} placeholder="https://docs.google.com/forms/..." />
            {errors.google_form_url && <p className="text-xs text-destructive">{errors.google_form_url.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Organizer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="organizer_name">Organizer Name</Label>
              <Input id="organizer_name" {...register("organizer_name")} placeholder="Prof. ABC" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizer_contact">Organizer Contact</Label>
              <Input id="organizer_contact" {...register("organizer_contact")} placeholder="Phone or email" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extra Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="rules">Rules / Guidelines</Label>
            <Textarea id="rules" {...register("rules")} rows={4} placeholder="Event rules, eligibility, and guidelines..." />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="what_to_bring">What to Bring</Label>
              <Input id="what_to_bring" {...register("what_to_bring")} placeholder="ID card, stationery..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dress_code">Dress Code</Label>
              <Input id="dress_code" {...register("dress_code")} placeholder="Formal / Casual / Lab coat..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" {...register("tags")} placeholder="quiz, inter-college, online" />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status")}
                className="flex h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("featured")} className="h-4 w-4 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground">Featured event (shown on homepage)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("qr_required")} className="h-4 w-4 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground">Require QR ticket for entry</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("certificate_required")} className="h-4 w-4 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground">Issue participation certificates</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white card-shadow p-4">
          <Link href="/admin/events">
            <Button type="button" variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Events
            </Button>
          </Link>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => { setValue("status", "draft"); }} disabled={loading}>
              Save as Draft
            </Button>
            <Button type="submit" loading={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {mode === "create" ? "Create Event" : "Update Event"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
