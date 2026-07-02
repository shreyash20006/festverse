import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminReportsClient } from "@/components/admin/reports-client";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [
    { data: registrations },
    { data: payments },
    { data: attendance },
    { data: certificates },
    { data: events },
    { data: regCounts },
  ] = await Promise.all([
    supabase.from("registrations").select("id, full_name, email, prn, department, status, amount_paid, created_at, events(title)").order("created_at", { ascending: false }),
    supabase.from("payments").select("id, provider_order_id, provider_payment_id, amount_inr, status, created_at, events(title)").order("created_at", { ascending: false }),
    supabase.from("attendance").select("id, scanned_at, scan_method, scanned_by, events(title), tickets(ticket_code, registrations(full_name))").order("scanned_at", { ascending: false }),
    supabase.from("certificates").select("id, certificate_code, full_name, event_title, issued_at, verification_token").order("issued_at", { ascending: false }),
    supabase.from("events").select("id, title, category, status, start_at, venue, is_paid, price_inr, capacity").order("created_at", { ascending: false }),
    supabase.from("registrations").select("event_id"),
  ]);

  const countMap: Record<string, number> = {};
  regCounts?.forEach((r) => {
    countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
  });

  const eventsWithCounts = events?.map((e) => ({ ...e, registrations: countMap[e.id] ?? 0 })) ?? [];

  return (
    <AdminReportsClient
      registrations={registrations ?? []}
      payments={payments ?? []}
      attendance={attendance ?? []}
      certificates={certificates ?? []}
      events={eventsWithCounts}
    />
  );
}
