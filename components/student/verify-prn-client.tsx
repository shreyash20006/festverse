"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export function VerifyPRNClient() {
  const [prn, setPrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      // Check if already verified
      supabase.from("profiles").select("prn, verified").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.verified && data?.prn) router.push("/dashboard");
        });
    });
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanPRN = prn.trim().toUpperCase();
      if (!cleanPRN || cleanPRN.length < 8) {
        setError("Please enter a valid PRN.");
        setLoading(false);
        return;
      }

      // Check student whitelist
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .select("id, full_name, prn, department, year_of_study")
        .eq("prn", cleanPRN)
        .eq("is_active", true)
        .maybeSingle();

      if (studentErr) throw studentErr;

      if (!student) {
        setError("PRN not found in the official student database. Please contact administration.");
        setLoading(false);
        return;
      }

      // Check PRN not already linked to another account
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("prn", cleanPRN)
        .neq("id", user.id)
        .maybeSingle();

      if (existingProfile) {
        setError("This PRN is already linked to another account.");
        setLoading(false);
        return;
      }

      // Update profile
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          prn: cleanPRN,
          verified: true,
          full_name: student.full_name,
          department: student.department,
          year_of_study: student.year_of_study,
        })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      toast({ title: "Identity verified!", description: `Welcome, ${student.full_name}!` });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-purple-50/30 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="rounded-3xl p-2">
          <CardHeader className="text-center pb-2">
            <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-2xl font-bold">
                <span className="gradient-brand-text">Fest</span>
                <span className="text-foreground">Verse</span>
              </span>
            </Link>
            <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-7 w-7 text-secondary" />
            </div>
            <CardTitle className="text-xl">Verify Student Identity</CardTitle>
            <CardDescription>
              Enter your PRN to verify you're a TGPCOP student. This is a one-time process.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prn">Your PRN Number</Label>
                <Input
                  id="prn"
                  value={prn}
                  onChange={(e) => setPrn(e.target.value.toUpperCase())}
                  placeholder="e.g. 2404673113823002"
                  className="text-center font-mono text-lg tracking-widest h-12"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/8 border border-destructive/20 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full gap-2" size="lg" loading={loading}>
                <CheckCircle className="h-4 w-4" /> Verify & Continue
              </Button>
            </form>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              Your PRN is checked against the official TGPCOP database and cannot be linked to more than one account.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
