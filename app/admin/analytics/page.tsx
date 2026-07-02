import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminAnalyticsClient } from "@/components/admin/analytics-client";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const [
    { count: totalEvents },
    { count: totalRegistrations },
    { data: revenueData },
    { data: attendanceData },
    { data: allRegistrations },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).in("status", ["published", "completed"]),
    supabase.from("registrations").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("payments").select("amount_inr").eq("status", "success"),
    supabase.from("tickets").select("id").not("checked_in_at", "is", null),
    supabase.from("registrations").select("id, created_at, event_id, status, events(category, title)").eq("status", "confirmed"),
  ]);

  const totalRevenue = revenueData?.reduce((acc, p) => acc + Number(p.amount_inr), 0) ?? 0;
  const totalAttendance = attendanceData?.length ?? 0;
  const attendanceRate = totalRegistrations && totalRegistrations > 0 ? Math.round((totalAttendance / totalRegistrations) * 100) : 0;

  // Registrations by month
  const monthMap: Record<string, number> = {};
  allRegistrations?.forEach((r) => {
    const key = format(new Date(r.created_at), "MMM yy");
    monthMap[key] = (monthMap[key] ?? 0) + 1;
  });
  const registrationsByMonth = Object.entries(monthMap).map(([month, count]) => ({ month, count })).slice(-6);

  // Category distribution
  const categoryMap: Record<string, number> = {};
  allRegistrations?.forEach((r) => {
    const cat = (r as any).events?.category ?? "other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
  });
  const registrationsByCategory = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

  // Revenue by event (top 6)
  const { data: paymentsByEvent } = await supabase
    .from("payments")
    .select("amount_inr, events(title)")
    .eq("status", "success");

  const revenueMap: Record<string, number> = {};
  paymentsByEvent?.forEach((p) => {
    const title = (p as any).events?.title ?? "Unknown";
    revenueMap[title] = (revenueMap[title] ?? 0) + Number(p.amount_inr);
  });
  const revenueByEvent = Object.entries(revenueMap)
    .map(([event, revenue]) => ({ event: event.length > 20 ? event.slice(0, 20) + "…" : event, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return (
    <AdminAnalyticsClient
      data={{
        stats: {
          totalEvents: totalEvents ?? 0,
          totalRegistrations: totalRegistrations ?? 0,
          totalRevenue,
          totalAttendance,
        },
        registrationsByMonth,
        revenueByEvent,
        registrationsByCategory,
        attendanceRate,
      }}
    />
  );
}
