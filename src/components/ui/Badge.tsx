import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline" | "pastel";
  size?: "sm" | "md" | "lg";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}) => {
  const variantStyles = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
    outline: "border border-zinc-300 text-zinc-700",
    pastel: "bg-white/80 backdrop-blur-md text-sky-800 border border-sky-200/60 shadow-xs",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium rounded-full",
    md: "px-2.5 py-0.5 text-xs font-semibold rounded-full",
    lg: "px-3 py-1 text-sm font-semibold rounded-full",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
