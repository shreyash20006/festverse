import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentLayout } from "@/components/layout/student-layout";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
  return <StudentLayout avatarUrl={profile?.avatar_url}>{children}</StudentLayout>;
}
