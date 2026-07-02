import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminEventsClient } from "@/components/admin/events-client";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, category, status, start_at, end_at, venue, is_paid, price_inr, capacity, featured, created_at")
    .order("created_at", { ascending: false });

  const { data: registrationCounts } = await supabase
    .from("registrations")
    .select("event_id");

  const countMap: Record<string, number> = {};
  registrationCounts?.forEach((r) => {
    countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
  });

  return <AdminEventsClient events={events ?? []} countMap={countMap} />;
}
