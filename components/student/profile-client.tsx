"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, BookOpen, GraduationCap, CheckCircle, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  department: z.string().optional(),
  year_of_study: z.coerce.number().int().min(1).max(6).optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Props {
  profile: Partial<Profile> | null;
  userEmail: string;
}

const YEAR_LABELS: Record<number, string> = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year", 5: "5th Year", 6: "6th Year" };

export function ProfileClient({ profile, userEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      department: profile?.department ?? "",
      year_of_study: profile?.year_of_study ?? null,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: data.full_name, phone: data.phone || null, department: data.department || null, year_of_study: data.year_of_study || null })
        .eq("id", profile?.id ?? "");
      if (error) throw error;
      toast({ title: "Profile updated!" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>

      {/* Avatar + identity */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{profile?.full_name ?? "—"}</h2>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                {profile?.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success text-xs font-semibold px-2.5 py-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Verified Student
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1">
                    <Shield className="h-3.5 w-3.5" /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile?.prn && (
            <div className="mt-5 pt-5 border-t border-border grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>PRN: <span className="font-mono font-semibold text-foreground">{profile.prn}</span></span>
              </div>
              {profile.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>{profile.department}</span>
                </div>
              )}
              {profile.year_of_study && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 text-primary" />
                  <span>{YEAR_LABELS[profile.year_of_study] ?? `Year ${profile.year_of_study}`}</span>
                </div>
              )}
              {profile.created_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Member since {formatDate(profile.created_at)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...register("full_name")} placeholder="Your full name" />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register("phone")} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register("department")} placeholder="e.g. B.Pharm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year_of_study">Year of Study</Label>
              <select
                id="year_of_study"
                {...register("year_of_study")}
                className="flex h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={y}>{YEAR_LABELS[y]}</option>
                ))}
              </select>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-4">
                PRN and email cannot be changed. Contact admin for PRN updates.
              </p>
              <Button type="submit" loading={loading}>Save Profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
