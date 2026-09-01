import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "pastel"
    | "glass"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] shadow-xs",
      secondary:
        "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-[0.98]",
      outline:
        "border border-zinc-300 text-zinc-800 hover:bg-zinc-50 active:scale-[0.98]",
      ghost: "text-zinc-700 hover:bg-zinc-100/70 hover:text-zinc-900",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-xs",
      pastel:
        "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 hover:opacity-95 active:scale-[0.98]",
      glass:
        "bg-white/70 backdrop-blur-md border border-white/80 text-zinc-800 shadow-sm hover:bg-white/90 active:scale-[0.98]",
      link: "text-sky-600 underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs font-medium rounded-lg",
      md: "h-10 px-4 text-sm font-semibold rounded-xl",
      lg: "h-12 px-6 text-base font-semibold rounded-2xl",
      icon: "h-9 w-9 p-0 rounded-xl flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Memproses...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
