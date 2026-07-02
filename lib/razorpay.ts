import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(
  amountInr: number,
  idempotencyKey: string,
  notes?: Record<string, string>
) {
  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount: Math.round(amountInr * 100), // paise
    currency: "INR",
    receipt: idempotencyKey,
    notes: notes ?? {},
  });
  return order;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("Razorpay secret not configured");

  const body = `${orderId}|${paymentId}`;
  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSig === signature;
}

export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
) {
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expectedSig === signature;
}
