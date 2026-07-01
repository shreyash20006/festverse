import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhookSignature } from "@/lib/razorpay.server";
import { createHmac, randomBytes } from "node:crypto";

let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function genTicketCode(): string {
  return "TCK-" + randomBytes(4).toString("hex").toUpperCase();
}

async function finalisePayment(payment: any) {
  const supabase = getSupabase();
  const notes = payment.notes ?? {};
  const registrationId = notes.registration_id as string | undefined;
  const eventId = notes.event_id as string | undefined;
  const userId = notes.user_id as string | undefined;
  const collegeId = (notes.college_id as string | undefined) || null;

  if (!registrationId || !eventId || !userId) {
    console.warn("Razorpay webhook missing notes", { paymentId: payment.id });
    return;
  }

  // Idempotency
  const { data: existingPay } = await supabase
    .from("payments")
    .select("id, registration_id")
    .eq("provider_payment_id", payment.id)
    .maybeSingle();
  if (existingPay) {
    console.log("Webhook already processed", payment.id);
    return;
  }

  const amountInr = Number(payment.amount ?? 0) / 100;

  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .insert({
      registration_id: registrationId,
      event_id: eventId,
      user_id: userId,
      college_id: collegeId,
      provider_code: "razorpay",
      provider_order_id: payment.order_id ?? null,
      provider_payment_id: payment.id,
      amount_inr: amountInr,
      currency: payment.currency ?? "INR",
      status: "success",
      raw_response: payment,
      idempotency_key: payment.id,
    })
    .select("id")
    .single();
  if (payErr) {
    console.error("Failed to insert payment", payErr);
    throw payErr;
  }

  await supabase
    .from("registrations")
    .update({ status: "confirmed", amount_paid: amountInr, payment_id: paymentRow!.id })
    .eq("id", registrationId);

  // Issue ticket if missing
  const { data: existingTicket } = await supabase
    .from("tickets")
    .select("id")
    .eq("registration_id", registrationId)
    .maybeSingle();

  let ticketId = existingTicket?.id as string | undefined;
  if (!ticketId) {
    const code = genTicketCode();
    const { data: ticket, error: tkErr } = await supabase
      .from("tickets")
      .insert({
        registration_id: registrationId,
        event_id: eventId,
        user_id: userId,
        ticket_code: code,
        qr_token: "PLACEHOLDER",
        status: "active",
      })
      .select("id")
      .single();
    if (tkErr) throw tkErr;
    ticketId = ticket.id as string;

    const signSecret = process.env.TICKET_SIGNING_SECRET;
    if (signSecret) {
      const payload = JSON.stringify({ tid: ticketId, eid: eventId, uid: userId, ts: Date.now() });
      const sig = createHmac("sha256", signSecret).update(payload).digest("base64url");
      const token = Buffer.from(payload).toString("base64url") + "." + sig;
      await supabase.from("tickets").update({ qr_token: token }).eq("id", ticketId);
    }
  }

  const { data: event } = await supabase
    .from("events")
    .select("title, organizer_user_id")
    .eq("id", eventId)
    .single();

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "payment_success",
    title: "Payment received",
    body: `Your ticket for "${event?.title ?? "the event"}" is confirmed. ₹${amountInr} paid.`,
    link: ticketId ? `/tickets/${ticketId}` : null,
  });

  if (event?.organizer_user_id) {
    await supabase.from("notifications").insert({
      user_id: event.organizer_user_id,
      type: "new_paid_registration",
      title: "New paid registration",
      body: `A new attendee registered for "${event.title}" (₹${amountInr}).`,
      link: "/admin/events",
    });
  }

  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "payment.completed",
    entity_type: "registration",
    entity_id: registrationId,
    metadata: {
      event_id: eventId,
      payment_id: paymentRow!.id,
      amount_inr: amountInr,
      provider: "razorpay",
    },
  });

  console.log("Razorpay payment finalised", { registrationId, paymentId: payment.id });
}

async function recordFailure(payment: any) {
  const supabase = getSupabase();
  const notes = payment.notes ?? {};
  if (!notes.registration_id) return;
  await supabase.from("payments").insert({
    registration_id: notes.registration_id,
    event_id: notes.event_id ?? null,
    user_id: notes.user_id ?? null,
    provider_code: "razorpay",
    provider_order_id: payment.order_id ?? null,
    provider_payment_id: payment.id,
    amount_inr: Number(payment.amount ?? 0) / 100,
    currency: payment.currency ?? "INR",
    status: "failed",
    raw_response: payment,
    idempotency_key: payment.id,
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        if (!verifyWebhookSignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        try {
          const event = payload.event as string;
          const payment = payload?.payload?.payment?.entity;
          if (event === "payment.captured" && payment) {
            await finalisePayment(payment);
          } else if (event === "payment.failed" && payment) {
            await recordFailure(payment);
          } else {
            console.log("Unhandled Razorpay event:", event);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Razorpay webhook error:", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
