import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LandingHero } from "@/components/landing/hero";

export const dynamic = "force-dynamic";
import { LandingEvents } from "@/components/landing/events-section";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingAbout } from "@/components/landing/about";
import { LandingFAQ } from "@/components/landing/faq";
import { LandingContact } from "@/components/landing/contact";

export const metadata: Metadata = {
  title: "FestVerse — Official Event Platform of TGPCOP",
  description: "Discover, register, and attend events at TGPCOP. The official event management platform for Tulsiramji Gaikwad-Patil College of Pharmacy.",
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featuredEvents } = await supabase
    .from("events")
    .select("id, slug, title, short_description, banner_url, category, start_at, end_at, venue, price_inr, is_paid, capacity, status")
    .eq("status", "published")
    .eq("featured", true)
    .order("start_at", { ascending: true })
    .limit(3);

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, slug, title, short_description, banner_url, category, start_at, end_at, venue, price_inr, is_paid, capacity, status")
    .eq("status", "published")
    .gt("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(6);

  return (
    <>
      <LandingHero />
      <LandingEvents featured={featuredEvents ?? []} upcoming={upcomingEvents ?? []} />
      <LandingHowItWorks />
      <LandingAbout />
      <LandingFAQ />
      <LandingContact />
    </>
  );
}
