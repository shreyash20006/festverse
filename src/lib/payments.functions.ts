/**
 * Payment provider abstraction.
 *
 * Phase 1: Razorpay implementation, configurable per college.
 * Phase 2: Add Cashfree / other by implementing the PaymentProvider interface.
 *
 * NOTE: Razorpay keys are not yet configured. Calling createPaymentOrder for a
 * paid event will throw until the user supplies RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET secrets via the secrets tool, and connects them to
 * a college via college_payment_settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { randomBytes } from "node:crypto";

const OrderSchema = z.object({ eventId: z.string().uuid() });

export const createPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof OrderSchema>) => OrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event } = await supabase
      .from("events")
      .select("id, title, college_id, price_inr, is_paid, status")
      .eq("id", data.eventId)
      .single();
    if (!event) throw new Error("Event not found.");
    if (!event.is_paid || Number(event.price_inr) <= 0) throw new Error("This is a free event.");
    if (event.status !== "published") throw new Error("Event is not open.");

    // Look up the active provider for this college (multi-tenant ready)
    const { data: setting } = await supabase
      .from("college_payment_settings")
      .select("provider_code, mode, key_id")
      .eq("college_id", event.college_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const providerCode = setting?.provider_code ?? "razorpay";
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (providerCode === "razorpay" && (!keyId || !keySecret)) {
      throw new Error(
        "Payments are not configured yet. Ask the administrator to add Razorpay credentials."
      );
    }

    const idempotencyKey = randomBytes(16).toString("hex");
    const amountPaise = Math.round(Number(event.price_inr) * 100);

    let providerOrderId: string | null = null;

    if (providerCode === "razorpay" && keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: idempotencyKey,
          notes: { event_id: event.id, user_id: userId },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("Razorpay order creation failed", { status: res.status, body: txt });
        throw new Error("Payment could not be initiated. Please try again or contact support.");
      }
      const body = (await res.json()) as { id: string };
      providerOrderId = body.id;
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        event_id: event.id,
        user_id: userId,
        college_id: event.college_id,
        provider_code: providerCode,
        provider_order_id: providerOrderId,
        amount_inr: event.price_inr,
        status: "created",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      paymentId: payment.id,
      providerOrderId,
      amount: amountPaise,
      currency: "INR",
      providerCode,
      keyId, // public key only
    };
  });
