"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Coffee,
  Boxes,
  QrCode,
  BarChart3,
  Settings,
  ChefHat,
  HeadphonesIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ManagementSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard Owner",
      href: "/owner",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Riwayat Pesanan",
      href: "/management/orders",
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      label: "Katalog Menu & Kategori",
      href: "/management/menu",
      icon: <Coffee className="w-4 h-4" />,
    },
    {
      label: "Stok Inventori",
      href: "/management/inventory",
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      label: "Manajemen Meja & QR",
      href: "/management/tables",
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      label: "Analitik & Penjualan",
      href: "/management/analytics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: "Pengaturan Cafe & AI",
      href: "/management/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-72 bg-[#090b0e] border-r border-zinc-850/80 text-zinc-100 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none shadow-2xl">
      
      {/* Upper Section: Brand + Menu Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-6 pb-2">
        
        {/* Bespoke Management Brand Header */}
        <div className="pb-5 mb-4 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 font-black text-xl shadow-lg shadow-amber-500/20">
              H
            </div>
            <div>
              <span className="font-black text-sm text-white tracking-wider block">
                HAVENSO
              </span>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase block mt-0.5">
                Business & Operations
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/management" || item.href === "/owner"
                ? pathname === item.href || (item.href === "/owner" && pathname === "/management")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent text-white border border-amber-500/30 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border border-transparent"
                )}
              >
                {/* Active Glowing Bar Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-amber-400 shadow-sm shadow-amber-400" />
                )}

                <div className="flex items-center gap-3 pl-1">
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-colors",
                      isActive
                        ? "text-amber-400 bg-amber-400/10"
                        : "text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-800"
                    )}
                  >
                    {item.icon}
                  </div>
                  <span className="tracking-tight text-[13px]">{item.label}</span>
                </div>

                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isActive
                      ? "text-amber-400 translate-x-0.5"
                      : "text-zinc-600 group-hover:text-zinc-400"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Area */}
      <div className="p-4 bg-[#0e1116] border-t border-zinc-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-zinc-400">Owner System Active</span>
        </div>
      </div>
    </aside>
  );
};


