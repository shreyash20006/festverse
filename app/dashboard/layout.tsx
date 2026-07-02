import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentLayout } from "@/components/layout/student-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, prn, verified")
    .eq("id", user.id)
    .single();

  if (!profile?.verified || !profile?.prn) {
    redirect("/verify-prn");
  }

  return <StudentLayout avatarUrl={profile?.avatar_url}>{children}</StudentLayout>;
}
