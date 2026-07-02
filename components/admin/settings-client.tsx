"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Settings, School, CreditCard, Save, Globe } from "lucide-react";
import type { College } from "@/types/database";

const collegeSchema = z.object({
  name: z.string().min(3, "Name is required"),
  short_name: z.string().optional(),
  tagline: z.string().optional(),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  primary_color: z.string().optional(),
});

type CollegeFormData = z.infer<typeof collegeSchema>;

interface Props {
  college: College | null;
}

export function AdminSettingsClient({ college }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<CollegeFormData>({
    resolver: zodResolver(collegeSchema),
    defaultValues: {
      name: college?.name ?? "",
      short_name: college?.short_name ?? "",
      tagline: college?.tagline ?? "",
      contact_email: college?.contact_email ?? "",
      contact_phone: college?.contact_phone ?? "",
      address: college?.address ?? "",
      primary_color: college?.primary_color ?? "#FF6B35",
    },
  });

  const onSubmit = async (data: CollegeFormData) => {
    if (!college) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("colleges")
        .update({
          name: data.name,
          short_name: data.short_name || null,
          tagline: data.tagline || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          address: data.address || null,
          primary_color: data.primary_color || null,
        })
        .eq("id", college.id);
      if (error) throw error;
      toast({ title: "Settings saved!" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage college branding and platform configuration.</p>
      </div>

      {/* College Branding */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4 text-primary" /> College Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">College Name *</Label>
                <Input id="name" {...register("name")} placeholder="Tulsiramji Gaikwad-Patil College of Pharmacy" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="short_name">Short Name</Label>
                <Input id="short_name" {...register("short_name")} placeholder="TGPCOP" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="primary_color">Brand Color</Label>
                <div className="flex gap-2 items-center">
                  <Input id="primary_color" type="color" {...register("primary_color")} className="h-10 w-12 p-1 cursor-pointer" />
                  <Input {...register("primary_color")} placeholder="#FF6B35" className="flex-1 font-mono" />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" {...register("tagline")} placeholder="Excellence in Pharmacy Education" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" type="email" {...register("contact_email")} placeholder="info@tgpcop.ac.in" />
                {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input id="contact_phone" {...register("contact_phone")} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register("address")} rows={2} placeholder="College address" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading} className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Razorpay Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Payment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Razorpay credentials are configured via environment variables. To update them, modify your{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">.env.local</code> file.
          </p>
          <div className="space-y-3">
            {[
              { key: "RAZORPAY_KEY_ID", label: "Key ID (public)", hint: "Used on the frontend checkout" },
              { key: "RAZORPAY_KEY_SECRET", label: "Key Secret (private)", hint: "Used only on the server to verify signatures" },
              { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", label: "Public Key ID (frontend)", hint: "Must be prefixed with NEXT_PUBLIC_" },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground font-mono">{key}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <span className="text-xs bg-muted rounded-lg px-2 py-1 font-mono text-muted-foreground">env var</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Platform Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-semibold text-foreground">FestVerse V1</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Framework</span>
              <span className="font-semibold text-foreground">Next.js 15 App Router</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Database</span>
              <span className="font-semibold text-foreground">Supabase (PostgreSQL)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Payments</span>
              <span className="font-semibold text-foreground">Razorpay</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
