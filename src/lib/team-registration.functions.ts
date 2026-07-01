import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { signTicket } from "@/lib/ticket-token.server";
import { randomBytes } from "node:crypto";

const CreateTeamSchema = z.object({
  eventId: z.string().uuid(),
  teamName: z.string().trim().min(2).max(100),
  leaderPrn: z.string().trim().min(3).max(40),
  leaderPhone: z.string().trim().max(20).optional(),
  memberPrns: z.array(z.string().trim().min(3).max(40)).default([]),
});

const JoinTeamSchema = z.object({
  eventId: z.string().uuid(),
  inviteCode: z.string().trim().toUpperCase(),
  prn: z.string().trim().min(3).max(40),
  phone: z.string().trim().max(20).optional(),
});

function genTicketCode(): string {
  return "TCK-" + randomBytes(4).toString("hex").toUpperCase();
}

function genInviteCode(): string {
  return "TEAM-" + randomBytes(3).toString("hex").toUpperCase();
}

/**
 * Create a team and register the leader + any pre-added members.
 */
export const createTeamAndRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof CreateTeamSchema>) => CreateTeamSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const leaderPrn = data.leaderPrn.trim().toUpperCase();

    // 1. Verify leader PRN
    const { data: leaderStudent } = await supabase
      .from("students")
      .select("id, full_name, email, phone, department")
      .ilike("prn", leaderPrn)
      .maybeSingle();

    if (!leaderStudent) {
      throw new Error("Leader PRN could not be verified. Please contact the administrator.");
    }

    // 2. Validate Event
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, status, capacity, is_paid, price_inr, registration_closes_at, is_team_event, min_team_size, max_team_size")
      .eq("id", data.eventId)
      .single();

    if (evErr || !event) throw new Error("Event not found.");
    if (event.status !== "published") throw new Error("Event is not open for registration.");
    if (!event.is_team_event) throw new Error("This is not a team event.");
    if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
      throw new Error("Registration has closed for this event.");
    }

    // Check sizes
    const totalMembersToRegister = 1 + data.memberPrns.length; // leader + members
    if (totalMembersToRegister > event.max_team_size) {
      throw new Error(`Team size exceeds the maximum limit of ${event.max_team_size} members.`);
    }

    // 3. Create the Team
    const inviteCode = genInviteCode();
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .insert({
        event_id: event.id,
        name: data.teamName,
        leader_id: userId,
        invite_code: inviteCode,
      })
      .select("id")
      .single();

    if (teamErr) throw new Error("Failed to create team: " + teamErr.message);

    // 4. Get leader profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, department")
      .eq("id", userId)
      .single();

    // 5. Register Leader
    const { data: leaderReg, error: leaderRegErr } = await supabase
      .from("registrations")
      .insert({
        event_id: event.id,
        user_id: userId,
        student_id: leaderStudent.id,
        prn: leaderPrn,
        full_name: profile?.full_name || leaderStudent.full_name,
        email: profile?.email || leaderStudent.email || "",
        phone: data.leaderPhone || profile?.phone || leaderStudent.phone,
        department: profile?.department || leaderStudent.department,
        team_id: team.id,
        team_role: "leader",
        status: "confirmed",
        amount_paid: 0,
      })
      .select("id")
      .single();

    if (leaderRegErr) {
      // Cleanup team
      await supabase.from("teams").delete().eq("id", team.id);
      if (leaderRegErr.code === "23505") throw new Error("You are already registered for this event.");
      throw new Error("Failed leader registration: " + leaderRegErr.message);
    }

    // Create Leader Ticket
    const leaderCode = genTicketCode();
    const { data: leaderTicket, error: lkErr } = await supabase
      .from("tickets")
      .insert({
        registration_id: leaderReg.id,
        event_id: event.id,
        user_id: userId,
        ticket_code: leaderCode,
        qr_token: "PLACEHOLDER",
        status: "active",
      })
      .select("id")
      .single();

    if (lkErr) throw new Error("Failed to issue leader ticket: " + lkErr.message);

    const leaderQrToken = signTicket({ tid: leaderTicket.id, eid: event.id, uid: userId });
    await supabase.from("tickets").update({ qr_token: leaderQrToken }).eq("id", leaderTicket.id);

    // 6. Pre-Register Teammates
    for (const prnRaw of data.memberPrns) {
      const prn = prnRaw.trim().toUpperCase();
      const { data: memStudent } = await supabase
        .from("students")
        .select("id, full_name, email, phone, department")
        .ilike("prn", prn)
        .maybeSingle();

      if (!memStudent) continue; // Skip invalid PRNs or warn? For now, skip silently or pre-verify client side

      // Check if there is an existing profile with this PRN to link
      const { data: memProfile } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, department")
        .eq("prn", prn)
        .maybeSingle();

      const { data: memReg, error: memRegErr } = await supabase
        .from("registrations")
        .insert({
          event_id: event.id,
          user_id: memProfile?.id || null, // Will link on login if not yet signed up
          student_id: memStudent.id,
          prn,
          full_name: memProfile?.full_name || memStudent.full_name,
          email: memProfile?.email || memStudent.email || "",
          phone: memProfile?.phone || memStudent.phone,
          department: memProfile?.department || memStudent.department,
          team_id: team.id,
          team_role: "member",
          status: "confirmed",
          amount_paid: 0,
        })
        .select("id")
        .single();

      if (!memRegErr && memProfile?.id) {
        // Issue ticket directly if the member already has an account
        const memCode = genTicketCode();
        const { data: memTicket, error: mkErr } = await supabase
          .from("tickets")
          .insert({
            registration_id: memReg.id,
            event_id: event.id,
            user_id: memProfile.id,
            ticket_code: memCode,
            qr_token: "PLACEHOLDER",
            status: "active",
          })
          .select("id")
          .single();

        if (!mkErr) {
          const memQr = signTicket({ tid: memTicket.id, eid: event.id, uid: memProfile.id });
          await supabase.from("tickets").update({ qr_token: memQr }).eq("id", memTicket.id);
        }
      }
    }

    return { teamId: team.id, ticketId: leaderTicket.id, inviteCode };
  });

