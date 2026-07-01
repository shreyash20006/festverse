import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { bulkUploadStudents } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({ meta: [{ title: "Students · Admin · CampusConnect" }] }),
  component: StudentsPage,
});

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const prnI = idx("prn");
  const nameI = idx("full_name") !== -1 ? idx("full_name") : idx("name");
  const emailI = idx("email");
  const phoneI = idx("phone");
  const deptI = idx("department");
  const yearI = idx("year_of_study") !== -1 ? idx("year_of_study") : idx("year");
  if (prnI === -1 || nameI === -1) throw new Error('CSV must include "prn" and "full_name" columns');
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return {
      prn: cells[prnI],
      full_name: cells[nameI],
      email: emailI !== -1 ? cells[emailI] : undefined,
      phone: phoneI !== -1 ? cells[phoneI] : undefined,
      department: deptI !== -1 ? cells[deptI] : undefined,
      year_of_study: yearI !== -1 && cells[yearI] ? Number(cells[yearI]) : undefined,
    };
  }).filter((r) => r.prn && r.full_name);
}

function StudentsPage() {
  const upload = useServerFn(bulkUploadStudents);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const { data: students = [], refetch } = useQuery({
    queryKey: ["admin", "students", q],
    queryFn: async () => {
      let query = supabase.from("students").select("id, prn, full_name, email, department, year_of_study").order("prn").limit(200);
      if (q) query = query.or(`prn.ilike.%${q}%,full_name.ilike.%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("No valid rows found");
      const res = await upload({ data: { rows } });
      toast.success(`Uploaded ${res.inserted} students`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Students (PRN whitelist)</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a CSV with columns: <code>prn, full_name, email, phone, department, year_of_study</code>.
        Only listed PRNs can register for events.
      </p>

      <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-card">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-semibold">Upload student CSV</p>
        <p className="mt-1 text-xs text-muted-foreground">Max 5000 rows per upload. Existing PRNs will be updated.</p>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button asChild disabled={busy} className="mt-4 rounded-full bg-gradient-brand text-white shadow-glow">
          <label htmlFor="csv" className="cursor-pointer">{busy ? "Uploading..." : "Choose file"}</label>
        </Button>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
            <Users className="h-4 w-4" /> Recent students
          </h2>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search PRN or name"
            className="w-64 rounded-full"
          />
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">PRN</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Year</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No students. Upload a CSV above.</td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-none hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono">{s.prn}</td>
                  <td className="px-4 py-2.5">{s.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.department ?? "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.year_of_study ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
