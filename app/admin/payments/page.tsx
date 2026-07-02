import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminPaymentsClient } from "@/components/admin/payments-client";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, provider_order_id, provider_payment_id, amount_inr, status, created_at, event_id, events(title)")
    .order("created_at", { ascending: false });

  const totalRevenue = payments
    ?.filter((p) => p.status === "success")
    .reduce((acc, p) => acc + Number(p.amount_inr), 0) ?? 0;

  const successCount = payments?.filter((p) => p.status === "success").length ?? 0;

  return (
    <AdminPaymentsClient
      payments={(payments ?? []) as any}
      totalRevenue={totalRevenue}
      successCount={successCount}
    />
  );
}
