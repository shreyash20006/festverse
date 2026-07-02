import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentSettingsClient } from "@/components/student/settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, department, year_of_study, prn")
    .eq("id", user.id)
    .single();

  return <StudentSettingsClient profile={profile} userId={user.id} userEmail={user.email ?? ""} />;
}
