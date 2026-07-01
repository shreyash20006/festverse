import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { randomBytes, createHmac } from "node:crypto";

const PrepareSchema = z.object({
  eventId: z.string().uuid(),
  prn: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(20).optional(),
  customResponses: z.record(z.string(), z.any()).optional(),
});

/**
 * Prepare a paid-event Razorpay checkout.
 *  - Validates PRN, event open, seats
 *  - Creates (or reuses) a pending_payment registration
 *  - Creates a Razorpay order
 *  - Returns the order details + public key for the browser checkout
 */
export const preparePaidEventCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof PrepareSchema>) => PrepareSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const prn = data.prn.trim().toUpperCase();
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, full_name, email, phone, department, college_id")
      .ilike("prn", prn)
      .limit(1);
    const student = studentRows?.[0];
    if (!student) throw new Error("Your PRN could not be verified. Please contact the administrator.");

    const { data: event } = await supabase
      .from("events")
      .select("id, title, status, capacity, is_paid, price_inr, registration_closes_at, college_id")
      .eq("id", data.eventId)
      .single();
    if (!event) throw new Error("Event not found.");
    if (event.status !== "published") throw new Error("This event is not open for registration.");
    if (!event.is_paid || Number(event.price_inr) <= 0) throw new Error("This is a free event.");
    if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
      throw new Error("Registration has closed for this event.");
    }

    if (event.capacity) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .in("status", ["confirmed", "pending_payment"]);
      if ((count ?? 0) >= event.capacity) throw new Error("This event is fully booked.");
    }

    const { data: existing } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.status === "confirmed") {
      throw new Error("You are already registered for this event.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, department")
      .eq("id", userId)
      .single();

    let registrationId: string;
    if (existing) {
      registrationId = existing.id;
      await supabase
        .from("registrations")
        .update({
          prn,
          full_name: profile?.full_name || student.full_name,
          email: profile?.email || student.email || "",
          phone: data.phone || profile?.phone || student.phone,
          department: profile?.department || student.department,
          custom_responses: data.customResponses ?? {},
          status: "pending_payment",
          amount_paid: 0,
        })
        .eq("id", existing.id);
    } else {
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .insert({
          event_id: event.id,
          user_id: userId,
          student_id: student.id,
          prn,
          full_name: profile?.full_name || student.full_name,
          email: profile?.email || student.email || "",
          phone: data.phone || profile?.phone || student.phone,
          department: profile?.department || student.department,
          custom_responses: data.customResponses ?? {},
          status: "pending_payment",
          amount_paid: 0,
        })
        .select("id")
        .single();
      if (regErr) throw new Error(regErr.message);
      registrationId = reg.id;
    }

    // Create Razorpay order
    const { createRazorpayOrder, getRazorpayKeyId } = await import("@/lib/razorpay.server");
    const amountPaise = Math.round(Number(event.price_inr) * 100);
    const receipt = `reg_${registrationId.slice(0, 30)}`;
    const order = await createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt,
      notes: {
        registration_id: registrationId,
        event_id: event.id,
        user_id: userId,
        college_id: event.college_id ?? "",
      },
    });

    return {
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      eventTitle: event.title,
      registrationId,
      customer: {
        email: profile?.email || student.email || undefined,
        name: profile?.full_name || student.full_name || undefined,
        contact: data.phone || profile?.phone || student.phone || undefined,
      },
    };
  });

const VerifySchema = z.object({
  registrationId: z.string().uuid(),
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(10),
});

/**
 * Client-side verification after Razorpay success callback.
 * The webhook also handles this (idempotent via provider_payment_id); this fn
 * gives instant UX feedback so we can redirect the user to their ticket.
 */
export const verifyPaidEventCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof VerifySchema>) => VerifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { verifyCheckoutSignature, fetchRazorpayPayment } = await import("@/lib/razorpay.server");

    const ok = verifyCheckoutSignature({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    });
    if (!ok) throw new Error("Payment signature could not be verified.");

    const { data: reg } = await supabase
      .from("registrations")
      .select("id, event_id, user_id, status")
      .eq("id", data.registrationId)
      .single();
    if (!reg) throw new Error("Registration not found.");
    if (reg.user_id !== userId) throw new Error("Not allowed.");

    // If already confirmed (e.g. webhook beat us), just return the ticket.
    if (reg.status === "confirmed") {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("registration_id", reg.id)
        .maybeSingle();
      return { ticketId: ticket?.id ?? null, alreadyConfirmed: true };
    }

    // Pull payment details to record amount/method
    const payment = await fetchRazorpayPayment(data.razorpay_payment_id);
    const amountInr = Number(payment.amount ?? 0) / 100;

    // Idempotency at the payments table.
    const { data: existingPay } = await supabase
      .from("payments")
      .select("id")
      .eq("provider_payment_id", data.razorpay_payment_id)
      .maybeSingle();

    let paymentRowId: string;
    if (existingPay) {
      paymentRowId = existingPay.id;
    } else {
      const { data: payRow, error: payErr } = await supabase
        .from("payments")
        .insert({
          registration_id: reg.id,
          event_id: reg.event_id,
          user_id: userId,
          provider_code: "razorpay",
          provider_order_id: data.razorpay_order_id,
          provider_payment_id: data.razorpay_payment_id,
          amount_inr: amountInr,
          currency: payment.currency ?? "INR",
          status: "success",
          raw_response: payment,
          idempotency_key: data.razorpay_payment_id,
        })
        .select("id")
        .single();
      if (payErr) throw new Error(payErr.message);
      paymentRowId = payRow.id;
    }

    await supabase
      .from("registrations")
      .update({ status: "confirmed", amount_paid: amountInr, payment_id: paymentRowId })
      .eq("id", reg.id);

    // Issue ticket (idempotent)
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("registration_id", reg.id)
      .maybeSingle();

    let ticketId = existingTicket?.id as string | undefined;
    if (!ticketId) {
      const code = "TCK-" + randomBytes(4).toString("hex").toUpperCase();
      const { data: ticket, error: tkErr } = await supabase
        .from("tickets")
        .insert({
          registration_id: reg.id,
          event_id: reg.event_id,
          user_id: userId,
          ticket_code: code,
          qr_token: "PLACEHOLDER",
          status: "active",
        })
        .select("id")
        .single();
      if (tkErr) throw new Error(tkErr.message);
      ticketId = ticket.id as string;

      const signSecret = process.env.TICKET_SIGNING_SECRET;
      if (signSecret) {
        const payload = JSON.stringify({ tid: ticketId, eid: reg.event_id, uid: userId, ts: Date.now() });
        const sig = createHmac("sha256", signSecret).update(payload).digest("base64url");
        const token = Buffer.from(payload).toString("base64url") + "." + sig;
        await supabase.from("tickets").update({ qr_token: token }).eq("id", ticketId);
      }
    }

    // Notifications
    const { data: event } = await supabase
      .from("events")
      .select("title, organizer_user_id")
      .eq("id", reg.event_id)
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
      entity_id: reg.id,
      metadata: {
        event_id: reg.event_id,
        payment_id: paymentRowId,
        amount_inr: amountInr,
        provider: "razorpay",
      },
    });

    return { ticketId, alreadyConfirmed: false };
  });
