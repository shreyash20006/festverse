"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, Users, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Student } from "@/types/database";

interface Props {
  students: Student[];
}

function exportCSV(data: Student[]) {
  const headers = ["PRN", "Full Name", "Email", "Phone", "Department", "Year", "Active", "Registered"];
  const rows = data.map((s) => [s.prn, s.full_name, s.email ?? "", s.phone ?? "", s.department ?? "", s.year_of_study ?? "", s.is_active ? "Yes" : "No", formatDate(s.created_at)]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminStudentsClient({ students }: Props) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const departments = Array.from(new Set(students.map((s) => s.department).filter(Boolean))) as string[];

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !search || s.prn.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || s.department === deptFilter;
    const matchActive = activeFilter === "all" || (activeFilter === "active" ? s.is_active : !s.is_active);
    return matchSearch && matchDept && matchActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} students in PRN whitelist</p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors card-shadow"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Students", value: students.length, icon: Users, color: "#7C3AED" },
          { label: "Active", value: students.filter((s) => s.is_active).length, icon: CheckCircle, color: "#10B981" },
          { label: "Inactive", value: students.filter((s) => !s.is_active).length, icon: XCircle, color: "#EF4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by PRN, name, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <UserPlus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No students found.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">PRN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((student, idx) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{student.prn}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{student.full_name}</p>
                      {student.email && <p className="text-xs text-muted-foreground">{student.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.department ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.year_of_study ? `Year ${student.year_of_study}` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={student.is_active ? "success" : "muted"}>{student.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(student.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
