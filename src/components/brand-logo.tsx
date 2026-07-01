import { BRAND } from "@/lib/brand";
import { Sparkles } from "lucide-react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className = "", iconOnly = false, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { icon: "h-5 w-5 p-1", text: "text-sm font-bold" },
    md: { icon: "h-7 w-7 p-1.5", text: "text-lg font-bold font-display" },
    lg: { icon: "h-9 w-9 p-2", text: "text-xl font-bold font-display" },
    xl: { icon: "h-14 w-14 p-3", text: "text-3xl font-extrabold font-display" },
  };

  const selected = sizeClasses[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div className={`flex items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow ${selected.icon}`}>
        <Sparkles className="h-full w-full" />
      </div>
      {!iconOnly && (
        <span className={`${selected.text} tracking-tight bg-gradient-to-r from-violet-600 via-primary to-fuchsia-600 bg-clip-text text-transparent`}>
          {BRAND.appName}
        </span>
      )}
    </div>
  );
}
