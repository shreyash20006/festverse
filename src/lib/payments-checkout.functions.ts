import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { randomBytes, createHmac } from "node:crypto";
import { calculateCheckoutPricing } from "./payment-pricing.functions";

const PrepareSchema = z.object({
  eventId: z.string().uuid(),
  prn: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(20).optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  customResponses: z.record(z.string(), z.any()).optional(),
});

/**
 * Prepare a paid-event Razorpay checkout.
 *  - Validates PRN, event status, capacity
 *  - Computes pricing breakdown including Coupon discount & GST
 *  - Generates Razorpay Order using either Platform or Custom College keys
 *  - Creates/Updates a pending registration
 *  - Returns order details + public key for the browser checkout
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
    if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
      throw new Error("Registration has closed for this event.");
    }

    // Check college payment settings to see if payments are suspended
    const { data: college } = await supabase
      .from("colleges")
      .select("is_active")
      .eq("id", event.college_id)
      .single();
    if (!college?.is_active) {
      throw new Error("This college portal is currently suspended.");
    }

    const { data: paySettings } = await supabase
      .from("college_payment_settings")
      .select("is_active, key_id, config, mode")
      .eq("college_id", event.college_id)
      .eq("provider_code", "razorpay")
      .maybeSingle();

    if (paySettings && !paySettings.is_active) {
      throw new Error("Payments are temporarily disabled for this college.");
    }

    // Capacity verification
    if (event.capacity) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "confirmed");
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

    // 1. Compute exact pricing with coupon & GST (18%)
    const pricing = await calculateCheckoutPricing({
      data: { eventId: data.eventId, couponCode: data.couponCode },
    });
    const { basePrice, discount, gstAmount, totalPayable, couponId } = pricing;

    if (totalPayable <= 0) {
      throw new Error("Checkout calculation resulted in zero payable. Use free registration route.");
    }

    // 2. Initialize or Update pending registration
    let registrationId: string;
    const regValues = {
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
    };

    if (existing) {
      registrationId = existing.id;
      await supabase
        .from("registrations")
        .update(regValues)
        .eq("id", existing.id);
    } else {
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .insert(regValues)
        .select("id")
        .single();
      if (regErr) throw new Error(regErr.message);
      registrationId = reg.id;
    }

    // 3. Setup Custom vs Platform key credentials
    const isCustom = paySettings?.mode === "custom";
    const keyId = isCustom ? paySettings?.key_id : process.env.RAZORPAY_KEY_ID;
    const keySecret = isCustom ? (paySettings?.config as any)?.key_secret : process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured for this college.");
    }

    const customKeys = isCustom ? { keyId, keySecret } : undefined;

    // 4. Create Razorpay order
    const { createRazorpayOrder, getRazorpayKeyId } = await import("@/lib/razorpay.server");
    const amountPaise = Math.round(totalPayable * 100);
    const receipt = `reg_${registrationId.slice(0, 30)}`;

    const order = await createRazorpayOrder(
      {
        amountPaise,
        currency: "INR",
        receipt,
        notes: {
          registration_id: registrationId,
          event_id: event.id,
          user_id: userId,
          college_id: event.college_id ?? "",
          coupon_id: couponId ?? "",
        },
      },
      customKeys
    );

    // Create payment transaction record
    const { data: payRow, error: payErr } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        event_id: event.id,
        user_id: userId,
        college_id: event.college_id,
        provider_code: "razorpay",
        provider_order_id: order.id,
        amount_inr: totalPayable,
        currency: "INR",
        status: "created",
        idempotency_key: order.id,
      })
      .select("id")
      .single();

    if (payErr) throw new Error("Payment initialization failed: " + payErr.message);

    // Initial log
    await supabase.from("payment_logs").insert({
      payment_id: payRow.id,
      status_from: "none",
      status_to: "created",
      raw_payload: order,
    });

    return {
      keyId: getRazorpayKeyId(customKeys ? { keyId: customKeys.keyId } : undefined),
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
 * Supported for direct payment checks. Webhook handles asynchronous capture.
 */
