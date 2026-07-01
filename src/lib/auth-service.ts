import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { verifyAndLinkPrn } from "./student-prn.functions";

// Logger for Dev Mode
export const logDev = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`%c[AuthDev] ${message}`, "color: #6366f1; font-weight: bold; padding: 2px 4px; border-radius: 4px; background: rgba(99, 102, 241, 0.1);", ...args);
  }
};

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  prn: string | null;
  department: string | null;
  phone: string | null;
  verified: boolean;
  verified_at: string | null;
  student_id: string | null;
  role: string;
}

// ----------------------------------------------------
// 1. Authentication Service
// ----------------------------------------------------
export const authService = {
  async signInWithGoogle(redirectTo?: string) {
    logDev("Google Login Started", { redirectTo });
    const targetRedirect = redirectTo || window.location.origin + "/student";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: targetRedirect,
      },
    });
    if (error) {
      logDev("Google Login Error", error);
      throw error;
    }
  },

  async signInWithOtp(email: string, redirectTo?: string) {
    logDev("Email OTP Login Started", { email });
    const targetRedirect = redirectTo || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: targetRedirect,
      },
    });
    if (error) {
      logDev("Email OTP Send Error", error);
      throw error;
    }
    logDev("Email OTP Sent Successfully");
  },

  async verifyOtp(email: string, token: string) {
    logDev("Verifying Email OTP", { email, token });
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    if (error) {
      logDev("Email OTP Verification Error", error);
      throw error;
    }
    logDev("Email OTP Verified Success", data);
    return data;
  },

  async signOut() {
    logDev("Sign Out Initiated");
    const { error } = await supabase.auth.signOut();
    if (error) {
      logDev("Sign Out Error", error);
      throw error;
    }
    logDev("Sign Out Complete");
  }
};

// ----------------------------------------------------
// 2. Profile Service
// ----------------------------------------------------
export const profileService = {
  async getProfile(uid: string): Promise<Profile | null> {
    logDev("Profile Query Started", { uid });
    
    // Primary query selecting all columns
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, prn, department, phone, verified, verified_at, student_id, role")
        .eq("id", uid)
        .maybeSingle();

      if (!error && data) {
        logDev("Profile Loaded successfully", data);
        return data as unknown as Profile;
      }

      if (error) {
        logDev("Profile query primary attempt error (possible schema mismatch)", error);
      }
    } catch (err) {
      logDev("Exception during primary profile query", err);
    }

    // Fallback Query with basic columns (handles database out-of-sync/missing columns)
    try {
      logDev("Attempting fallback profile query with basic columns...");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, verified, role, prn")
        .eq("id", uid)
        .maybeSingle();

      if (!error && data) {
        logDev("Profile Loaded (via Fallback)", data);
        // Fill in missing columns for type safety
        return {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          verified: !!data.verified,
          role: data.role || "student",
          prn: data.prn,
          department: null,
          phone: null,
          verified_at: null,
          student_id: null
        } as Profile;
      }
      
      if (error) {
        logDev("Fallback profile query failed", error);
      }
    } catch (err) {
      logDev("Exception during fallback profile query", err);
    }

    // Client-side Fallback Recovery (Builds a mock profile from current authenticated user metadata to prevent UI hangs)
    try {
      logDev("Profile query failed. Attempting client-side fallback recovery using auth metadata...");
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === uid) {
        const fallback: Profile = {
          id: uid,
          email: user.email || null,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || null,
          prn: null,
          department: null,
          phone: null,
          verified: false,
          verified_at: null,
          student_id: null,
          role: "student"
        };
        logDev("Profile Loaded (Client-side Fallback)", fallback);
        return fallback;
      }
    } catch (err) {
      logDev("Exception during client-side fallback generation", err);
    }

    return null;
  },

  async createProfileIfMissing(user: User): Promise<Profile | null> {
    logDev("Checking if profile exists to create if missing", { uid: user.id });
    
    // Check if exists first
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        logDev("Profile already exists. No creation needed.");
        return null;
      }
    } catch (err) {
      logDev("Error checking profile existence", err);
    }

    // Create profile
    logDev("Profile Missing. Auto-creating profile for:", user.email);
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const avatarUrl = user.user_metadata?.avatar_url || null;
    
    const newProfile = {
      id: user.id,
      email: user.email || null,
      full_name: fullName,
      avatar_url: avatarUrl,
      verified: false,
      role: "student"
    };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .maybeSingle();

      if (error) {
        logDev("Auto-creation of profile failed", error);
        throw error;
      }

      logDev("Profile Created successfully", data);
      return data as unknown as Profile;
    } catch (err) {
      logDev("Exception during profile auto-creation", err);
      throw err;
    }
  },

  async updateProfile(uid: string, updates: Partial<Profile>) {
    logDev("Updating profile", { uid, updates });
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", uid)
      .select()
      .maybeSingle();
      
    if (error) {
      logDev("Update profile failed", error);
      throw error;
    }
    
    logDev("Profile updated successfully", data);
    return data;
  }
};

// ----------------------------------------------------
// 3. Role Service
// ----------------------------------------------------
export const roleService = {
  async getUserRoles(uid: string): Promise<string[]> {
    logDev("Role Query Started", { uid });
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    if (error) {
      logDev("Role query failed", error);
      return [];
    }

    const rolesList = (data ?? []).map((x: { role: string }) => x.role);
    logDev("Role Loaded successfully", rolesList);
    return rolesList;
  },

  isStaff(roles: string[]): boolean {
    return roles.some(r => ["super_admin", "college_admin", "organizer", "scanner"].includes(r));
  },

  isAdmin(roles: string[]): boolean {
    return roles.some(r => ["super_admin", "college_admin", "organizer"].includes(r));
  }
};

// ----------------------------------------------------
// 4. Session Service
// ----------------------------------------------------
export const sessionService = {
  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logDev("Get session error", error);
      return null;
    }
    if (session) {
      logDev("Session Loaded/Created", { email: session.user.email, id: session.user.id });
    }
    return session;
  },

  onSessionChange(callback: (event: string, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logDev(`Session State Change: ${event}`, { session: session?.user?.email });
      callback(event, session);
    });
    return subscription;
  }
};

// ----------------------------------------------------
// 5. Verification Service
// ----------------------------------------------------
export const verificationService = {
  async verifyPRN(prn: string) {
    logDev("Verifying PRN", { prn });
    const res = await verifyAndLinkPrn({ data: { prn } });
    logDev("PRN verification response", res);
    return res;
  }
};
