import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { getRazorpayKeyId, verifyCheckoutSignature } from "./razorpay.server";

// Schema definitions
const CouponValidationSchema = z.object({
  code: z.string().trim().toUpperCase(),
  eventId: z.string().uuid(),
});

const CheckoutPricingSchema = z.object({
  eventId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().optional(),
});

const CreateOrderSchema = z.object({
  eventId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().optional(),
});

const VerifyPaymentSchema = z.object({
  paymentId: z.string().trim(),
  orderId: z.string().trim(),
  signature: z.string().trim(),
});

const RefundActionSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().trim().optional(),
});

const RejectRefundSchema = z.object({
  refundId: z.string().uuid(),
});

/**
 * Validate a coupon code for a specific event checkout.
 */
export const validateCouponCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; eventId: string }) => CouponValidationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Get event and college details
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("college_id, price_inr")
      .eq("id", data.eventId)
      .single();
    if (!event) throw new Error("Event not found.");

    // Query active coupon
    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("college_id", event.college_id)
      .eq("code", data.code)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !coupon) {
      return { ok: false, reason: "Coupon code is invalid." };
    }

    // Check expiry
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return { ok: false, reason: "This coupon has expired." };
    }

    // Check usage limits
    if (coupon.uses_count >= coupon.max_uses) {
      return { ok: false, reason: "This coupon code usage limit has been reached." };
    }

    // Check applicable events restriction
    if (coupon.applicable_events && coupon.applicable_events.length > 0) {
      if (!coupon.applicable_events.includes(data.eventId)) {
        return { ok: false, reason: "This coupon is not applicable for this event." };
      }
    }

    // Check minimum purchase amount
    const eventPrice = Number(event.price_inr);
    if (eventPrice < Number(coupon.min_purchase)) {
      return { ok: false, reason: `Minimum purchase of ₹${coupon.min_purchase} required.` };
    }

    return { ok: true, coupon };
  });

/**
 * Calculate final pricing breakdown (Base, Discount, GST, Total Payable).
 */
export const calculateCheckoutPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; couponCode?: string }) => CheckoutPricingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch event and pricing details
    const { data: pricing } = await supabaseAdmin
      .from("event_pricing")
      .select("*")
      .eq("event_id", data.eventId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!pricing) throw new Error("Pricing details not found for this event.");

    // Determine current base price (handle early bird if active)
    let basePrice = Number(pricing.registration_fee);
    const now = new Date();
    
    if (pricing.early_bird_price && pricing.early_bird_deadline) {
      const deadline = new Date(pricing.early_bird_deadline);
      if (now <= deadline) {
        basePrice = Number(pricing.early_bird_price);
      }
    }

    let discount = 0;
    let couponId: string | null = null;

    // Apply coupon if valid
    if (data.couponCode) {
      const res = await validateCouponCode({
        data: { code: data.couponCode, eventId: data.eventId },
      });
      if (res.ok && res.coupon) {
        couponId = res.coupon.id;
        if (res.coupon.discount_type === "percentage") {
          discount = basePrice * (Number(res.coupon.discount_value) / 100);
        } else {
          discount = Number(res.coupon.discount_value);
        }
        // Cap discount at base price
        discount = Math.min(discount, basePrice);
      }
    }

    // Calculations
    const discountedPrice = basePrice - discount;
    const gstAmount = discountedPrice * (Number(pricing.gst_percent) / 100);
    const totalPayable = discountedPrice + gstAmount;

    return {
      basePrice,
      discount,
      gstAmount,
      totalPayable: Math.max(0, totalPayable),
      couponId,
    };
  });

/**
 * Initiate registration and generate a Razorpay order.
 */
