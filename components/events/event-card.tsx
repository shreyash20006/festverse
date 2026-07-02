"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatDate, formatCurrency, EVENT_CATEGORIES } from "@/lib/utils";
import { Calendar, MapPin, Users, Tag } from "lucide-react";
import type { Event } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  event: Partial<Event>;
  featured?: boolean;
}

export function EventCard({ event, featured }: Props) {
  const cat = EVENT_CATEGORIES.find((c) => c.value === event.category);

  return (
    <Link href={`/events/${event.slug}`} className="block group h-full">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full rounded-2xl border border-border bg-white overflow-hidden card-shadow group-hover:card-shadow-hover transition-shadow duration-300"
      >
        {/* Banner */}
        <div className={cn("relative overflow-hidden", featured ? "h-52" : "h-44")}>
          {event.banner_url ? (
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${cat?.color ?? "#FF6B35"}22, ${cat?.color ?? "#FF6B35"}44)` }}
            >
              <span className="font-display text-5xl font-bold opacity-20" style={{ color: cat?.color }}>
                {event.title?.[0]}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {event.is_paid ? (
              <span className="rounded-full bg-secondary/90 text-white text-xs font-bold px-2.5 py-1">
                ₹{event.price_inr}
              </span>
            ) : (
              <span className="rounded-full bg-success/90 text-white text-xs font-bold px-2.5 py-1">
                FREE
              </span>
            )}
            {cat && (
              <span className="rounded-full bg-white/90 text-xs font-semibold px-2.5 py-1" style={{ color: cat.color }}>
                {cat.label}
              </span>
            )}
          </div>

          {featured && (
            <div className="absolute top-3 right-3">
              <span className="rounded-full bg-primary text-white text-xs font-bold px-2.5 py-1">
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-lg font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {event.title}
          </h3>
          {event.short_description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{event.short_description}</p>
          )}

          <div className="mt-4 space-y-2">
            {event.start_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                {formatDate(event.start_at, "EEEE, d MMM yyyy")}
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            {event.capacity && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                {event.capacity} seats
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
