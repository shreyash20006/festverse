import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

import { SessionMonitor } from "@/components/auth/session-monitor";
import { profileService, roleService, sessionService, logDev, type Profile } from "@/lib/auth-service";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  isAdmin: false,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string, currentUser?: User) => {
    logDev("Loading extras (Profile & Roles)", { uid });
    try {
      // 1. If user is provided, check & create profile if missing (Step 6)
      if (currentUser) {
        try {
          await profileService.createProfileIfMissing(currentUser);
        } catch (err) {
          logDev("Non-blocking error during createProfileIfMissing", err);
        }
      }

      // 2. Load profile and roles in parallel
      const [p, r] = await Promise.all([
        profileService.getProfile(uid),
        roleService.getUserRoles(uid),
      ]);

      setProfile(p);
      setRoles(r);
      logDev("Profile & Roles Loaded into Auth Context State", { profile: p, roles: r });
    } catch (err) {
      logDev("Failed to load extras", err);
    }
  };

  const refresh = async () => {
    logDev("Auth Context Refresh Requested");
    if (session?.user) {
      await loadExtras(session.user.id, session.user);
    }
  };

  useEffect(() => {
    let mounted = true;
    logDev("Initializing AuthProvider session...");

    sessionService.getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        logDev("Session detected on init. Loading profile details...");
        loadExtras(s.user.id, s.user).finally(() => {
          if (mounted) {
            setLoading(false);
            logDev("AuthProvider initialization complete.");
          }
        });
      } else {
        setLoading(false);
        logDev("No active session detected on init.");
      }
    });

    const subscription = sessionService.onSessionChange((event, s) => {
      if (!mounted) return;
      
      if (event === "SIGNED_IN") {
        logDev("Auth Event: SIGNED_IN. Syncing user details...");
        setSession(s);
        if (s?.user) {
          setLoading(true);
          loadExtras(s.user.id, s.user).finally(() => {
            if (mounted) setLoading(false);
          });
        }
      } else if (event === "SIGNED_OUT") {
        logDev("Auth Event: SIGNED_OUT. Cleaning context state.");
        setSession(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
      } else if (event === "USER_UPDATED") {
        logDev("Auth Event: USER_UPDATED. Refreshing profile details...");
        setSession(s);
        if (s?.user) {
          loadExtras(s.user.id, s.user).finally(() => {
            if (mounted) setLoading(false);
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roleService.isAdmin(roles);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        roles,
        isAdmin,
        loading,
        refresh,
      }}
    >
      {children}
      <SessionMonitor />
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

