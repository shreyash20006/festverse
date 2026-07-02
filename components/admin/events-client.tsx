"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus, Search, Filter, Edit, Trash2, Eye, Calendar,
  Users, Tag, ArrowUpRight, MoreHorizontal, CheckCircle,
  XCircle, Clock, Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatDate, formatCurrency, EVENT_CATEGORIES } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Event, EventStatus } from "@/types/database";

const STATUS_CONFIG: Record<EventStatus, { label: string; icon: any; class: string }> = {
  draft: { label: "Draft", icon: Clock, class: "bg-muted text-muted-foreground" },
  published: { label: "Published", icon: CheckCircle, class: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", icon: XCircle, class: "bg-destructive/10 text-destructive" },
  completed: { label: "Completed", icon: Archive, class: "bg-secondary/10 text-secondary" },
};

interface Props {
  events: Partial<Event>[];
  countMap: Record<string, number>;
}

export function AdminEventsClient({ events, countMap }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const router = useRouter();
  const supabase = createClient();

  const filtered = events.filter((e) => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted", variant: "destructive" });
      router.refresh();
    }
  };

  const handlePublish = async (id: string, currentStatus: EventStatus) => {
    const newStatus: EventStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Event ${newStatus === "published" ? "published" : "unpublished"}!` });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground">{events.length} total events</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Event</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "published", "draft", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                statusFilter === s ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">No events found</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first event to get started</p>
          <Link href="/admin/events/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Event</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event, idx) => {
            const cat = EVENT_CATEGORIES.find((c) => c.value === event.category);
            const status = STATUS_CONFIG[event.status ?? "draft"];
            const StatusIcon = status.icon;
            const registrations = countMap[event.id!] ?? 0;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
              >
                <Card className="p-4 hover:card-shadow-hover transition-shadow duration-200">
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat?.color ?? "#FF6B35"}18` }}>
                      <Calendar className="h-5 w-5" style={{ color: cat?.color ?? "#FF6B35" }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", status.class)}>
                          <StatusIcon className="h-3 w-3" />{status.label}
                        </span>
                        {event.featured && (
                          <span className="rounded-full bg-primary/10 text-primary text-xs font-bold px-2 py-0.5">Featured</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />{event.start_at ? formatDate(event.start_at) : "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />{registrations}{event.capacity ? `/${event.capacity}` : ""} registered
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: cat?.color }}>
                          <Tag className="h-3 w-3" />{cat?.label}
                        </span>
                        {event.is_paid && (
                          <span className="text-xs font-semibold text-secondary">{formatCurrency(event.price_inr ?? 0)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/events/${event.slug}`} target="_blank">
                        <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <Link href={`/admin/events/${event.id}/edit`}>
                        <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handlePublish(event.id!, event.status ?? "draft")}
                        className={cn("h-8 px-3 rounded-lg text-xs font-semibold transition-colors", event.status === "published" ? "bg-muted text-muted-foreground hover:bg-border" : "bg-success/10 text-success hover:bg-success/20")}
                      >
                        {event.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(event.id!, event.title!)}
                        className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
