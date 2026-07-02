"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, Users, Tag, Clock, ExternalLink,
  CheckCircle, ArrowLeft, Share2, IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDate, formatCurrency, EVENT_CATEGORIES, isRegistrationOpen } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { generateQRToken, generateTicketCode } from "@/lib/qr";
import { toast } from "@/hooks/use-toast";
import type { Event } from "@/types/database";

interface Props {
  event: Event;
  user: any | null;
  userProfile: any | null;
  isRegistered: boolean;
  registrationCount: number;
}

export function EventDetailClient({ event, user, userProfile, isRegistered, registrationCount }: Props) {
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(isRegistered);
  const router = useRouter();
  const supabase = createClient();
  const cat = EVENT_CATEGORIES.find((c) => c.value === event.category);
  const regOpen = isRegistrationOpen(event.registration_opens_at, event.registration_closes_at);
  const isFull = event.capacity ? registrationCount >= event.capacity : false;

  const handleFreeRegister = async () => {
    if (!user) { router.push(`/login?redirect=/events/${event.slug}`); return; }
    if (!userProfile?.verified) { router.push("/verify-prn"); return; }
    setRegistering(true);
    try {
      const { data: regData, error: regError } = await supabase
        .from("registrations")
        .insert({
          event_id: event.id,
          user_id: user.id,
          prn: userProfile.prn,
          full_name: userProfile.full_name,
          email: user.email,
          phone: userProfile.phone ?? null,
          department: userProfile.department ?? null,
          status: "confirmed",
          amount_paid: 0,
        })
        .select("id")
        .single();
      if (regError) throw regError;

      // Issue ticket linked to registration
      const qrToken = generateQRToken();
      const ticketCode = generateTicketCode();
      await supabase.from("tickets").insert({
        event_id: event.id,
        user_id: user.id,
        registration_id: regData.id,
        ticket_code: ticketCode,
        qr_token: qrToken,
        status: "active",
      });

      toast({ title: "Registered! 🎉", description: "Your QR ticket is ready in My Tickets." });
      setRegistered(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Registration failed", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const handlePaidRegister = async () => {
    if (!user) { router.push(`/login?redirect=/events/${event.slug}`); return; }
    if (!userProfile?.verified) { router.push("/verify-prn"); return; }

    setRegistering(true);
    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, amount: event.price_inr }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FestVerse · TGPCOP",
        description: event.title,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              eventId: event.id,
              internalPaymentId: orderData.paymentId,
              registrationData: {
                prn: userProfile.prn,
                full_name: userProfile.full_name,
                email: user.email,
                phone: userProfile.phone,
                department: userProfile.department,
                amount: event.price_inr,
              },
            }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            toast({ title: "Payment successful! 🎉", description: "Your QR ticket is ready in My Tickets." });
            setRegistered(true);
          } else {
            toast({ title: "Payment verification failed", description: result.error, variant: "destructive" });
          }
        },
        prefill: {
          name: userProfile.full_name,
          email: user.email,
          contact: userProfile.phone ?? "",
        },
        theme: { color: "#FF6B35" },
      };

      // @ts-ignore
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Payment failed", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="pt-20 pb-16 min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link href="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner */}
            {event.banner_url ? (
              <img src={event.banner_url} alt={event.title} className="w-full aspect-video object-cover rounded-2xl" />
            ) : (
              <div className="w-full aspect-video rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat?.color ?? "#FF6B35"}22, ${cat?.color ?? "#FF6B35"}55)` }}>
                <span className="font-display text-8xl font-black opacity-20" style={{ color: cat?.color }}>{event.title[0]}</span>
              </div>
            )}

            {/* Title + meta */}
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {cat && <span className="rounded-full text-xs font-bold px-3 py-1" style={{ backgroundColor: `${cat.color}18`, color: cat.color }}>{cat.label}</span>}
                {event.featured && <span className="rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">Featured</span>}
                <span className={`rounded-full text-xs font-bold px-3 py-1 ${event.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {event.status === "published" ? "Open" : event.status}
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">{event.title}</h1>
              {event.short_description && <p className="text-lg text-muted-foreground leading-relaxed mb-4">{event.short_description}</p>}
            </div>

            {/* Description */}
            {event.description && (
              <Card>
                <CardContent className="p-6 prose prose-sm max-w-none text-foreground">
                  <h3 className="font-display font-bold text-lg mb-3">About This Event</h3>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</div>
                </CardContent>
              </Card>
            )}

            {/* Rules */}
            {event.rules && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-display font-bold text-lg mb-3">Rules & Guidelines</h3>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.rules}</div>
                </CardContent>
              </Card>
            )}

            {/* Extra details */}
            {(event.what_to_bring || event.dress_code) && (
              <Card>
                <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
                  {event.what_to_bring && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-1">What to Bring</h4>
                      <p className="text-sm text-muted-foreground">{event.what_to_bring}</p>
                    </div>
                  )}
                  {event.dress_code && (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-1">Dress Code</h4>
                      <p className="text-sm text-muted-foreground">{event.dress_code}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Registration card */}
            <Card className="sticky top-20">
              <CardContent className="p-6">
                {/* Price */}
                <div className="text-center mb-6">
                  {event.is_paid ? (
                    <>
                      <div className="font-display text-3xl font-black text-secondary">{formatCurrency(event.price_inr)}</div>
                      <p className="text-xs text-muted-foreground">per person</p>
                    </>
                  ) : (
                    <>
                      <div className="font-display text-3xl font-black text-success">FREE</div>
                      <p className="text-xs text-muted-foreground">No registration fee</p>
                    </>
                  )}
                </div>

                {/* CTA */}
                {registered ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 text-success font-semibold py-3 text-sm">
                      <CheckCircle className="h-4 w-4" /> You're Registered!
                    </div>
                    <Link href="/tickets">
                      <Button variant="outline" className="w-full gap-2">View My Ticket</Button>
                    </Link>
                  </div>
                ) : isFull ? (
                  <Button disabled className="w-full">Event is Full</Button>
                ) : !regOpen ? (
                  <Button disabled className="w-full">Registration Closed</Button>
                ) : event.google_form_url ? (
                  <a href={event.google_form_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2">
                      <ExternalLink className="h-4 w-4" /> Register via Google Form
                    </Button>
                  </a>
                ) : event.is_paid ? (
                  <Button onClick={handlePaidRegister} loading={registering} className="w-full gap-2">
                    <IndianRupee className="h-4 w-4" /> Pay & Register
                  </Button>
                ) : (
                  <Button onClick={handleFreeRegister} loading={registering} className="w-full">
                    Register Now
                  </Button>
                )}

                {event.capacity && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{registrationCount} / {event.capacity} registered</span>
                      <span>{Math.round((registrationCount / event.capacity) * 100)}% full</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((registrationCount / event.capacity) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{formatDate(event.start_at, "EEEE, d MMMM yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.start_at, "h:mm a")} – {formatDate(event.end_at, "h:mm a")}</p>
                    </div>
                  </div>
                  {event.venue && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-foreground">{event.venue}</p>
                    </div>
                  )}
                  {event.organizer_name && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{event.organizer_name}</p>
                        {event.organizer_contact && <p className="text-xs text-muted-foreground">{event.organizer_contact}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {event.tags && event.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-1">{tag}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <button
              onClick={() => { if (navigator.share) navigator.share({ title: event.title, url: window.location.href }); else navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors card-shadow"
            >
              <Share2 className="h-4 w-4" /> Share Event
            </button>
          </div>
        </div>
      </div>

      {/* Razorpay script */}
      {event.is_paid && (
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      )}
    </div>
  );
}
