import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Ticket, Award, ClipboardList, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: myRegistrations },
    { data: upcomingEvents },
    { count: ticketCount },
    { count: certCount },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, prn, department").eq("id", user.id).single(),
    supabase.from("registrations").select("id, status, created_at, events(id, slug, title, start_at, venue, banner_url, category, is_paid, price_inr)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("events").select("id, slug, title, short_description, banner_url, category, start_at, end_at, venue, price_inr, is_paid").eq("status", "published").gt("start_at", new Date().toISOString()).order("start_at").limit(4),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active"),
    supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {profile?.prn ? `PRN: ${profile.prn}` : ""}{profile?.department ? ` · ${profile.department}` : ""}
          </p>
        </div>
        <Link href="/events">
          <Button className="gap-2">Browse Events</Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: ClipboardList, label: "Registrations", value: myRegistrations?.length ?? 0, href: "/registrations", color: "#FF6B35" },
          { icon: Ticket, label: "Active Tickets", value: ticketCount ?? 0, href: "/tickets", color: "#7C3AED" },
          { icon: Award, label: "Certificates", value: certCount ?? 0, href: "/certificates", color: "#10B981" },
          { icon: Calendar, label: "Upcoming", value: upcomingEvents?.length ?? 0, href: "/events", color: "#F59E0B" },
        ].map(({ icon: Icon, label, value, href, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="p-5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="font-display text-2xl font-bold text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* My Recent Registrations */}
      {(myRegistrations?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">My Registrations</h2>
            <Link href="/registrations">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </div>
          <div className="space-y-3">
            {myRegistrations?.map((reg: any) => (
              <Card key={reg.id} className="p-4 hover:card-shadow-hover transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{reg.events?.title}</p>
                    <p className="text-xs text-muted-foreground">{reg.events?.start_at ? formatDate(reg.events.start_at) : ""}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${reg.status === "confirmed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {reg.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {(upcomingEvents?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-foreground">Upcoming Events</h2>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View All <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingEvents?.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
