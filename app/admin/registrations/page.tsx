import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRegistrationsClient } from "@/components/admin/registrations-client";

export const metadata: Metadata = { title: "Registrations" };

export default async function AdminRegistrationsPage() {
  const supabase = await createClient();

  const [{ data: registrations }, { data: events }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, event_id, user_id, full_name, email, prn, department, status, amount_paid, created_at, events(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, title")
      .order("title"),
  ]);

  return (
    <AdminRegistrationsClient
      registrations={(registrations ?? []) as any}
      events={events ?? []}
    />
  );
}
