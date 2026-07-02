import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle, Calendar, Award, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify Certificate" };

export default async function VerifyCertPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, certificate_code, full_name, event_title, issued_at, events(title, start_at)")
    .eq("verification_token", params.token)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="font-display text-2xl font-bold">
            <span className="gradient-brand-text">Fest</span>
            <span className="text-foreground">Verse</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-border bg-white card-shadow p-8 text-center">
          {cert ? (
            <>
              <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h1 className="font-display text-2xl font-bold text-success mb-1">Certificate Verified</h1>
              <p className="text-sm text-muted-foreground mb-8">This is an authentic certificate issued by FestVerse · TGPCOP</p>

              <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-purple-50 p-6 text-left space-y-3 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Recipient</p>
                  <p className="font-display font-bold text-xl text-foreground">{cert.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Event</p>
                  <p className="font-semibold text-foreground">{cert.event_title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Date Issued</p>
                  <p className="text-sm text-foreground">{formatDate(cert.issued_at, "d MMMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Certificate Code</p>
                  <p className="font-mono text-sm text-foreground">{cert.certificate_code}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                Issued by Tulsiramji Gaikwad-Patil College of Pharmacy
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="font-display text-2xl font-bold text-destructive mb-1">Certificate Not Found</h1>
              <p className="text-sm text-muted-foreground">This verification link is invalid or the certificate does not exist.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
