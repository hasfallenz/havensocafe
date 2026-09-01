import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-3xl bg-white border border-zinc-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2.5 rounded-2xl bg-zinc-100 text-zinc-800">
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl font-black text-zinc-900 tracking-tight block">
          {value}
        </span>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={
              trendUp !== false ? "text-emerald-600" : "text-rose-600"
            }
          >
            {trend}
          </span>
          <span className="text-zinc-600 font-normal">vs kemarin</span>
        </div>
      )}
    </div>
  );
};
