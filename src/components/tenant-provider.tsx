import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CollegeBranding {
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  headerMediaUrl: string | null;
  headerMediaType: "image" | "video";
  footerMediaUrl: string | null;
  footerMediaType: "image" | "video";
  ogImageUrl: string | null;
  tagline: string | null;
  shortName: string | null;
  name: string | null;
}

interface TenantCtx {
  college: any | null;
  collegeId: string | null;
  isRoot: boolean;
  loading: boolean;
  branding: CollegeBranding;
}

const DEFAULT_BRANDING: CollegeBranding = {
  primaryColor: "#6D28D9",
  logoUrl: null,
  faviconUrl: null,
  headerMediaUrl: null,
  headerMediaType: "image",
  footerMediaUrl: null,
  footerMediaType: "image",
  ogImageUrl: null,
  tagline: null,
  shortName: null,
  name: null,
};

const Ctx = createContext<TenantCtx>({
  college: null,
  collegeId: null,
  isRoot: true,
  loading: true,
  branding: DEFAULT_BRANDING,
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
        if (active) { setIsRoot(true); setLoading(false); }
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
            const { data: fallback } = await supabase
              .from("colleges")
              .select("*")
              .eq("slug", "tgpcop")
              .maybeSingle();
            if (fallback) { setCollege(fallback); setIsRoot(false); }
            else setIsRoot(true);
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

  // Apply dynamic brand color to CSS custom properties
  useEffect(() => {
    if (college?.primary_color) {
      document.documentElement.style.setProperty("--primary", college.primary_color);
    }
  }, [college]);

  // Inject dynamic favicon when college has one
  useEffect(() => {
    if (!college?.favicon_url) return;

    const existing = document.querySelector("link[rel*='icon']");
    if (existing) {
      (existing as HTMLLinkElement).href = college.favicon_url;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/x-icon";
      link.href = college.favicon_url;
      document.head.appendChild(link);
    }

    // Also set apple-touch-icon
    const appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (appleLink) appleLink.href = college.favicon_url;
  }, [college?.favicon_url]);

  // Inject dynamic document title when college has a name
  useEffect(() => {
    if (college?.name) {
      const base = college.short_name || college.name;
      // Only set if current title doesn't include the college name yet
      if (!document.title.includes(base)) {
        document.title = document.title.replace("FestVerse", `${base} | FestVerse`);
      }
    }
  }, [college?.name]);

  const branding: CollegeBranding = {
    primaryColor: college?.primary_color ?? "#6D28D9",
    logoUrl: college?.logo_url ?? null,
    faviconUrl: college?.favicon_url ?? null,
    headerMediaUrl: college?.header_media_url ?? null,
    headerMediaType: (college?.header_media_type as "image" | "video") ?? "image",
    footerMediaUrl: college?.footer_media_url ?? null,
    footerMediaType: (college?.footer_media_type as "image" | "video") ?? "image",
    ogImageUrl: college?.og_image_url ?? null,
    tagline: college?.tagline ?? null,
    shortName: college?.short_name ?? null,
    name: college?.name ?? null,
  };

  return (
    <Ctx.Provider value={{ college, collegeId: college?.id ?? null, isRoot, loading, branding }}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Connecting to campus...
            </p>
          </div>
        </div>
      ) : children}
    </Ctx.Provider>
  );
}

export const useTenant = () => useContext(Ctx);
