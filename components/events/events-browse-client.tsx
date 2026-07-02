"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/events/event-card";
import { EVENT_CATEGORIES } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  initialEvents: any[];
}

export function EventsBrowseClient({ initialEvents }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = initialEvents.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.short_description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || e.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold text-foreground mb-3">Explore Events</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Discover workshops, seminars, cultural events, sports, and more at TGPCOP.</p>
        </div>

        {/* Search + Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 text-base rounded-2xl"
            />
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => setCategory("all")}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-colors", category === "all" ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground")}
            >
              All Events
            </button>
            {EVENT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition-colors", category === c.value ? "text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground")}
                style={category === c.value ? { backgroundColor: c.color } : {}}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">{filtered.length} event{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No events found</h3>
            <p className="text-sm text-muted-foreground">Try a different search term or category.</p>
          </div>
        ) : (
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filtered.map((event, idx) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <EventCard event={event} featured={event.featured} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