/**
 * Join an existing team using an invite code.
 */
export const joinTeamWithInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof JoinTeamSchema>) => JoinTeamSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prn = data.prn.trim().toUpperCase();

    // 1. Verify PRN
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name, email, phone, department")
      .ilike("prn", prn)
      .maybeSingle();

    if (!student) {
      throw new Error("Your PRN could not be verified. Please contact the administrator.");
    }

    // 2. Fetch Team by Invite Code
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, event_id, name")
      .eq("invite_code", data.inviteCode)
      .maybeSingle();

    if (teamErr || !team) throw new Error("Invalid invite code. Team not found.");
    if (team.event_id !== data.eventId) throw new Error("This invite code does not belong to this event.");

    // Validate Event limits
    const { data: event } = await supabase
      .from("events")
      .select("max_team_size")
      .eq("id", team.event_id)
      .single();

    if (!event) throw new Error("Event details not found.");

    // 3. Capacity Check
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);

    if ((count ?? 0) >= event.max_team_size) {
      throw new Error("This team is already full.");
    }

    // 4. Register or Update pre-created registration
    const { data: existingReg } = await supabase
      .from("registrations")
      .select("id, user_id")
      .eq("event_id", team.event_id)
      .eq("prn", prn)
      .maybeSingle();

    let regId = existingReg?.id;

    if (existingReg) {
      if (existingReg.user_id && existingReg.user_id !== userId) {
        throw new Error("This PRN is already registered by another account.");
      }
      // Link user_id to pre-created registration
      await supabase
        .from("registrations")
        .update({ user_id: userId, phone: data.phone || undefined })
        .eq("id", regId);
    } else {
      // Create new member registration
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, department")
        .eq("id", userId)
        .single();

      const { data: newReg, error: regErr } = await supabase
        .from("registrations")
        .insert({
          event_id: team.event_id,
          user_id: userId,
          student_id: student.id,
          prn,
          full_name: profile?.full_name || student.full_name,
          email: profile?.email || student.email || "",
          phone: data.phone || profile?.phone || student.phone,
          department: profile?.department || student.department,
          team_id: team.id,
          team_role: "member",
          status: "confirmed",
          amount_paid: 0,
        })
        .select("id")
        .single();

      if (regErr) {
        if (regErr.code === "23505") throw new Error("You are already registered for this event.");
        throw new Error("Failed to join team: " + regErr.message);
      }
      regId = newReg.id;
    }

    // 5. Issue Ticket
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id, ticket_code")
      .eq("registration_id", regId)
      .maybeSingle();

    if (existingTicket) {
      return { ticketId: existingTicket.id, ticketCode: existingTicket.ticket_code };
    }

    const ticketCode = genTicketCode();
    const { data: ticket, error: tkErr } = await supabase
      .from("tickets")
      .insert({
        registration_id: regId,
        event_id: team.event_id,
        user_id: userId,
        ticket_code: ticketCode,
        qr_token: "PLACEHOLDER",
        status: "active",
      })
      .select("id")
      .single();

    if (tkErr) throw new Error("Failed to generate ticket: " + tkErr.message);

    const qrToken = signTicket({ tid: ticket.id, eid: team.event_id, uid: userId });
    await supabase.from("tickets").update({ qr_token: qrToken }).eq("id", ticket.id);

    return { ticketId: ticket.id, ticketCode };
  });

/**
 * Fetch team info & members for a registration.
 */
export const getTeamDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { teamId: string }) => z.object({ teamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, name, invite_code, leader_id")
      .eq("id", data.teamId)
      .single();

    if (teamErr || !team) throw new Error("Team not found.");

    const { data: members, error: memErr } = await supabase
      .from("registrations")
      .select("id, full_name, prn, team_role, user_id")
      .eq("team_id", team.id);

    if (memErr) throw new Error("Failed to load team members.");

    return {
      team,
      members,
    };
  });
