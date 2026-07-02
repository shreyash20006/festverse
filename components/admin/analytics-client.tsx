"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, EVENT_CATEGORIES } from "@/lib/utils";
import { Calendar, Users, IndianRupee, CheckCircle } from "lucide-react";

interface AnalyticsData {
  stats: {
    totalEvents: number;
    totalRegistrations: number;
    totalRevenue: number;
    totalAttendance: number;
  };
  registrationsByMonth: { month: string; count: number }[];
  revenueByEvent: { event: string; revenue: number }[];
  registrationsByCategory: { category: string; count: number }[];
  attendanceRate: number;
}

interface Props {
  data: AnalyticsData;
}

const CHART_COLORS = ["#FF6B35", "#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6", "#6B7280"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-border bg-white p-3 card-shadow text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue") ? formatCurrency(p.value) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminAnalyticsClient({ data }: Props) {
  const categoryData = useMemo(() => {
    return data.registrationsByCategory.map((d) => {
      const cat = EVENT_CATEGORIES.find((c) => c.value === d.category);
      return { ...d, label: cat?.label ?? d.category, color: cat?.color ?? "#6B7280" };
    });
  }, [data.registrationsByCategory]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Overview of events, registrations, and revenue.</p>
      </div>

      {/* KPI */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          { label: "Total Events", value: data.stats.totalEvents.toString(), icon: Calendar, color: "#FF6B35" },
          { label: "Registrations", value: data.stats.totalRegistrations.toLocaleString("en-IN"), icon: Users, color: "#7C3AED" },
          { label: "Total Revenue", value: formatCurrency(data.stats.totalRevenue), icon: IndianRupee, color: "#10B981" },
          { label: "Attendance", value: `${data.stats.totalAttendance} (${data.attendanceRate}%)`, icon: CheckCircle, color: "#F59E0B" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Registrations by month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrations by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {data.registrationsByMonth.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.registrationsByMonth} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Registrations" fill="#FF6B35" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by event */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Event</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByEvent.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">No paid events yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.revenueByEvent} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="event" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrations by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Summary table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-8">No data yet.</p>
              ) : (
                categoryData
                  .sort((a, b) => b.count - a.count)
                  .map((cat) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-foreground flex-1">{cat.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(cat.count / Math.max(...categoryData.map((c) => c.count))) * 100}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground w-10 text-right">{cat.count}</span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
