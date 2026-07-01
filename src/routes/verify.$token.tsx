import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/verify/$token")({
  loader: async ({ params }) => {
    const { data } = await supabase.rpc("verify_certificate", { _token: params.token });
    const cert = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return { cert };
  },
  head: () => ({ meta: [{ title: "Verify certificate · FestVerse" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { cert } = Route.useLoaderData();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
        {cert ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h1 className="mt-4 font-display text-2xl font-bold">Verified certificate</h1>
            <p className="mt-1 text-sm text-muted-foreground">This certificate is genuine.</p>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <Row k="Awarded to" v={cert.full_name} />
              <Row k="Event" v={cert.event_title} />
              <Row k="Code" v={cert.certificate_code} mono />
              <Row k="Issued" v={new Date(cert.issued_at).toLocaleDateString()} />
            </dl>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">Not verified</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              No certificate matches this verification link.
            </p>
          </>
        )}
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          ← Back to FestVerse
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-none">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={`font-semibold ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}
