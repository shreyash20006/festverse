import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // 1. Session Check
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    const uid = sess.session.user.id;

    // Detect if current path is a sub-auth page (MFA verify or MFA enroll)
    const isMfaPage =
      location.pathname.startsWith("/auth/mfa-enroll") ||
      location.pathname.startsWith("/auth/mfa-verify");
    const isVerifyPrnPage = location.pathname.startsWith("/verify-prn");

    // 2. Query Roles and MFA Assurance Levels
    const [{ data: roles }, { data: mfaInfo }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    const rolesList = (roles ?? []).map((r) => r.role);
    const hasAdminRole = rolesList.some((r) =>
      ["super_admin", "college_admin", "organizer"].includes(r)
    );
    const isStaff = rolesList.some((r) =>
      ["super_admin", "college_admin", "organizer", "scanner"].includes(r)
    );

    // 3. MFA Protection Policy
    if (hasAdminRole && !isMfaPage) {
      // Admins MUST enroll in MFA
      if (mfaInfo?.nextLevel === "aal1") {
        throw redirect({ to: "/auth/mfa-enroll" });
      }
      // Admins MUST verify MFA if enrolled
      if (mfaInfo?.nextLevel === "aal2" && mfaInfo?.currentLevel === "aal1") {
        throw redirect({ to: "/auth/mfa-verify" });
      }
    }

    if (!hasAdminRole && !isMfaPage) {
      // Students/Volunteers: MFA verification is optional but required if enrolled
      if (mfaInfo?.nextLevel === "aal2" && mfaInfo?.currentLevel === "aal1") {
        throw redirect({ to: "/auth/mfa-verify" });
      }
    }

    // Skip verification check if they are already visiting MFA pages
    if (isMfaPage) return;

    // 4. PRN Verification Policy (Admins / Staff bypass this entirely)
    if (isStaff) return;
    if (isVerifyPrnPage) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("verified")
      .eq("id", uid)
      .maybeSingle();

    if (!profile?.verified) {
      throw redirect({ to: "/verify-prn", search: { redirect: location.pathname } as never });
    }
  },
  component: () => <Outlet />,
});
