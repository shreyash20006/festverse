"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, QrCode, Keyboard, Camera, User, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ScanResult = {
  status: "success" | "error" | "already_used";
  ticket?: any;
  message?: string;
};

export function QRScannerClient() {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setScanning(true);
    setResult(null);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await processQRToken(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      toast({ title: "Camera error", description: "Please allow camera access and try again.", variant: "destructive" });
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  };

  const processQRToken = async (token: string) => {
    setProcessing(true);
    setResult(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("id, status, ticket_code, checked_in_at, event_id, events(id, title, start_at, venue), registrations(user_id, full_name, prn, department)")
        .eq("qr_token", token.trim())
        .maybeSingle();

      if (error || !ticket) {
        setResult({ status: "error", message: "Ticket not found. Invalid QR code." });
        return;
      }

      if (ticket.status === "used") {
        setResult({ status: "already_used", ticket, message: `Already checked in at ${formatDateTime(ticket.checked_in_at)}` });
        return;
      }

      if (ticket.status === "cancelled") {
        setResult({ status: "error", ticket, message: "This ticket has been cancelled." });
        return;
      }

      // Mark as checked in
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ status: "used", checked_in_at: new Date().toISOString(), checked_in_by: user.id })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      // Log attendance
      await supabase.from("attendance").insert({
        ticket_id: ticket.id,
        event_id: ticket.event_id,
        user_id: (ticket as any).registrations?.user_id ?? user.id,
        scanned_by: user.id,
        scan_method: "qr",
      });

      setResult({ status: "success", ticket });
    } catch (err: any) {
      setResult({ status: "error", message: err.message ?? "Check-in failed" });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await processQRToken(manualCode.trim());
    setManualCode("");
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => { setMode("camera"); setResult(null); }}
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors", mode === "camera" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground")}
        >
          <Camera className="h-4 w-4" /> Camera Scan
        </button>
        <button
          onClick={() => { setMode("manual"); stopCamera(); setResult(null); }}
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors", mode === "manual" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground")}
        >
          <Keyboard className="h-4 w-4" /> Manual Entry
        </button>
      </div>

      {/* Camera mode */}
      {mode === "camera" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div id="qr-reader" className={cn("w-full rounded-xl overflow-hidden bg-muted", !scanning && "hidden")} />
            {!scanning ? (
              <Button onClick={startCamera} className="w-full gap-2" size="lg">
                <QrCode className="h-5 w-5" /> Start Scanning
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="w-full gap-2">
                Stop Camera
              </Button>
            )}
            {!scanning && (
              <p className="text-xs text-center text-muted-foreground">Point the camera at the attendee's QR ticket</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="qr-code">QR Token or Ticket Code</Label>
                <Input
                  id="qr-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste QR token or enter ticket code"
                  className="font-mono"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" loading={processing}>
                <CheckCircle className="h-4 w-4" /> Check In
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className={cn(
          "border-2 overflow-hidden",
          result.status === "success" ? "border-success" : result.status === "already_used" ? "border-warning" : "border-destructive"
        )}>
          <div className={cn("py-4 px-6 text-white text-center",
            result.status === "success" ? "bg-success" : result.status === "already_used" ? "bg-warning" : "bg-destructive"
          )}>
            <div className="flex items-center justify-center gap-2 text-lg font-bold">
              {result.status === "success" ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              {result.status === "success" ? "Check-In Successful!" : result.status === "already_used" ? "Already Checked In" : "Invalid Ticket"}
            </div>
          </div>
          <CardContent className="p-6 space-y-3">
            {result.message && <p className="text-sm text-muted-foreground">{result.message}</p>}
            {result.ticket?.registrations && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{result.ticket.registrations.full_name}</span>
                  {result.ticket.registrations.prn && <span className="text-xs text-muted-foreground">PRN: {result.ticket.registrations.prn}</span>}
                </div>
                {result.ticket.events?.title && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    {result.ticket.events.title}
                  </div>
                )}
              </div>
            )}
            {(result.status === "success" || result.status === "error" || result.status === "already_used") && (
              <Button
                onClick={() => { setResult(null); if (mode === "camera") startCamera(); }}
                className="w-full"
                variant={result.status === "success" ? "outline" : "default"}
              >
                Scan Next
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
