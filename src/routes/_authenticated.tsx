import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { profileService, roleService, sessionService } from "@/lib/auth-service";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // 1. Session Check
    const session = await sessionService.getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    const uid = session.user.id;

    // Detect if current path is a sub-auth page (MFA verify or MFA enroll)
    const isMfaPage =
      location.pathname.startsWith("/auth/mfa-enroll") ||
      location.pathname.startsWith("/auth/mfa-verify");
    const isVerifyPrnPage = location.pathname.startsWith("/verify-prn");

    // 2. Query Roles and MFA Assurance Levels
    const [rolesList, mfaInfo] = await Promise.all([
      roleService.getUserRoles(uid),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    const hasAdminRole = roleService.isAdmin(rolesList);
    const isStaff = roleService.isStaff(rolesList);

    // 3. MFA Protection Policy
    if (hasAdminRole && !isMfaPage) {
      // Admins MUST verify MFA if enrolled
      if (mfaInfo?.data?.nextLevel === "aal2" && mfaInfo?.data?.currentLevel === "aal1") {
        throw redirect({ to: "/auth/mfa-verify" });
      }
    }

    if (!hasAdminRole && !isMfaPage) {
      // Students/Volunteers: MFA verification is optional but required if enrolled
      if (mfaInfo?.data?.nextLevel === "aal2" && mfaInfo?.data?.currentLevel === "aal1") {
        throw redirect({ to: "/auth/mfa-verify" });
      }
    }

    // Skip verification check if they are already visiting MFA pages
    if (isMfaPage) return;

    // 4. PRN Verification Policy (Admins / Staff bypass this entirely)
    if (isStaff) return;
    if (isVerifyPrnPage) return;

    const profile = await profileService.getProfile(uid);

    if (!profile?.verified) {
      throw redirect({ to: "/verify-prn", search: { redirect: location.pathname } as never });
    }
  },
  component: () => <Outlet />,
});
