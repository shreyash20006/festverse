// Server-only Razorpay REST helpers. Do NOT import from client / .functions.ts
// module scope — import inside the handler body.

import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function getAuthHeader(customKeys?: { keyId: string; keySecret: string }): string {
  const key = customKeys?.keyId || process.env.RAZORPAY_KEY_ID;
  const secret = customKeys?.keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Razorpay keys are not configured.");
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

export function getRazorpayKeyId(customKeys?: { keyId: string }): string {
  const key = customKeys?.keyId || process.env.RAZORPAY_KEY_ID;
  if (!key) throw new Error("RAZORPAY_KEY_ID not configured.");
  return key;
}

export function isRazorpayTestMode(customKeys?: { keyId: string }): boolean {
  return (customKeys?.keyId || process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_");
}

export interface CreatedOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export async function createRazorpayOrder(
  params: {
    amountPaise: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  },
  customKeys?: { keyId: string; keySecret: string }
): Promise<CreatedOrder> {
  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(customKeys),
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency ?? "INR",
      receipt: params.receipt,
      notes: params.notes,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order create failed: ${res.status} ${text}`);
  }
  return (await res.json()) as CreatedOrder;
}

export async function fetchRazorpayPayment(
  paymentId: string,
  customKeys?: { keyId: string; keySecret: string }
): Promise<any> {
  const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}`, {
    headers: { Authorization: getAuthHeader(customKeys) },
  });
  if (!res.ok) throw new Error(`Razorpay payment fetch failed: ${res.status}`);
  return await res.json();
}

/** Verify a Razorpay checkout success payload (HMAC SHA256). */
export function verifyCheckoutSignature(
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  customKeys?: { keySecret: string }
): boolean {
  const secret = customKeys?.keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpay_signature));
  } catch {
    return false;
  }
}

/** Verify a Razorpay webhook payload using the configured webhook secret. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  customWebhookSecret?: string
): boolean {
  const secret = customWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