export const createEventPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; couponCode?: string }) => CreateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // 1. Calculate checkout pricing
    const pricingBreakdown = await calculateCheckoutPricing({
      data: { eventId: data.eventId, couponCode: data.couponCode },
    });

    const { basePrice, discount, gstAmount, totalPayable, couponId } = pricingBreakdown;

    // 2. Fetch event and college config
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, college_id, is_paid")
      .eq("id", data.eventId)
      .single();
    if (!event) throw new Error("Event not found.");

    // Check college payment settings (suspend check)
    const { data: college } = await supabaseAdmin
      .from("colleges")
      .select("is_active")
      .eq("id", event.college_id)
      .single();
    if (!college?.is_active) {
      throw new Error("This college portal is currently suspended.");
    }

    const { data: paymentSettings } = await supabaseAdmin
      .from("college_payment_settings")
      .select("is_active, key_id, config, mode")
      .eq("college_id", event.college_id)
      .eq("provider_code", "razorpay")
      .maybeSingle();

    // Verify gateway configuration
    const isCustom = paymentSettings?.mode === "custom";
    const keyId = isCustom ? paymentSettings?.key_id : process.env.RAZORPAY_KEY_ID;
    const keySecret = isCustom ? (paymentSettings?.config as any)?.key_secret : process.env.RAZORPAY_KEY_SECRET;

    if (totalPayable > 0 && (!keyId || !keySecret)) {
      throw new Error("This college has not configured payments correctly.");
    }

    if (paymentSettings && !paymentSettings.is_active) {
      throw new Error("Payments are temporarily disabled for this college.");
    }

    // 3. Create a pending registration record
    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        event_id: data.eventId,
        user_id: userId,
        status: "pending",
        amount_paid: 0, // Not confirmed yet
      })
      .select("id")
      .single();
    
    if (regErr) throw new Error("Failed to initialize registration: " + regErr.message);

    // 4. Handle Free/Fully discounted order
    if (totalPayable === 0) {
      const ticketCode = "TCK-" + randomBytes(4).toString("hex").toUpperCase();
      
      // Confirm registration immediately
      await supabaseAdmin.from("registrations").update({
        status: "confirmed",
        amount_paid: 0
      }).eq("id", reg.id);

      // Create ticket
      const { data: ticket } = await supabaseAdmin.from("tickets").insert({
        registration_id: reg.id,
        event_id: data.eventId,
        user_id: userId,
        ticket_code: ticketCode,
        status: "active",
        qr_token: "FREE_" + randomBytes(16).toString("hex"),
      }).select("id").single();

      // Add to coupon usage if applicable
      if (couponId) {
        await supabaseAdmin.from("coupon_usage").insert({
          coupon_id: couponId,
          user_id: userId,
          payment_id: null // Free bypass
        });
        await supabaseAdmin.rpc("increment_coupon_uses", { _coupon_id: couponId });
      }

      return {
        free: true,
        registrationId: reg.id,
        ticketId: ticket?.id,
      };
    }

    // 5. PAID ORDER - Interact with Razorpay
    const idempotencyKey = randomBytes(16).toString("hex");
    const amountPaise = Math.round(totalPayable * 100);

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: idempotencyKey,
        notes: {
          event_id: event.id,
          user_id: userId,
          registration_id: reg.id,
          coupon_id: couponId || "",
          college_id: event.college_id,
        },
      }),
    });

    if (!rzpRes.ok) {
      const txt = await rzpRes.text();
      console.error("Razorpay order creation failed:", txt);
      throw new Error("Razorpay order creation failed.");
    }

    const rzpOrder = await rzpRes.json();

    // 6. Insert payment transaction record
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        registration_id: reg.id,
        event_id: data.eventId,
        user_id: userId,
        college_id: event.college_id,
        provider_code: "razorpay",
        provider_order_id: rzpOrder.id,
        amount_inr: totalPayable,
        currency: "INR",
        status: "created",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (payErr) throw new Error("Failed to insert payment record: " + payErr.message);

    // Write initial payment log
    await supabaseAdmin.from("payment_logs").insert({
      payment_id: payment.id,
      status_from: "none",
      status_to: "created",
      raw_payload: rzpOrder,
    });

    return {
      free: false,
      keyId,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId: rzpOrder.id,
      paymentId: payment.id,
      registrationId: reg.id,
      eventTitle: event.title,
    };
  });

