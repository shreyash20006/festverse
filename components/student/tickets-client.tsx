"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Calendar, MapPin, Ticket, CheckCircle, Download, QrCode } from "lucide-react";
import { generateQRDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";

interface Props {
  tickets: any[];
}

export function TicketsClient({ tickets }: Props) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR data URLs for all tickets
    const generateAll = async () => {
      const map: Record<string, string> = {};
      for (const t of tickets) {
        if (t.qr_token) {
          map[t.id] = await generateQRDataUrl(t.qr_token, { size: 280 });
        }
      }
      setQrMap(map);
    };
    generateAll();
  }, [tickets]);

  if (!tickets.length) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Tickets</h1>
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Ticket className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No tickets yet</h3>
          <p className="text-sm text-muted-foreground">Register for an event to receive your QR ticket.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">My Tickets</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => {
          const isExpanded = expanded === ticket.id;
          const isUsed = ticket.status === "used";
          const isCancelled = ticket.status === "cancelled";

          return (
            <Card
              key={ticket.id}
              className={cn(
                "overflow-hidden transition-all duration-200",
                isUsed && "opacity-60",
                isCancelled && "opacity-40"
              )}
            >
              <CardContent className="p-0">
                {/* Event header */}
                <div className="gradient-brand p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">FestVerse Ticket</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      ticket.status === "active" ? "bg-white/20" :
                      ticket.status === "used" ? "bg-success/40" : "bg-destructive/40"
                    )}>
                      {ticket.status === "active" ? "✓ Valid" : ticket.status === "used" ? "Used" : "Cancelled"}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg leading-tight">{ticket.events?.title}</h3>
                  <div className="flex items-center gap-1 mt-1 text-white/80 text-xs">
                    <Calendar className="h-3 w-3" />
                    {ticket.events?.start_at ? formatDate(ticket.events.start_at, "EEE, d MMM yyyy · h:mm a") : ""}
                  </div>
                  {ticket.events?.venue && (
                    <div className="flex items-center gap-1 mt-0.5 text-white/80 text-xs">
                      <MapPin className="h-3 w-3" />
                      {ticket.events.venue}
                    </div>
                  )}
                </div>

                {/* Dashed separator */}
                <div className="border-t-2 border-dashed border-border mx-4" />

                {/* Ticket code */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket Code</p>
                    <p className="font-mono font-bold text-sm text-foreground">{ticket.ticket_code}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                    className="gap-1 text-xs"
                  >
                    <QrCode className="h-4 w-4" />
                    {isExpanded ? "Hide" : "Show"} QR
                  </Button>
                </div>

                {/* QR Code expandable */}
                {isExpanded && qrMap[ticket.id] && (
                  <div className="px-4 pb-4 flex flex-col items-center gap-3">
                    <img
                      src={qrMap[ticket.id]}
                      alt="QR Code"
                      className="rounded-xl border border-border"
                      width={200}
                      height={200}
                    />
                    {ticket.checked_in_at && (
                      <div className="flex items-center gap-1.5 text-xs text-success font-semibold">
                        <CheckCircle className="h-4 w-4" />
                        Checked in at {formatDateTime(ticket.checked_in_at)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
