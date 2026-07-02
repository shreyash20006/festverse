import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Calendar, MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "My Registrations" };

export default async function RegistrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, status, amount_paid, created_at, events(id, slug, title, start_at, venue, banner_url, category, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const STATUS_MAP: Record<string, { label: string; icon: any; class: string }> = {
    confirmed: { label: "Confirmed", icon: CheckCircle, class: "bg-success/10 text-success" },
    pending_payment: { label: "Pending Payment", icon: Clock, class: "bg-warning/10 text-warning" },
    cancelled: { label: "Cancelled", icon: XCircle, class: "bg-destructive/10 text-destructive" },
    refunded: { label: "Refunded", icon: XCircle, class: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">My Registrations</h1>

      {!registrations?.length ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No registrations yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Browse upcoming events and register to see them here.</p>
          <Link href="/events" className="text-sm font-semibold text-primary hover:underline">Browse Events →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg: any) => {
            const s = STATUS_MAP[reg.status] ?? STATUS_MAP.confirmed;
            const StatusIcon = s.icon;
            return (
              <Card key={reg.id} className="hover:card-shadow-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <Link href={`/events/${reg.events?.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors truncate">
                          {reg.events?.title}
                        </Link>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.class}`}>
                          <StatusIcon className="h-3 w-3" />{s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {reg.events?.start_at && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />{formatDate(reg.events.start_at)}
                          </span>
                        )}
                        {reg.events?.venue && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{reg.events.venue}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{reg.amount_paid > 0 ? formatCurrency(reg.amount_paid) : "Free"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(reg.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
