"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar, Users, IndianRupee, CheckCircle,
  Plus, ArrowRight, Clock, MapPin, TrendingUp,
  ClipboardList, QrCode, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatTimeAgo } from "@/lib/utils";

interface Props {
  stats: {
    totalEvents: number;
    totalRegistrations: number;
    totalRevenue: number;
    totalAttendance: number;
  };
  todayEvents: any[];
  recentActivity: any[];
}

const KPI_CARDS = [
  { key: "totalEvents", label: "Total Events", icon: Calendar, color: "#FF6B35", format: (v: number) => v.toString() },
  { key: "totalRegistrations", label: "Registrations", icon: Users, color: "#7C3AED", format: (v: number) => v.toLocaleString("en-IN") },
  { key: "totalRevenue", label: "Total Revenue", icon: IndianRupee, color: "#10B981", format: formatCurrency },
  { key: "totalAttendance", label: "Gate Check-Ins", icon: CheckCircle, color: "#F59E0B", format: (v: number) => v.toLocaleString("en-IN") },
];

export function AdminDashboardClient({ stats, todayEvents, recentActivity }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back! Here's what's happening at TGPCOP.</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {KPI_CARDS.map(({ key, label, icon: Icon, color, format }) => (
          <motion.div key={key} variants={cardVariants}>
            <Card className="hover:card-shadow-hover transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {format(stats[key as keyof typeof stats])}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today's Events</CardTitle>
            <Link href="/admin/events">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {todayEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No events today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <Link key={event.id} href={`/admin/events/${event.id}/edit`} className="flex items-start gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{event.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(event.start_at)}
                        </span>
                        {event.venue && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Registrations</CardTitle>
            <Link href="/admin/registrations">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent registrations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((reg: any) => (
                  <div key={reg.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <span className="font-display font-bold text-sm text-secondary">{reg.full_name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{reg.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{reg.events?.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(reg.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/events/new", label: "Create Event", icon: Plus, color: "#FF6B35" },
            { href: "/admin/registrations", label: "View Registrations", icon: ClipboardList, color: "#7C3AED" },
            { href: "/admin/scanner", label: "Open Scanner", icon: QrCode, color: "#10B981" },
            { href: "/admin/certificates", label: "Certificates", icon: Award, color: "#F59E0B" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