/**
 * Verify payment signature and complete registration / QR ticket generation.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string; orderId: string; signature: string }) => VerifyPaymentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Retrieve active payment record
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("provider_order_id", data.orderId)
      .single();
    if (!payment) throw new Error("Payment record not found.");

    // Retrieve college key settings to verify signature
    const { data: settings } = await supabaseAdmin
      .from("college_payment_settings")
      .select("mode, key_id, config")
      .eq("college_id", payment.college_id)
      .eq("provider_code", "razorpay")
      .maybeSingle();

    const isCustom = settings?.mode === "custom";
    const keyId = isCustom ? settings?.key_id : process.env.RAZORPAY_KEY_ID;
    const keySecret = isCustom ? (settings?.config as any)?.key_secret : process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) throw new Error("Razorpay config missing secret key.");

    // 1. Server-side signature verification
    const expected = createHmac("sha256", keySecret)
      .update(`${data.orderId}|${data.paymentId}`)
      .digest("hex");
      
    const isValid = timingSafeEqual(Buffer.from(expected), Buffer.from(data.signature));
    if (!isValid) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      await supabaseAdmin.from("payment_logs").insert({
        payment_id: payment.id,
        status_from: payment.status,
        status_to: "failed",
        raw_payload: { error: "Signature verification failed", received: data },
      });
      return { ok: false, reason: "signature_invalid" };
    }

    // 2. Fetch payment from Razorpay API to check captured state
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${data.paymentId}`, {
      headers: { Authorization: authHeader },
    });
    if (!rzpRes.ok) throw new Error("Could not verify payment with Razorpay API.");
    
    const rzpPay = await rzpRes.json();
    const isCaptured = rzpPay.status === "captured" || rzpPay.status === "authorized";
    
    if (!isCaptured) {
      throw new Error(`Razorpay payment state is invalid: ${rzpPay.status}`);
    }

    // 3. Prevent duplicate confirmations (Idempotency check)
    if (payment.status === "success") {
      return { ok: true, alreadyProcessed: true };
    }

    // 4. Finalise confirmation
    const ticketCode = "TCK-" + randomBytes(4).toString("hex").toUpperCase();
    const finalAmount = Number(payment.amount_inr);

    // Update payment row
    await supabaseAdmin
      .from("payments")
      .update({
        status: "success",
        provider_payment_id: data.paymentId,
        provider_signature: data.signature,
        raw_response: rzpPay,
      })
      .eq("id", payment.id);

    // Log success
    await supabaseAdmin.from("payment_logs").insert({
      payment_id: payment.id,
      status_from: payment.status,
      status_to: "success",
      raw_payload: rzpPay,
    });

    // Confirm registration
    await supabaseAdmin
      .from("registrations")
      .update({ status: "confirmed", amount_paid: finalAmount })
      .eq("id", payment.registration_id);

    // Create ticket
    const qrToken = Buffer.from(JSON.stringify({ pid: payment.id, uid: userId, reg: payment.registration_id, ts: Date.now() })).toString("base64url");
    const { data: ticket } = await supabaseAdmin.from("tickets").insert({
      registration_id: payment.registration_id,
      event_id: payment.event_id,
      user_id: userId,
      ticket_code: ticketCode,
      status: "active",
      qr_token: qrToken,
    }).select("id").single();

    // Create Invoice
    const invoiceNum = "INV-" + Date.now() + "-" + randomBytes(2).toString("hex").toUpperCase();
    await supabaseAdmin.from("invoices").insert({
      payment_id: payment.id,
      invoice_number: invoiceNum,
    });

    // Check notes for Coupon ID to log usage
    const couponId = rzpPay.notes?.coupon_id;
    if (couponId) {
      await supabaseAdmin.from("coupon_usage").insert({
        coupon_id: couponId,
        user_id: userId,
        payment_id: payment.id,
      });
      await supabaseAdmin.rpc("increment_coupon_uses", { _coupon_id: couponId });
    }

    // Trigger Notification
    const { data: event } = await supabaseAdmin.from("events").select("title").eq("id", payment.event_id).single();
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "payment_success",
      title: "Payment Received",
      body: `Successfully registered for "${event?.title ?? "event"}". Invoice ${invoiceNum} generated.`,
      link: ticket ? `/tickets/${ticket.id}` : "/my-tickets",
    });

    return { ok: true, ticketId: ticket?.id };
  });

/**
 * Create a refund request (or process immediately if super admin / gateway permits).
 */
