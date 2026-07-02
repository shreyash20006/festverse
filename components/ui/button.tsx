import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    loading?: boolean;
  }
>(({ className, variant = "default", size = "default", loading, children, disabled, ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

  const variants = {
    default: "bg-primary text-white hover:bg-primary-600 shadow-sm hover:shadow-md active:scale-95",
    secondary: "bg-secondary text-white hover:bg-secondary-600 shadow-sm hover:shadow-md active:scale-95",
    outline: "border border-border bg-white text-foreground hover:bg-muted hover:border-primary/40 active:scale-95",
    ghost: "text-foreground hover:bg-muted active:scale-95",
    destructive: "bg-destructive text-white hover:bg-red-600 shadow-sm active:scale-95",
    link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
  };

  const sizes = {
    default: "h-10 px-5 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10",
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
});
Button.displayName = "Button";

export { Button };
