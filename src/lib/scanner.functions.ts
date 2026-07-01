import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { verifyTicket } from "@/lib/ticket-token.server";

const ScanSchema = z.object({
  qrToken: z.string().min(10),
  eventId: z.string().uuid().optional(),
});

/**
 * Validate a scanned QR token and mark attendance.
 * Only callable by admin / organizer / scanner roles.
 */
export const scanTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof ScanSchema>) => ScanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Permission check
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = (roles ?? []).some((r) =>
      ["super_admin", "college_admin", "organizer", "scanner"].includes(r.role)
    );
    if (!allowed) throw new Error("You do not have permission to scan tickets.");

    const payload = verifyTicket(data.qrToken);
    if (!payload) return { ok: false, reason: "invalid", message: "Invalid or tampered ticket." };

    const { data: ticket } = await supabase
      .from("tickets")
      .select(
        "id, status, checked_in_at, event_id, user_id, ticket_code, registrations(full_name, email, prn), events(title, start_at, venue)"
      )
      .eq("id", payload.tid)
      .maybeSingle();
    if (!ticket) return { ok: false, reason: "not_found", message: "Ticket not found." };

    if (data.eventId && data.eventId !== ticket.event_id) {
      return { ok: false, reason: "wrong_event", message: "Ticket is for a different event.", ticket };
    }
    if (ticket.status === "cancelled") {
      return { ok: false, reason: "cancelled", message: "Ticket has been cancelled.", ticket };
    }
    if (ticket.checked_in_at) {
      return {
        ok: false,
        reason: "already_checked_in",
        message: `Already checked in at ${new Date(ticket.checked_in_at).toLocaleString()}`,
        ticket,
      };
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("tickets")
      .update({ status: "used", checked_in_at: nowIso, checked_in_by: userId })
      .eq("id", ticket.id);
    if (updErr) throw new Error(updErr.message);

    await supabase.from("attendance").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      user_id: ticket.user_id,
      scanned_by: userId,
    });

    return { ok: true, reason: "checked_in", message: "Check-in successful.", ticket };
  });
