import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StudentSchema = z.object({
  prn: z.string().trim().min(3).max(40),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().trim().max(20).optional(),
  department: z.string().trim().max(80).optional(),
  year_of_study: z.coerce.number().int().min(1).max(7).optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin", { _user_id: userId });
  if (!data) throw new Error("Forbidden: admin access required.");
}

export const bulkUploadStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: Array<z.input<typeof StudentSchema>> }) => ({
    rows: z.array(StudentSchema).max(5000).parse(input.rows),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: college } = await context.supabase
      .from("colleges")
      .select("id")
      .eq("slug", "tgpcop")
      .single();
    if (!college) throw new Error("Default college not found.");

    const rows = data.rows.map((r) => ({
      ...r,
      prn: r.prn.trim().toUpperCase(),
      email: r.email || null,
      college_id: college.id,
    }));

    const { error, count } = await context.supabase
      .from("students")
      .upsert(rows, { onConflict: "college_id,prn", count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? rows.length };
  });

const EventSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
  short_description: z.string().max(280).optional(),
  description: z.string().max(8000).optional(),
  category: z.enum([
    "technical",
    "cultural",
    "sports",
    "workshop",
    "placement",
    "pharmacy",
    "seminar",
    "other",
  ]),
  banner_url: z.string().url().optional().or(z.literal("")),
  venue: z.string().max(200).optional(),
  start_at: z.string(),
  end_at: z.string(),
  registration_closes_at: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  price_inr: z.coerce.number().nonnegative().default(0),
  is_paid: z.boolean().default(false),
  status: z.enum(["draft", "published", "cancelled", "completed"]).default("draft"),
  featured: z.boolean().default(false),
  organizer_name: z.string().max(120).optional(),
});

export const createOrUpdateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; event: z.input<typeof EventSchema> }) => ({
      id: input.id,
      event: EventSchema.parse(input.event),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: college } = await context.supabase
      .from("colleges")
      .select("id")
      .eq("slug", "tgpcop")
      .single();
    if (!college) throw new Error("Default college not found.");

    const row = {
      ...data.event,
      college_id: college.id,
      created_by: context.userId,
      banner_url: data.event.banner_url || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("events").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ev, error } = await context.supabase
      .from("events")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ev.id };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getEventForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: ev, error } = await context.supabase.from("events").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return ev;
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userEmail: string; role: string }) =>
    z.object({
      userEmail: z.string().email(),
      role: z.enum(["super_admin", "college_admin", "organizer", "scanner", "student"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);
    const user = list.users.find((u) => u.email?.toLowerCase() === data.userEmail.toLowerCase());
    if (!user) throw new Error("User not found. Ask them to sign in first.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: data.role as any, granted_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
