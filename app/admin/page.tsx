import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "@/components/admin/dashboard-client";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalEvents },
    { count: totalRegistrations },
    { data: recentActivity },
    { data: todayEvents },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).in("status", ["published", "completed"]),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("id, full_name, created_at, events(title)").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("events")
      .select("id, title, start_at, end_at, status, venue")
      .eq("status", "published")
      .gte("start_at", new Date().toISOString().split("T")[0])
      .lte("start_at", new Date().toISOString().split("T")[0] + "T23:59:59Z")
      .order("start_at"),
  ]);

  const { data: revenueData } = await supabase
    .from("payments")
    .select("amount_inr")
    .eq("status", "success");

  const totalRevenue = revenueData?.reduce((acc, p) => acc + Number(p.amount_inr), 0) ?? 0;

  const { data: attendanceData } = await supabase
    .from("tickets")
    .select("checked_in_at")
    .not("checked_in_at", "is", null);

  return (
    <AdminDashboardClient
      stats={{
        totalEvents: totalEvents ?? 0,
        totalRegistrations: totalRegistrations ?? 0,
        totalRevenue,
        totalAttendance: attendanceData?.length ?? 0,
      }}
      todayEvents={todayEvents ?? []}
      recentActivity={recentActivity ?? []}
    />
  );
}
