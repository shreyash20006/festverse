import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminCertificatesClient } from "@/components/admin/certificates-client";

export const metadata: Metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  const supabase = await createClient();

  const [{ data: certs }, { data: events }] = await Promise.all([
    supabase
      .from("certificates")
      .select("id, event_id, user_id, registration_id, certificate_code, verification_token, full_name, event_title, issued_at, pdf_url")
      .order("issued_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, title, certificate_required")
      .eq("certificate_required", true)
      .order("title"),
  ]);

  return (
    <AdminCertificatesClient
      certificates={certs ?? []}
      events={events ?? []}
    />
  );
}
