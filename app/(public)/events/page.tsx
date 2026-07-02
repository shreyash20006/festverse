import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventsBrowseClient } from "@/components/events/events-browse-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "Discover all upcoming and past events at TGPCOP.",
};

export default async function EventsPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, slug, title, short_description, banner_url, category, start_at, end_at, venue, price_inr, is_paid, capacity, featured, status")
    .eq("status", "published")
    .order("start_at", { ascending: true });

  if (searchParams.category && searchParams.category !== "all") {
    query = query.eq("category", searchParams.category);
  }

  const { data: events } = await query;

  return <EventsBrowseClient initialEvents={events ?? []} />;
}
