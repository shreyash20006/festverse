import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PrnSchema = z.object({ prn: z.string().trim().min(3).max(40) });

export type VerifyResult = {
  ok: boolean;
  already?: boolean;
  reason?: "not_found" | "taken" | "unauthenticated";
  student?: {
    id: string;
    prn: string;
    full_name: string;
    department: string | null;
    year_of_study: number | null;
    email: string | null;
    phone: string | null;
  };
};

/**
 * Verify the entered PRN against the official student whitelist AND link the
 * matching student record to the currently authenticated user. Backed by a
 * SECURITY DEFINER RPC so the whitelist is never exposed directly to the client.
 */
export const verifyAndLinkPrn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prn: string }) => PrnSchema.parse(input))
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "verify_and_link_prn",
      { _user_id: context.userId, _prn: data.prn.trim() },
    );
    if (error) throw new Error(error.message);
    return result as VerifyResult;
  });
