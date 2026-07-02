import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "New Event" };

export default function NewEventPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Create New Event</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in the details below to create a new event for TGPCOP students.</p>
      </div>
      <EventForm mode="create" />
    </div>
  );
}
