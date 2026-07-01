import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/components/auth-provider";
import { TenantProvider } from "@/components/tenant-provider";
import { Toaster } from "@/components/ui/sonner";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold tracking-tight text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't find that page. It may have been moved or never existed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Something went wrong on our end."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CampusConnect — College events, tickets & certificates" },
      {
        name: "description",
        content:
          "CampusConnect is the modern way colleges run events: discovery, paid & free registration, QR tickets, attendance, and certificates.",
      },
      { property: "og:title", content: "CampusConnect — College events, tickets & certificates" },
      { property: "og:description", content: "Campus Canvas is a college event management and ticketing platform for publishing, registering, and managing events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CampusConnect — College events, tickets & certificates" },
      { name: "description", content: "Campus Canvas is a college event management and ticketing platform for publishing, registering, and managing events." },
      { name: "twitter:description", content: "Campus Canvas is a college event management and ticketing platform for publishing, registering, and managing events." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/baf6d106-b49f-416f-bd3b-db984a5b0ca1/id-preview-89ce7cb7--bcea13ef-0a67-4379-9ac1-372bd8c2ce23.lovable.app-1782805063644.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/baf6d106-b49f-416f-bd3b-db984a5b0ca1/id-preview-89ce7cb7--bcea13ef-0a67-4379-9ac1-372bd8c2ce23.lovable.app-1782805063644.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <Outlet />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