export const approveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string; amount: number; reason?: string }) => RefundActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch transaction details
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .single();
    if (!payment) throw new Error("Payment record not found.");
    if (payment.status !== "success") throw new Error("Only successful payments can be refunded.");

    // Verify key settings
    const { data: settings } = await supabaseAdmin
      .from("college_payment_settings")
      .select("mode, key_id, config")
      .eq("college_id", payment.college_id)
      .eq("provider_code", "razorpay")
      .maybeSingle();

    const isCustom = settings?.mode === "custom";
    const keyId = isCustom ? settings?.key_id : process.env.RAZORPAY_KEY_ID;
    const keySecret = isCustom ? (settings?.config as any)?.key_secret : process.env.RAZORPAY_KEY_SECRET;

    // Contact Razorpay API to process refund
    const refundAmountPaise = Math.round(data.amount * 100);
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.provider_payment_id}/refund`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: refundAmountPaise,
        speed: "normal",
        notes: {
          reason: data.reason || "Admin requested refund",
          payment_id: payment.id,
        },
      }),
    });

    if (!rzpRes.ok) {
      const txt = await rzpRes.text();
      console.error("Razorpay refund request failed:", txt);
      throw new Error("Razorpay refund failed: " + txt);
    }

    const rzpRefund = await rzpRes.json();

    // Create Refund log
    const { data: refund } = await supabaseAdmin.from("refunds").insert({
      payment_id: payment.id,
      amount_inr: data.amount,
      reason: data.reason || "Refund requested by Administrator",
      status: "approved",
      raw_response: rzpRefund,
    }).select("id").single();

    // Update payment status
    await supabaseAdmin.from("payments").update({ status: "refunded" }).eq("id", payment.id);

    // Cancel ticket if active
    await supabaseAdmin.from("tickets")
      .update({ status: "cancelled" })
      .eq("registration_id", payment.registration_id);

    // Notify user
    await supabaseAdmin.from("notifications").insert({
      user_id: payment.user_id,
      type: "refund_processed",
      title: "Refund Approved",
      body: `A refund of ₹${data.amount} has been processed for your event registration.`,
    });

    return { ok: true, refundId: refund?.id };
  });

/**
 * Reject a pending refund request (administrative audit logs).
 */
export const rejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { refundId: string }) => RejectRefundSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: refund } = await supabaseAdmin
      .from("refunds")
      .select("*")
      .eq("id", data.refundId)
      .single();
    if (!refund) throw new Error("Refund request not found.");

    await supabaseAdmin
      .from("refunds")
      .update({ status: "rejected" })
      .eq("id", data.refundId);

    return { ok: true };
  });

/**
 * Server function to test connectivity to Razorpay with provided credentials.
 */
export const testRazorpayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ keyId: z.string().trim(), keySecret: z.string().trim() }))
  .handler(async ({ data }) => {
    try {
      const authHeader = "Basic " + Buffer.from(`${data.keyId}:${data.keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: authHeader },
      });
      // 200 OK means credentials are valid, 401 means invalid, others could indicate network issues but 200/400 are authentications success
      if (res.status === 200 || res.status === 400) {
        return { ok: true };
      }
      return { ok: false, reason: `Authentication failed (HTTP ${res.status})` };
    } catch (e: any) {
      return { ok: false, reason: e.message || "Network error" };
    }
  });

