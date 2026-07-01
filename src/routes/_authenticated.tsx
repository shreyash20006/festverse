import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/admin")) return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    const uid = sess.session.user.id;

    // Admins / staff bypass PRN verification entirely.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const staff = (roles ?? []).some((r) =>
      ["super_admin", "college_admin", "organizer", "scanner"].includes(r.role),
    );
    if (staff) return;

    if (location.pathname.startsWith("/verify-prn")) return;

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
