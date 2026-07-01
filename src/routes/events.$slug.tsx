import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Users, Ticket as TicketIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useServerFn } from "@tanstack/react-start";
import { registerForFreeEvent } from "@/lib/registration.functions";
import { preparePaidEventCheckout, verifyPaidEventCheckout } from "@/lib/payments-checkout.functions";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { toast } from "sonner";
import { TeamRegistrationDialog } from "@/components/team-registration-dialog";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", params.slug)
      .in("status", ["published", "completed"])
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { event: data };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.event.title} — FestVerse` },
          {
            name: "description",
            content:
              loaderData.event.short_description ??
              `${loaderData.event.title} at your college. Register now.`,
          },
          { property: "og:title", content: loaderData.event.title },
          {
            property: "og:description",
            content:
              loaderData.event.short_description ??
              `${loaderData.event.title} at your college. Register now.`,
          },
          ...(loaderData.event.banner_url
            ? [
                { property: "og:image", content: loaderData.event.banner_url as string },
                { name: "twitter:image", content: loaderData.event.banner_url as string },
              ]
            : []),
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold">Event not found</h1>
        <Link to="/events" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
          ← Back to all events
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { event } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const register = useServerFn(registerForFreeEvent);
  const preparePaid = useServerFn(preparePaidEventCheckout);
  const verifyPaid = useServerFn(verifyPaidEventCheckout);
  const calcPricing = useServerFn(calculateCheckoutPricing);
  const { open: openRazorpay } = useRazorpayCheckout();
  
  const [prn, setPrn] = useState("");
  const [phone, setPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

  const [pricing, setPricing] = useState({
    basePrice: Number(event.price_inr) || 0,
    discount: 0,
    gstAmount: 0,
    totalPayable: Number(event.price_inr) || 0,
  });

  const { data: regCount = 0 } = useQuery({
    queryKey: ["event-reg-count", event.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "confirmed");
      return count ?? 0;
    },
  });

  // Calculate pricing initially
  useEffect(() => {
    if (event.is_paid && Number(event.price_inr) > 0) {
      calcPricing({ data: { eventId: event.id } }).then((res) => {
        setPricing({
          basePrice: res.basePrice,
          discount: res.discount,
          gstAmount: res.gstAmount,
          totalPayable: res.totalPayable,
        });
      });
    }
  }, [event]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await calcPricing({
        data: { eventId: event.id, couponCode: couponCode.trim().toUpperCase() },
      });
      setPricing({
        basePrice: res.basePrice,
        discount: res.discount,
        gstAmount: res.gstAmount,
        totalPayable: res.totalPayable,
      });
      if (res.discount > 0) {
        setCouponApplied(true);
        toast.success("Coupon code applied successfully!");
      } else {
        toast.error("Invalid coupon code or not applicable.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to validate coupon");
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponApplied(false);
    setCouponCode("");
    const res = await calcPricing({ data: { eventId: event.id } });
    setPricing({
      basePrice: res.basePrice,
      discount: res.discount,
      gstAmount: res.gstAmount,
      totalPayable: res.totalPayable,
    });
  };

  const { data: existing } = useQuery({
    queryKey: ["my-reg", event.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("registrations")
        .select("id, tickets(id, ticket_code)")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/events/${event.slug}` } });
      return;
    }
    if (!prn.trim()) {
      toast.error("Please enter your PRN");
      return;
    }
    setSubmitting(true);
    try {
      if (event.is_paid && pricing.totalPayable > 0) {
        const prep = await preparePaid({
          data: {
            eventId: event.id,
            prn,
            phone: phone || undefined,
            couponCode: couponApplied ? couponCode.trim().toUpperCase() : undefined,
          },
        });
        await openRazorpay({
          keyId: prep.keyId,
          orderId: prep.orderId,
          amount: prep.amount,
          currency: prep.currency,
          name: "FestVerse",
          description: prep.eventTitle,
          prefill: {
            name: prep.customer.name,
            email: prep.customer.email,
            contact: prep.customer.contact,
          },
          notes: { registration_id: prep.registrationId },
          onSuccess: async (resp) => {
            try {
              const verified = await verifyPaid({
                data: {
                  registrationId: prep.registrationId,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              toast.success("Payment confirmed! Your ticket is ready.");
              if (verified.ticketId) {
                navigate({ to: "/tickets/$id", params: { id: verified.ticketId } });
              } else {
                navigate({ to: "/my-tickets" });
              }
            } catch (err: any) {
              toast.error(err?.message || "Payment verification failed.");
            }
          },
          onDismiss: () => {
            toast.info("Payment cancelled.");
          },
        });
      } else {
        // Free registration
        const res = await register({ data: { eventId: event.id, prn, phone: phone || undefined } });
        toast.success("Registered! Your QR ticket is ready.");
        navigate({ to: "/tickets/$id", params: { id: res.ticketId } });
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not complete registration");
    } finally {
      setSubmitting(false);
    }
  };

  const seatsLeft = event.capacity ? event.capacity - regCount : null;
  const closed =
    event.registration_closes_at && new Date(event.registration_closes_at) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="container mx-auto px-4 py-6 sm:px-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>
      </div>

      {/* Banner */}
      <div className="container mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-mesh shadow-elevated">
          {event.banner_url ? (
            <img src={event.banner_url} alt="" className="mx-auto block max-h-[70vh] w-full object-contain" />
          ) : (
            <div className="grid aspect-[21/9] w-full place-items-center">
              <Calendar className="h-16 w-16 text-white/40" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 sm:p-10">
            <CategoryBadge category={event.category} />
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {event.title}
            </h1>
            {event.short_description && (
              <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                {event.short_description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight">About this event</h2>
            <div className="prose prose-sm mt-3 max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {event.description || "Details coming soon."}
            </div>
            <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <Info icon={Calendar} label="Date" value={format(new Date(event.start_at), "EEE, MMM d, yyyy")} />
              <Info icon={Clock} label="Time" value={format(new Date(event.start_at), "h:mm a")} />
              {event.venue && <Info icon={MapPin} label="Venue" value={event.venue} />}
              {event.organizer_name && <Info icon={Users} label="Organized by" value={event.organizer_name} />}
            </dl>
          </div>
          {(() => {
            const match = (event.description ?? "").match(/https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform/);
            if (!match) return null;
            const src = `${match[0]}?embedded=true`;
            return (
              <div className="rounded-3xl border border-border bg-card p-2 shadow-card sm:p-4">
                <h2 className="px-4 pt-3 font-display text-xl font-bold tracking-tight">Registration form</h2>
                <p className="px-4 pb-3 pt-1 text-sm text-muted-foreground">Fill out the form below to register.</p>
                <div className="overflow-hidden rounded-2xl">
                  <iframe
                    src={src}
                    className="h-[1400px] w-full border-0"
                    title="Registration form"
                    loading="lazy"
                  >
                    Loading…
                  </iframe>
                </div>
              </div>
            );
          })()}
        </div>


        {/* Register sticky card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-3xl font-bold text-foreground">
                  {event.is_paid && Number(event.price_inr) > 0
                    ? `₹${Number(event.price_inr).toLocaleString("en-IN")}`
                    : "Free"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">per ticket</div>
              </div>
              {seatsLeft !== null && (
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{seatsLeft}</div>
                  <div className="text-xs text-muted-foreground">seats left</div>
                </div>
              )}
            </div>

            {event.is_team_event && (
              <div className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Team Event: <strong>{event.min_team_size}-{event.max_team_size} members</strong> required.
                </span>
              </div>
            )}

            {existing ? (
              <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
                <div className="font-semibold text-success-foreground">You're registered ✓</div>
                <p className="mt-1 text-muted-foreground">
                  Your ticket is ready.
                </p>
                <Button asChild className="mt-3 w-full rounded-full">
                  <Link to="/tickets/$id" params={{ id: (Array.isArray(existing.tickets) ? existing.tickets[0]?.id : (existing.tickets as any)?.id) ?? existing.id }}>
                    <TicketIcon className="mr-2 h-4 w-4" /> View ticket
                  </Link>
                </Button>
              </div>
            ) : closed ? (
              <div className="mt-6 rounded-2xl border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
                Registration is closed.
              </div>
            ) : event.is_team_event ? (
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => {
                    if (!user) {
                      navigate({ to: "/auth", search: { redirect: `/events/${event.slug}` } });
                      return;
                    }
                    setIsTeamDialogOpen(true);
                  }}
                  className="h-11 w-full rounded-full bg-gradient-brand text-base font-semibold text-white shadow-glow hover:opacity-90 cursor-pointer"
                >
                  Register as Team / Join Team
                </Button>
                <TeamRegistrationDialog
                  eventId={event.id}
                  eventTitle={event.title}
                  minTeamSize={event.min_team_size}
                  maxTeamSize={event.max_team_size}
                  isOpen={isTeamDialogOpen}
                  onOpenChange={setIsTeamDialogOpen}
                  onSuccess={(ticketId) => {
                    navigate({ to: "/tickets/$id", params: { id: ticketId } });
                  }}
                />
                {!user && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    You'll need to sign in to complete registration.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="prn">PRN <span className="text-destructive">*</span></Label>
                  <Input
                    id="prn"
                    placeholder="e.g. TGP24001"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                    required
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Verified against the official student list.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+91 ..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 rounded-xl text-xs"
                  />
                </div>

                {/* Coupon Code section */}
                {event.is_paid && Number(event.price_inr) > 0 && (
                  <div className="space-y-1.5 border-t border-border/40 pt-3">
                    <Label htmlFor="coupon" className="text-xs">Coupon Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="coupon"
                        placeholder="ENTER CODE"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={couponApplied}
                        className="rounded-xl h-9 text-xs font-semibold tracking-wider"
                      />
                      {couponApplied ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveCoupon}
                          className="rounded-xl h-9 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/5 shrink-0 cursor-pointer"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim()}
                          className="rounded-xl h-9 text-xs font-bold bg-primary text-white hover:bg-primary/90 shrink-0 cursor-pointer"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Pricing Breakdown breakdown */}
                {event.is_paid && Number(event.price_inr) > 0 && (
                  <div className="space-y-2.5 rounded-2xl bg-muted/40 p-4 border border-border/50 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Event Price</span>
                      <span>₹{pricing.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <div className="flex justify-between text-success font-semibold">
                        <span>Discount</span>
                        <span>-₹{pricing.discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {pricing.gstAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST ({event.gst_percent || 18}%)</span>
                        <span>+₹{pricing.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border/80 pt-2 font-bold text-sm text-foreground">
                      <span>Total Payable</span>
                      <span>₹{pricing.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 h-11 w-full rounded-full bg-gradient-brand text-base font-semibold text-white shadow-glow hover:opacity-90 cursor-pointer"
                >
                  {submitting
                    ? "Processing..."
                    : event.is_paid && pricing.totalPayable > 0
                    ? `Pay ₹${pricing.totalPayable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "Register — it's free"}
                </Button>
                {!user && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    You'll need to sign in to complete registration.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand-soft">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
