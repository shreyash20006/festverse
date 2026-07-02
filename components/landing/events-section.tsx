"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import type { Event } from "@/types/database";

interface Props {
  featured: Partial<Event>[];
  upcoming: Partial<Event>[];
}

export function LandingEvents({ featured, upcoming }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Featured</span>
                <h2 className="font-display text-3xl font-bold text-foreground">Spotlight Events</h2>
              </div>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {featured.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard event={event} featured />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Upcoming */}
        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Upcoming</span>
              <h2 className="font-display text-3xl font-bold text-foreground">Upcoming Events</h2>
            </div>
            <Link href="/events">
              <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-border bg-white">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No upcoming events</h3>
              <p className="text-sm text-muted-foreground">Check back soon for new events!</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {upcoming.map((event) => (
                <motion.div key={event.id} variants={itemVariants}>
                  <EventCard event={event} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/events">
              <Button variant="outline" className="gap-2">
                View All Events <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
