import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { CategoryBadge } from "@/components/category-badge";

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  category: string;
  banner_url: string | null;
  venue: string | null;
  start_at: string;
  is_paid: boolean;
  price_inr: number;
  capacity: number | null;
  featured?: boolean;
}

export function EventCard({ event, registrationCount }: { event: EventCardData; registrationCount?: number }) {
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-mesh">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="h-12 w-12 text-white/40" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <CategoryBadge category={event.category} />
          {event.featured && (
            <span className="rounded-full bg-gradient-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-glow">
              Featured
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <div className="glass rounded-xl px-3 py-1.5 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wider text-foreground/70">
              {format(new Date(event.start_at), "MMM")}
            </div>
            <div className="font-display text-lg font-bold leading-none text-foreground">
              {format(new Date(event.start_at), "d")}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-2 font-display text-lg font-semibold tracking-tight text-foreground">
            {event.title}
          </h3>
          {event.short_description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {event.short_description}
            </p>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {event.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {event.venue}
            </span>
          )}
          {typeof registrationCount === "number" && event.capacity && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {registrationCount}/{event.capacity}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-display text-base font-bold text-foreground">
            {event.is_paid && Number(event.price_inr) > 0
              ? `₹${Number(event.price_inr).toLocaleString("en-IN")}`
              : "Free"}
          </span>
          <span className="text-xs font-semibold text-primary group-hover:underline">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
