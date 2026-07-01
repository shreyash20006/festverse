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
        <div className="relative aspect-square bg-black overflow-hidden">
          <div id="scanner-region" className="h-full w-full" />
          {scanning && (
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8">
              {/* Corner Targets */}
              <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg shadow-[0_0_10px_var(--color-primary)]" />
              <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg shadow-[0_0_10px_var(--color-primary)]" />
              <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg shadow-[0_0_10px_var(--color-primary)]" />
              <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg shadow-[0_0_10px_var(--color-primary)]" />
              
              {/* Laser Scanning Line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_var(--color-primary)] animate-scan" />
            </div>
          )}
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center bg-black/90 text-white/70 z-10 backdrop-blur-[2px]">
              <div className="text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 mx-auto border border-white/10">
                  <CameraOff className="h-8 w-8 opacity-60" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/65">Camera offline</p>
                <p className="text-[10px] text-white/45 mt-1">Start scanning to enable check-in</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 p-4 bg-muted/20 border-t border-border/60">
          {scanning ? (
            <Button onClick={stop} variant="outline" className="rounded-full shadow-sm hover:bg-destructive/10 hover:text-destructive border-border/80 cursor-pointer active:scale-95">
              <CameraOff className="mr-2 h-4 w-4" /> Stop Scanner
            </Button>
          ) : (
            <Button onClick={start} className="rounded-full bg-gradient-brand text-white shadow-glow hover:shadow-glow-primary cursor-pointer active:scale-95">
              <Camera className="mr-2 h-4 w-4" /> Start scanning
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Camera access is required for scanning.</p>
        </div>
      </div>

      {last && (
        <div
          className={`mt-6 rounded-3xl border p-6 shadow-elevated transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-5 ${
            last.ok
              ? "border-success/30 bg-success/5 text-success-foreground"
              : last.reason === "already_checked_in"
              ? "border-warning/35 bg-warning/5 text-warning-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive-foreground"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              last.ok
                ? "bg-success/15 text-success"
                : last.reason === "already_checked_in"
                ? "bg-warning/20 text-warning"
                : "bg-destructive/15 text-destructive"
            }`}>
              {last.ok ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : last.reason === "already_checked_in" ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-bold tracking-tight">{last.message}</div>
              {last.ticket && (
                <div className="mt-3 grid gap-1.5 rounded-2xl bg-card border border-border/50 p-4 shadow-sm text-foreground">
                  <div className="text-sm font-semibold">{last.ticket.registrations?.full_name}</div>
                  <div className="text-xs font-mono text-muted-foreground tracking-wider uppercase">{last.ticket.registrations?.prn}</div>
                  <div className="mt-1 border-t border-border/60 pt-2 text-xs">
                    <span className="text-muted-foreground">Event: </span>
                    <span className="font-medium text-foreground">{last.ticket.events?.title}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/80 mt-0.5">
                    Ticket Code: {last.ticket.ticket_code}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
