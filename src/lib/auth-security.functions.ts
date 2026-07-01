import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHash } from "node:crypto";

const RecoverySchema = z.object({ code: z.string().trim() });

/**
 * Server function to log a user login event.
 * Can be called immediately after a successful authentication.
 */
export const logUserLoginEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { method: "google" | "email_otp" }) => z.object({ method: z.enum(["google", "email_otp"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    
    const userAgent = req?.headers.get("user-agent") || null;
    const ipAddress = req?.headers.get("x-forwarded-for")?.split(",")[0].trim() || req?.headers.get("x-real-ip") || null;

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "auth.login",
      entity_type: "session",
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { method: data.method, timestamp: new Date().toISOString() },
    });

    if (error) {
      console.error("Failed to log user login event:", error);
    }
    return { ok: true };
  });

/**
 * Retrieve the last 10 login sessions for the currently authenticated user.
 */
export const getUserLoginHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .select("id, action, ip_address, user_agent, created_at, metadata")
      .eq("user_id", context.userId)
      .eq("action", "auth.login")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Bypass MFA using a recovery code.
 * If valid, all active MFA factors are deleted for the user on the server.
 */
export const bypassMfaWithRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => RecoverySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = getRequest();
    const userAgent = req?.headers.get("user-agent") || null;
    const ipAddress = req?.headers.get("x-forwarded-for")?.split(",")[0].trim() || req?.headers.get("x-real-ip") || null;

    // Get the user record from auth admin API
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userErr || !user) throw new Error("User not found.");

    const recoveryCodes: string[] = user.user_metadata?.mfa_recovery_codes || [];
    if (recoveryCodes.length === 0) {
      throw new Error("No recovery codes are configured for this account.");
    }

    const enteredCode = data.code.trim().toUpperCase();
    const matchIndex = recoveryCodes.indexOf(enteredCode);

    if (matchIndex === -1) {
      throw new Error("Invalid recovery code. Please check and try again.");
    }

    // Code is valid! Retrieve factors
    const { data: factorsData, error: listErr } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: context.userId,
    });
    if (listErr) throw new Error("Could not check MFA state.");

    // Delete verified TOTP factors
    const activeFactors = factorsData?.factors || [];
    for (const factor of activeFactors) {
      if (factor.factor_type === "totp") {
        const { error: delErr } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
          userId: context.userId,
          id: factor.id,
        });
        if (delErr) {
          console.error(`Failed to delete factor ${factor.id}:`, delErr);
        }
      }
    }

    // Remove the used code
    const updatedCodes = recoveryCodes.filter((_, i) => i !== matchIndex);

    // Update user metadata
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        ...user.user_metadata,
        mfa_recovery_codes: updatedCodes,
      },
    });
    if (updateErr) throw new Error("Failed to update user security metadata.");

    // Log the security event
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "auth.mfa_reset",
      entity_type: "mfa",
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { method: "recovery_code", remaining_codes: updatedCodes.length },
    });

    return { ok: true, remainingCodesCount: updatedCodes.length };
  });
