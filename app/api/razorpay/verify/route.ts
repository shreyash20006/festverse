import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { generateQRToken, generateTicketCode } from "@/lib/qr";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, paymentId, signature, eventId, internalPaymentId, registrationData } = body;

    // Verify Razorpay signature
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Update payment record to success
    const { error: updatePayError } = await supabase
      .from("payments")
      .update({
        provider_payment_id: paymentId,
        provider_signature: signature,
        status: "success",
      })
      .eq("id", internalPaymentId);

    if (updatePayError) throw updatePayError;

    // Create registration
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .insert({
        event_id: eventId,
        user_id: user.id,
        prn: registrationData.prn,
        full_name: registrationData.full_name,
        email: registrationData.email,
        phone: registrationData.phone,
        department: registrationData.department,
        status: "confirmed",
        amount_paid: registrationData.amount,
        payment_id: internalPaymentId,
      })
      .select("id")
      .single();

    if (regError) throw regError;

    // Issue ticket
    const qrToken = generateQRToken();
    const ticketCode = generateTicketCode();

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        registration_id: registration.id,
        event_id: eventId,
        user_id: user.id,
        ticket_code: ticketCode,
        qr_token: qrToken,
        status: "active",
      })
      .select("id, ticket_code, qr_token")
      .single();

    if (ticketError) throw ticketError;

    return NextResponse.json({ success: true, ticketId: ticket.id, ticketCode: ticket.ticket_code });
  } catch (error: any) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: error.message ?? "Payment verification failed" },
      { status: 500 }
    );
  }
}
