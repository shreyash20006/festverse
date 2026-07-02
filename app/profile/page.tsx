import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/student/profile-client";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, phone, department, prn, year_of_study, verified, created_at")
    .eq("id", user.id)
    .single();

  return <ProfileClient profile={profile} userEmail={user.email ?? ""} />;
}
