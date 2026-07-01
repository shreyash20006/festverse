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

async function assertAdmin(supabase: any, userId: string): Promise<string> {
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("college_id, role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "college_admin", "organizer"])
    .limit(1)
    .maybeSingle();

  if (!roleRow) throw new Error("Forbidden: admin access required.");
  return roleRow.college_id;
}

export const bulkUploadStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: Array<z.input<typeof StudentSchema>> }) => ({
    rows: z.array(StudentSchema).max(5000).parse(input.rows),
  }))
  .handler(async ({ data, context }) => {
    const collegeId = await assertAdmin(context.supabase, context.userId);
    if (!collegeId) throw new Error("No associated college found for your account.");

    const rows = data.rows.map((r) => ({
      ...r,
      prn: r.prn.trim().toUpperCase(),
      email: r.email || null,
      college_id: collegeId,
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
  // Advanced pricing details
  registration_type: z.enum(["free", "paid"]).default("free"),
  registration_fee: z.coerce.number().nonnegative().default(0),
  early_bird_price: z.coerce.number().nonnegative().optional().nullable(),
  early_bird_deadline: z.string().optional().nullable(),
  late_registration_price: z.coerce.number().nonnegative().optional().nullable(),
  gst_percent: z.coerce.number().nonnegative().default(0),
  discount_amount: z.coerce.number().nonnegative().default(0),
  coupon_code: z.string().optional().nullable(),
  max_registrations: z.coerce.number().int().positive().optional().nullable(),
  registration_deadline: z.string().optional().nullable(),
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
    const collegeId = await assertAdmin(context.supabase, context.userId);
    if (!collegeId) throw new Error("No associated college found for your account.");

    const row = {
      title: data.event.title,
      slug: data.event.slug,
      short_description: data.event.short_description || null,
      description: data.event.description || null,
      category: data.event.category,
      banner_url: data.event.banner_url || null,
      venue: data.event.venue || null,
      start_at: data.event.start_at,
      end_at: data.event.end_at,
      registration_closes_at: data.event.registration_closes_at || null,
      capacity: data.event.capacity || null,
      // Sync legacy price fields
      price_inr: data.event.registration_type === "paid" ? data.event.registration_fee : 0,
      is_paid: data.event.registration_type === "paid",
      status: data.event.status,
      featured: data.event.featured,
      organizer_name: data.event.organizer_name || null,
      college_id: collegeId,
      created_by: context.userId,
    };

    let evId = data.id;
    if (data.id) {
      const { error } = await context.supabase.from("events").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: ev, error } = await context.supabase
        .from("events")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      evId = ev.id;
    }

    // Save advanced pricing details
    const pricingRow = {
      event_id: evId,
      registration_type: data.event.registration_type,
      registration_fee: data.event.registration_fee,
      currency: "INR",
      early_bird_price: data.event.early_bird_price || null,
      early_bird_deadline: data.event.early_bird_deadline || null,
      late_registration_price: data.event.late_registration_price || null,
      gst_percent: data.event.gst_percent || 0,
      discount_amount: data.event.discount_amount || 0,
      coupon_code: data.event.coupon_code || null,
      max_registrations: data.event.max_registrations || null,
      registration_deadline: data.event.registration_deadline || null,
    };

    const { error: pricingErr } = await context.supabase
      .from("event_pricing")
      .upsert(pricingRow, { onConflict: "event_id" });
    
    if (pricingErr) throw new Error("Pricing details failed to save: " + pricingErr.message);

    return { id: evId };
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

    // Fetch matching pricing row
    const { data: pricing } = await context.supabase
      .from("event_pricing")
      .select("*")
      .eq("event_id", data.id)
      .maybeSingle();

    return {
      ...ev,
      registration_type: pricing?.registration_type ?? (ev.is_paid ? "paid" : "free"),
      registration_fee: pricing?.registration_fee ?? ev.price_inr ?? 0,
      early_bird_price: pricing?.early_bird_price ?? null,
      early_bird_deadline: pricing?.early_bird_deadline ?? null,
      late_registration_price: pricing?.late_registration_price ?? null,
      gst_percent: pricing?.gst_percent ?? 0,
      discount_amount: pricing?.discount_amount ?? 0,
      coupon_code: pricing?.coupon_code ?? null,
      max_registrations: pricing?.max_registrations ?? null,
      registration_deadline: pricing?.registration_deadline ?? null,
    };
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
    const collegeId = await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);
    const user = list.users.find((u) => u.email?.toLowerCase() === data.userEmail.toLowerCase());
    if (!user) throw new Error("User not found. Ask them to sign in first.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: data.role as any, college_id: collegeId, granted_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCollegeTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; slug: string }) =>
    z.object({
      name: z.string().trim().min(3).max(100),
      slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check if slug is taken
    const { data: existing } = await supabase
      .from("colleges")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing) {
      throw new Error(`The college URL slug '${data.slug}' is already taken.`);
    }

    // Insert college
    const { data: college, error: colErr } = await supabase
      .from("colleges")
      .insert({
        name: data.name,
        slug: data.slug,
        is_active: true,
      })
      .select("id")
      .single();

    if (colErr || !college) {
      throw new Error(colErr?.message ?? "Failed to create college");
    }

    // Map creator as college_admin for this college
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "college_admin",
        college_id: college.id,
      });

    if (roleErr) {
      // Cleanup college on role fail
      await supabase.from("colleges").delete().eq("id", college.id);
      throw new Error(roleErr.message);
    }

    return { ok: true, collegeId: college.id, slug: data.slug };
  });
