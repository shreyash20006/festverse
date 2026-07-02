import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";
import { generateQRToken } from "@/lib/qr";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, amount } = body;

    if (!eventId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify event exists and is paid
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, price_inr, is_paid, status")
      .eq("id", eventId)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.is_paid) {
      return NextResponse.json({ error: "Event is free" }, { status: 400 });
    }

    const idempotencyKey = `fv-${user.id}-${eventId}-${Date.now()}`;

    const order = await createRazorpayOrder(event.price_inr, idempotencyKey, {
      event_id: eventId,
      user_id: user.id,
      event_title: event.title,
    });

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        event_id: eventId,
        user_id: user.id,
        provider_code: "razorpay",
        provider_order_id: order.id,
        amount_inr: event.price_inr,
        currency: "INR",
        status: "created",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (paymentError) throw paymentError;

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
    });
  } catch (error: any) {
    console.error("Razorpay order error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to create order" },
      { status: 500 }
    );
  }
}
