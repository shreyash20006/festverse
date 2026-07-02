import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TicketsClient } from "@/components/student/tickets-client";

export const metadata: Metadata = { title: "My Tickets" };

export default async function TicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_code, qr_token, status, issued_at, checked_in_at, events(id, slug, title, start_at, end_at, venue, banner_url)")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  return <TicketsClient tickets={tickets ?? []} />;
}
