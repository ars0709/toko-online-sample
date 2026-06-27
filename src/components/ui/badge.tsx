import * as React from "react";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary: "bg-[var(--muted)] text-[var(--foreground)]",
  outline: "border border-[var(--border)] text-[var(--foreground)]",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-white",
  destructive: "bg-[var(--destructive)] text-white",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
