import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "Edit Event" };

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !event) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Edit Event</h1>
        <p className="text-sm text-muted-foreground mt-1">Update event details for: <span className="font-semibold">{event.title}</span></p>
      </div>
      <EventForm mode="edit" event={event} />
    </div>
  );
}
