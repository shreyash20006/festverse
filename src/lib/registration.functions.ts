import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { signTicket } from "@/lib/ticket-token.server";
import { randomBytes } from "node:crypto";

const RegisterSchema = z.object({
  eventId: z.string().uuid(),
  prn: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(20).optional(),
  customResponses: z.record(z.string(), z.any()).optional(),
});

function genTicketCode(): string {
  return "TCK-" + randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Register the signed-in user for a FREE event.
 * Paid-event flow goes through createPaymentOrder -> verifyPayment (see payments.functions.ts).
 */
export const registerForFreeEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof RegisterSchema>) => RegisterSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify PRN against whitelist
    const prn = data.prn.trim().toUpperCase();
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, full_name, email, phone, department, college_id")
      .ilike("prn", prn)
      .limit(1);
    const student = studentRows?.[0];
    if (!student) {
      throw new Error("Your PRN could not be verified. Please contact the administrator.");
    }

    // 2. Load event and validate
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, title, status, capacity, is_paid, price_inr, registration_closes_at, start_at")
      .eq("id", data.eventId)
      .single();
    if (evErr || !event) throw new Error("Event not found.");
    if (event.status !== "published") throw new Error("This event is not open for registration.");
    if (event.is_paid && Number(event.price_inr) > 0) {
      throw new Error("This is a paid event. Use the payment checkout.");
    }
    if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
      throw new Error("Registration has closed for this event.");
    }

    // 3. Capacity check (best-effort)
    if (event.capacity) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .in("status", ["confirmed", "pending_payment"]);
      if ((count ?? 0) >= event.capacity) throw new Error("This event is fully booked.");
    }

    // 4. Get profile (for default name/email)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, department")
      .eq("id", userId)
      .single();

    // 5. Create registration
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
        status: "confirmed",
        amount_paid: 0,
      })
      .select("id")
      .single();
    if (regErr) {
      if (regErr.code === "23505") throw new Error("You are already registered for this event.");
      throw new Error(regErr.message);
    }

    // 6. Update profile PRN if missing
    if (!profile?.full_name || !profile?.department) {
      await supabase
        .from("profiles")
        .update({
          prn,
          department: profile?.department || student.department,
          full_name: profile?.full_name || student.full_name,
          phone: profile?.phone || student.phone,
          verified: true,
        })
        .eq("id", userId);
    }

    // 7. Issue ticket
    const code = genTicketCode();
    const { data: ticket, error: tkErr } = await supabase
      .from("tickets")
      .insert({
        registration_id: reg.id,
        event_id: event.id,
        user_id: userId,
        ticket_code: code,
        qr_token: "PLACEHOLDER",
        status: "active",
      })
      .select("id")
      .single();
    if (tkErr) throw new Error(tkErr.message);

    const qrToken = signTicket({ tid: ticket.id, eid: event.id, uid: userId });
    await supabase.from("tickets").update({ qr_token: qrToken }).eq("id", ticket.id);

    return { ticketId: ticket.id, ticketCode: code };
  });
