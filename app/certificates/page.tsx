import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Calendar, Download, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: certs } = await supabase
    .from("certificates")
    .select("id, certificate_code, verification_token, full_name, event_title, issued_at, pdf_url, events(slug)")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">My Certificates</h1>

      {!certs?.length ? (
        <div className="text-center py-20 rounded-2xl border border-border bg-white">
          <Award className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No certificates yet</h3>
          <p className="text-sm text-muted-foreground">Attend events to earn participation certificates.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert: any) => (
            <Card key={cert.id} className="overflow-hidden hover:card-shadow-hover transition-shadow">
              <div className="gradient-brand h-24 flex items-center justify-center">
                <Award className="h-12 w-12 text-white/80" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-display font-bold text-base text-foreground line-clamp-2 mb-1">{cert.event_title}</h3>
                <p className="text-sm text-muted-foreground mb-1">{cert.full_name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                  <Calendar className="h-3 w-3" />
                  {formatDate(cert.issued_at)}
                </div>
                <p className="font-mono text-xs text-muted-foreground mb-4 truncate">Code: {cert.certificate_code}</p>
                <div className="flex gap-2">
                  <Link href={`/verify/${cert.verification_token}`} target="_blank" className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-semibold py-2 hover:bg-muted transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" /> Verify
                    </button>
                  </Link>
                  {cert.pdf_url && (
                    <a href={cert.pdf_url} download className="flex-1">
                      <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-xs font-semibold py-2 hover:bg-primary-600 transition-colors">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
