import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CollegeBranding {
  primaryColor: string;
  logoUrl: string | null;
}

interface TenantCtx {
  college: any | null;
  collegeId: string | null;
  isRoot: boolean;
  loading: boolean;
  branding: CollegeBranding;
}

const Ctx = createContext<TenantCtx>({
  college: null,
  collegeId: null,
  isRoot: true,
  loading: true,
  branding: { primaryColor: "#FF5A5F", logoUrl: null },
});

export function getTenantFromUrl(): { type: 'subdomain' | 'path' | 'root'; slug: string | null } {
  if (typeof window === "undefined") {
    return { type: "root", slug: null };
  }
  const host = window.location.hostname;
  const parts = host.split(".");
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.");

  // Exclude common subdomains like 'www'
  if (parts.length > (isLocalhost ? 1 : 2) && parts[0] !== "www") {
    return { type: "subdomain", slug: parts[0] };
  }

  // Fallback to checking path /c/slug
  const pathParts = window.location.pathname.split("/");
  if (pathParts[1] === "c" && pathParts[2]) {
    return { type: "path", slug: pathParts[2] };
  }

  return { type: "root", slug: null };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [college, setCollege] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRoot, setIsRoot] = useState(true);

  useEffect(() => {
    let active = true;
    const resolveTenant = async () => {
      const tenant = getTenantFromUrl();
      if (!tenant.slug) {
        if (active) {
          setIsRoot(true);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("colleges")
          .select("*")
          .eq("slug", tenant.slug)
          .eq("is_active", true)
          .maybeSingle();

        if (active) {
          if (data) {
            setCollege(data);
            setIsRoot(false);
          } else {
            // Fallback to first available college or default to help development flow
            const { data: fallback } = await supabase
              .from("colleges")
              .select("*")
              .eq("slug", "tgpcop")
              .maybeSingle();
            if (fallback) {
              setCollege(fallback);
              setIsRoot(false);
            } else {
              setIsRoot(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to resolve tenant", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    resolveTenant();
    return () => { active = false; };
  }, []);

  // Configure dynamic theme color in document style
  useEffect(() => {
    if (college?.primary_color) {
      document.documentElement.style.setProperty("--primary", college.primary_color);
    }
  }, [college]);

  const branding: CollegeBranding = {
    primaryColor: college?.primary_color ?? "#FF5A5F",
    logoUrl: college?.logo_url ?? "https://res.cloudinary.com/dsqxboxoc/image/upload/v1782801547/campus_logo_oj2pcn.png",
  };

  return (
    <Ctx.Provider
      value={{
        college,
        collegeId: college?.id ?? null,
        isRoot,
        loading,
        branding,
      }}
    >
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Connecting to campus...
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </Ctx.Provider>
  );
}

export const useTenant = () => useContext(Ctx);
