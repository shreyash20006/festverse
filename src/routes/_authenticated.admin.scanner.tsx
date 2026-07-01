import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useServerFn } from "@tanstack/react-start";
import { scanTicket } from "@/lib/scanner.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/scanner")({
  head: () => ({ meta: [{ title: "Scanner · Admin · CampusConnect" }] }),
  component: ScannerPage,
});

interface ScanResult {
  ok: boolean;
  reason: string;
  message: string;
  ticket?: any;
}

function ScannerPage() {
  const scan = useServerFn(scanTicket);
  const [scanning, setScanning] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const start = async () => {
    setScanning(true);
    setLast(null);
    const id = "scanner-region";
    qrRef.current = new Html5Qrcode(id);
    try {
      await qrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (decoded) => {
          if (busyRef.current || decoded === lastTokenRef.current) return;
          busyRef.current = true;
          lastTokenRef.current = decoded;
          try {
            const r = await scan({ data: { qrToken: decoded } });
            setLast(r as ScanResult);
          } catch (e: any) {
            setLast({ ok: false, reason: "error", message: e?.message ?? "Scan failed" });
          } finally {
            setTimeout(() => {
              busyRef.current = false;
              lastTokenRef.current = null;
            }, 2500);
          }
        },
        () => {}
      );
    } catch (e: any) {
      setScanning(false);
      setLast({ ok: false, reason: "error", message: e?.message ?? "Could not access camera" });
    }
  };

  const stop = async () => {
    try {
      await qrRef.current?.stop();
      await qrRef.current?.clear();
    } catch {}
    qrRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      qrRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="container mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">QR Scanner</h1>
      <p className="mt-1 text-sm text-muted-foreground">Scan attendee QR codes to mark attendance.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
        <div className="relative aspect-square bg-black">
          <div id="scanner-region" className="h-full w-full" />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center bg-black text-white/70">
              <div className="text-center">
                <CameraOff className="mx-auto h-12 w-12 opacity-60" />
                <p className="mt-3 text-sm">Camera off</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          {scanning ? (
            <Button onClick={stop} variant="outline" className="rounded-full">
              <CameraOff className="mr-2 h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={start} className="rounded-full bg-gradient-brand text-white shadow-glow">
              <Camera className="mr-2 h-4 w-4" /> Start scanning
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Allow camera access when prompted.</p>
        </div>
      </div>

      {last && (
        <div
          className={`mt-6 rounded-3xl border p-6 shadow-card ${
            last.ok
              ? "border-success/40 bg-success/10"
              : last.reason === "already_checked_in"
              ? "border-warning/50 bg-warning/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div className="flex items-start gap-3">
            {last.ok ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : last.reason === "already_checked_in" ? (
              <AlertTriangle className="h-6 w-6 text-warning-foreground" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">{last.message}</div>
              {last.ticket && (
                <div className="mt-2 text-sm">
                  <div><b>{last.ticket.registrations?.full_name}</b> · {last.ticket.registrations?.prn}</div>
                  <div className="text-muted-foreground">{last.ticket.events?.title}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{last.ticket.ticket_code}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