export const verifyPaidEventCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof VerifySchema>) => VerifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { verifyCheckoutSignature, fetchRazorpayPayment } = await import("@/lib/razorpay.server");

    const { data: reg } = await supabase
      .from("registrations")
      .select("id, event_id, user_id, status, payments(id, status, college_id)")
      .eq("id", data.registrationId)
      .single();
    if (!reg) throw new Error("Registration not found.");
    if (reg.user_id !== userId) throw new Error("Not allowed.");

    // Retrieve active payment settings
    const collegeId = (reg.payments as any)?.[0]?.college_id || reg.event_id;
    const { data: paySettings } = await supabase
      .from("college_payment_settings")
      .select("key_id, config, mode")
      .eq("college_id", collegeId)
      .eq("provider_code", "razorpay")
      .maybeSingle();

    const isCustom = paySettings?.mode === "custom";
    const keyId = isCustom ? paySettings?.key_id : process.env.RAZORPAY_KEY_ID;
    const keySecret = isCustom ? (paySettings?.config as any)?.key_secret : process.env.RAZORPAY_KEY_SECRET;

    const customKeys = isCustom && keyId && keySecret ? { keyId, keySecret } : undefined;

    // Verify signature
    const ok = verifyCheckoutSignature(
      {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      },
      customKeys ? { keySecret: customKeys.keySecret } : undefined
    );
    if (!ok) throw new Error("Payment signature could not be verified.");

    if (reg.status === "confirmed") {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("registration_id", reg.id)
        .maybeSingle();
      return { ticketId: ticket?.id ?? null, alreadyConfirmed: true };
    }

    // Pull payment details
    const paymentData = await fetchRazorpayPayment(data.razorpay_payment_id, customKeys);
    const amountInr = Number(paymentData.amount ?? 0) / 100;

    const { data: existingPay } = await supabase
      .from("payments")
      .select("id, status")
      .eq("provider_order_id", data.razorpay_order_id)
      .maybeSingle();

    let paymentRowId: string;
    if (existingPay) {
      paymentRowId = existingPay.id;
      await supabase
        .from("payments")
        .update({
          status: "success",
          provider_payment_id: data.razorpay_payment_id,
          provider_signature: data.razorpay_signature,
          raw_response: paymentData,
        })
        .eq("id", existingPay.id);
    } else {
      const { data: payRow, error: payErr } = await supabase
        .from("payments")
        .insert({
          registration_id: reg.id,
          event_id: reg.event_id,
          user_id: userId,
          college_id: collegeId,
          provider_code: "razorpay",
          provider_order_id: data.razorpay_order_id,
          provider_payment_id: data.razorpay_payment_id,
          provider_signature: data.razorpay_signature,
          amount_inr: amountInr,
          currency: paymentData.currency ?? "INR",
          status: "success",
          raw_response: paymentData,
          idempotency_key: data.razorpay_payment_id,
        })
        .select("id")
        .single();
      if (payErr) throw new Error(payErr.message);
      paymentRowId = payRow.id;
    }

    // Write log
    await supabase.from("payment_logs").insert({
      payment_id: paymentRowId,
      status_from: existingPay?.status || "created",
      status_to: "success",
      raw_payload: paymentData,
    });

    await supabase
      .from("registrations")
      .update({ status: "confirmed", amount_paid: amountInr, payment_id: paymentRowId })
      .eq("id", reg.id);

    // Issue ticket
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

    // Create Invoice
    const invoiceNum = "INV-" + Date.now() + "-" + randomBytes(2).toString("hex").toUpperCase();
    await supabase.from("invoices").insert({
      payment_id: paymentRowId,
      invoice_number: invoiceNum,
    }).select("id").maybeSingle();

    // Increment Coupon Uses if applied
    const couponId = paymentData.notes?.coupon_id;
    if (couponId) {
      await supabase.from("coupon_usage").insert({
        coupon_id: couponId,
        user_id: userId,
        payment_id: paymentRowId,
      });
      await supabase.rpc("increment_coupon_uses", { _coupon_id: couponId });
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
