import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryBadge } from "@/components/category-badge";
import { ArrowLeft, Calendar, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tickets/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("tickets")
      .select(
        "id, ticket_code, qr_token, status, checked_in_at, issued_at, events(id, title, banner_url, venue, start_at, end_at, category), registrations(full_name, prn, email, teams(id, name, invite_code))"
      )
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { ticket: data };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${(loaderData as any)?.ticket?.events?.title ?? "Ticket"} — CampusConnect` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Ticket not found</h1>
        <Link to="/my-tickets" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          ← Back to my tickets
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    </div>
  ),
  component: TicketPage,
});

function TicketPage() {
  const { ticket } = Route.useLoaderData() as any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, ticket.qr_token, { width: 320, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } }).catch(() => {});
    QRCode.toDataURL(ticket.qr_token, { width: 800, margin: 2 }).then(setQrUrl).catch(() => {});
  }, [ticket.qr_token]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 sm:px-6">
        <Link to="/my-tickets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </Link>
      </div>

      <div className="container mx-auto max-w-md px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
          <div className="relative aspect-[16/9] bg-gradient-mesh">
            {ticket.events?.banner_url && (
              <img src={ticket.events.banner_url} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute left-4 top-4">
              <CategoryBadge category={ticket.events?.category ?? "other"} />
            </div>
          </div>
          <div className="p-6">
            <h1 className="font-display text-xl font-bold tracking-tight">{ticket.events?.title}</h1>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {ticket.events?.start_at && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(ticket.events.start_at), "EEE, MMM d · h:mm a")}
                </span>
              )}
              {ticket.events?.venue && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {ticket.events.venue}
                </span>
              )}
            </div>

            <div className="my-6 grid place-items-center rounded-2xl border border-dashed border-border bg-background p-6">
              <canvas ref={canvasRef} className="h-[280px] w-[280px]" />
              {ticket.checked_in_at && (
                <div className="mt-4 rounded-full bg-success px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-success-foreground">
                  Checked in · {format(new Date(ticket.checked_in_at), "MMM d, h:mm a")}
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Attendee</dt>
                <dd className="font-semibold">{ticket.registrations?.full_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">PRN</dt>
                <dd className="font-semibold">{ticket.registrations?.prn ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ticket code</dt>
                <dd className="font-mono font-semibold">{ticket.ticket_code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold capitalize">{ticket.status}</dd>
              </div>
            </dl>

            {ticket.registrations?.teams && (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team details</h3>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Team Name</dt>
                    <dd className="font-semibold text-primary">{ticket.registrations.teams.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Invite Code</dt>
                    <dd className="font-mono font-semibold bg-muted px-2 py-0.5 rounded text-foreground inline-block">
                      {ticket.registrations.teams.invite_code}
                    </dd>
                  </div>
                </dl>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Share this invite code with teammates so they can join your team.
                </p>
              </div>
            )}

            {qrUrl && (
              <Button asChild variant="outline" className="mt-5 w-full rounded-full">
                <a href={qrUrl} download={`${ticket.ticket_code}.png`}>
                  <Download className="mr-2 h-4 w-4" /> Download QR
                </a>
              </Button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Present this QR at the venue entry. Do not share it — it's unique to you.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
