import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminStudentsClient } from "@/components/admin/students-client";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, prn, full_name, email, phone, department, year_of_study, is_active, created_at")
    .order("full_name");

  return <AdminStudentsClient students={(students ?? []) as any} />;
}
