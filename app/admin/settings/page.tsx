import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminSettingsClient } from "@/components/admin/settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: college } = await supabase
    .from("colleges")
    .select("*")
    .eq("slug", "tgpcop")
    .single();

  return <AdminSettingsClient college={college} />;
}
