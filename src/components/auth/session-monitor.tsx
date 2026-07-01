import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, ShieldAlert } from "lucide-react";

// 15 minutes of inactivity triggers idle warning
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
// Check session expiry every 30 seconds
const CHECK_INTERVAL_MS = 30 * 1000;
// Warning shows up when token has less than 5 minutes remaining
const EXPIRY_WARNING_LIMIT_MS = 5 * 60 * 1000;

export function SessionMonitor() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [reason, setReason] = useState<"idle" | "expiry">("idle");
  const lastActiveRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update activity timestamp on user interactions
  useEffect(() => {
    if (!session) return;

    const handleActivity = () => {
      lastActiveRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [session]);

  // Activity & session expiration checks
  useEffect(() => {
    if (!session) {
      setShowWarning(false);
      return;
    }

    const checkSession = async () => {
      const now = Date.now();

      // 1. Idle Check
      const timeSinceLastActive = now - lastActiveRef.current;
      if (timeSinceLastActive >= IDLE_TIMEOUT_MS && !showWarning) {
        setReason("idle");
        setShowWarning(true);
        return;
      }

      // 2. Token Expiry Check
      if (session.expires_at) {
        const expiresAtMs = session.expires_at * 1000;
        const timeRemaining = expiresAtMs - now;

        if (timeRemaining <= 0) {
          // Token expired, log out
          setShowWarning(false);
          await supabase.auth.signOut();
          toast.error("Your session has expired. Please sign in again.");
          navigate({ to: "/auth" });
        } else if (timeRemaining <= EXPIRY_WARNING_LIMIT_MS && !showWarning) {
          setReason("expiry");
          setShowWarning(true);
        }
      }
    };

    // Run initial check and set interval
    checkSession();
    checkTimerRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);

    return () => {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
    };
  }, [session, showWarning, navigate]);

  const handleExtendSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      // Reset activity tracker
      lastActiveRef.current = Date.now();
      setShowWarning(false);
      toast.success("Session extended successfully.");
    } catch (err: any) {
      toast.error("Failed to extend session: " + err.message);
      handleLogout();
    }
  };

  const handleLogout = async () => {
    setShowWarning(false);
    await supabase.auth.signOut();
    toast.info("You have been signed out.");
    navigate({ to: "/auth" });
  };

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md max-w-sm shadow-elevated">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {reason === "idle" ? "Session Idle Warning" : "Session Expiring"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {reason === "idle"
              ? "You have been inactive for a while. For your security, you will be signed out shortly."
              : "Your login session is about to expire. Click below to keep staying signed in."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full rounded-full h-10 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
          >
            Sign Out
          </Button>
          <Button
            onClick={handleExtendSession}
            className="w-full rounded-full bg-gradient-brand text-white h-10 text-xs font-semibold cursor-pointer shadow-glow hover:opacity-90"
          >
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
