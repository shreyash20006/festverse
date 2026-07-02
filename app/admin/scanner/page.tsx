import type { Metadata } from "next";
import { QRScannerClient } from "@/components/admin/qr-scanner-client";

export const metadata: Metadata = { title: "QR Scanner" };

export default function ScannerPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-sm text-muted-foreground mt-1">Scan attendee QR codes to mark check-in for events.</p>
      </div>
      <QRScannerClient />
    </div>
  );
}
