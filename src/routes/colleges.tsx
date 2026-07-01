import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useState } from "react";
import { Search, MapPin, Users, Calendar, ArrowUpRight, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/colleges")({
  head: () => ({ meta: [{ title: "Colleges · CampusConnect" }] }),
  component: CollegesPage,
});

const MOCK_COLLEGE_DETAILS: Record<string, { city: string; events: number; students: number; desc: string }> = {
  tgpcop: { city: "Nagpur", events: 14, students: 840, desc: "Tulsiramji Gaikwad-Patil College of Pharmacy" },
  vnit: { city: "Nagpur", events: 32, students: 4800, desc: "Visvesvaraya National Institute of Technology" },
  coep: { city: "Pune", events: 45, students: 5600, desc: "College of Engineering Pune" },
  pict: { city: "Pune", events: 28, students: 3200, desc: "Pune Institute of Computer Technology" },
  vjti: { city: "Mumbai", events: 52, students: 6100, desc: "Veermata Jijabai Technological Institute" },
};

function CollegesPage() {
  const [search, setSearch] = useState("");

  const { data: dbColleges = [], isLoading } = useQuery({
    queryKey: ["public", "colleges-full-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, name, slug, logo_url, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      return data ?? [];
    }
  });

  // Seed default colleges list if only tgpcop exists
  const colleges = dbColleges.length <= 1 ? [
    ...(dbColleges),
    ...[
      { id: "vnit-id", name: "Visvesvaraya National Institute of Technology", slug: "vnit", logo_url: null },
      { id: "coep-id", name: "College of Engineering Pune", slug: "coep", logo_url: null },
      { id: "pict-id", name: "Pune Institute of Computer Technology", slug: "pict", logo_url: null },
      { id: "vjti-id", name: "Veermata Jijabai Technological Institute", slug: "vjti", logo_url: null }
    ].filter(x => !dbColleges.some(y => y.slug === x.slug))
  ] : dbColleges;

  const filtered = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      {/* Hero section */}
      <section className="relative overflow-hidden py-20 px-6 text-center border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="container relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 uppercase tracking-wider">
            Partner Campuses
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Browse College Portals
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Select a college tenant below to access their official fest registry, view events calendar, and check-in.
          </p>

          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search colleges by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-full border-border bg-background shadow-soft"
            />
          </div>
        </div>
      </section>

      {/* College List */}
      <section className="container mx-auto px-6 py-16 max-w-5xl">
        {isLoading ? (
          <p className="text-center text-muted-foreground text-sm">Loading college database...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">No registered colleges found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const meta = MOCK_COLLEGE_DETAILS[c.slug] || { city: "Maharashtra", events: 5, students: 200, desc: c.name };
              const logo = c.logo_url || "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png";
              return (
                <div 
                  key={c.id} 
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted p-2 overflow-hidden border border-border/40 shrink-0">
                        <img src={logo} alt="" className="h-full w-full object-contain" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> {meta.city}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-base font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {c.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {meta.desc}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-border/40 pt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{meta.events} Events</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      <span>{meta.students}+ Users</span>
                    </div>
                    <a 
                      href={`/c/${c.slug}`}
                      className="inline-flex h-8 items-center gap-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary px-3 text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 ml-2"
                    >
                      Portal <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
