import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventDetailClient } from "@/components/events/event-detail-client";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("title, short_description").eq("slug", params.slug).maybeSingle();
  return {
    title: event?.title ?? "Event",
    description: event?.short_description ?? undefined,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .in("status", ["published", "completed"])
    .maybeSingle();

  if (!event || error) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let isRegistered = false;
  let userProfile = null;

  if (user) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isRegistered = !!reg && reg.status === "confirmed";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, prn, department, verified")
      .eq("id", user.id)
      .single();
    userProfile = profile;
  }

  const { count: regCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  return (
    <EventDetailClient
      event={event}
      user={user}
      userProfile={userProfile}
      isRegistered={isRegistered}
      registrationCount={regCount ?? 0}
    />
  );
}
