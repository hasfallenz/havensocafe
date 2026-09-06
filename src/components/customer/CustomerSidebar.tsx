"use client";

import React from "react";
import Image from "next/image";
import { CategoryItem, SupportTicketData } from "@/types";
import {
  Coffee,
  CupSoda,
  Leaf,
  UtensilsCrossed,
  Croissant,
  LayoutGrid,
  Clock,
  HelpCircle,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSidebarProps {
  categories: CategoryItem[];
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  tableNumber: string;
  cartCount: number;
  onOpenCart: () => void;
  onOpenConversation?: () => void;
  onOpenOrderStatus: () => void;
  onOpenSupport: () => void;
  onOpenTableSwitch?: () => void;
  activeOrderCount?: number;
  activeSupportTicket?: SupportTicketData | null;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  tableNumber,
  cartCount,
  onOpenCart,
  onOpenOrderStatus,
  onOpenSupport,
  onOpenTableSwitch,
  activeOrderCount = 0,
  activeSupportTicket,
}) => {
  const getCategoryIcon = (rawSlug: string, isActive: boolean) => {
    const iconClass = "w-4 h-4 transition-colors shrink-0";
    const slug = (rawSlug || "").toLowerCase().trim();

    if (slug.includes("coffee") || slug.includes("kopi")) {
      return <Coffee className={cn(iconClass, isActive ? "text-amber-800" : "text-amber-700")} size={16} />;
    }
    if (slug.includes("tea") || slug.includes("teh")) {
      return <Leaf className={cn(iconClass, isActive ? "text-emerald-700" : "text-emerald-600")} size={16} />;
    }
    if (slug.includes("food") || slug.includes("makan") || slug.includes("snack") || slug.includes("meal")) {
      return <UtensilsCrossed className={cn(iconClass, isActive ? "text-rose-700" : "text-rose-600")} size={16} />;
    }
    if (slug.includes("non-coffee") || slug.includes("drink") || slug.includes("minum") || slug.includes("soda")) {
      return <CupSoda className={cn(iconClass, isActive ? "text-sky-700" : "text-sky-600")} size={16} />;
    }
    if (slug.includes("pastry") || slug.includes("bakery") || slug.includes("dessert") || slug.includes("cemilan") || slug.includes("roti")) {
      return <Croissant className={cn(iconClass, isActive ? "text-orange-700" : "text-orange-600")} size={16} />;
    }
    return <LayoutGrid className={cn(iconClass, isActive ? "text-zinc-800" : "text-zinc-600")} size={16} />;
  };

  const getCategoryBadgeBg = (rawSlug: string, isActive: boolean) => {
    if (isActive) return "bg-white shadow-2xs border border-zinc-200/80";
    const slug = (rawSlug || "").toLowerCase().trim();
    if (slug.includes("coffee") || slug.includes("kopi")) return "bg-amber-50/80 group-hover:bg-amber-100/60";
    if (slug.includes("non-coffee") || slug.includes("drink") || slug.includes("minum")) return "bg-sky-50/80 group-hover:bg-sky-100/60";
    if (slug.includes("tea") || slug.includes("teh")) return "bg-emerald-50/80 group-hover:bg-emerald-100/60";
    if (slug.includes("food") || slug.includes("makan")) return "bg-rose-50/80 group-hover:bg-rose-100/60";
    if (slug.includes("pastry") || slug.includes("bakery") || slug.includes("dessert") || slug.includes("cemilan")) return "bg-orange-50/80 group-hover:bg-orange-100/60";
    return "bg-zinc-100/80 group-hover:bg-zinc-200/60";
  };

  return (
    <>
      {/* 1. Mobile Vertical Category Rail (Visible on Mobile < md) */}
      <aside className="w-20 sm:w-24 shrink-0 bg-zinc-50/95 backdrop-blur-md border-r border-zinc-200/80 flex md:hidden flex-col justify-between select-none h-full overflow-y-auto">
        {/* Categories Rail List */}
        <div className="flex flex-col">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.slug)}
                className={cn(
                  "relative flex flex-col items-center justify-center py-3 px-1.5 transition-all text-center border-b border-zinc-200/40 cursor-pointer",
                  isActive
                    ? "bg-white text-zinc-950 font-black shadow-xs border-l-4 border-l-amber-600"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70 font-semibold"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center mb-1 transition-colors",
                    isActive ? "bg-amber-100/80" : "bg-transparent"
                  )}
                >
                  {getCategoryIcon(cat.slug, isActive)}
                </div>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-tight leading-tight px-1 break-words line-clamp-2">
                  {cat.name}
                </span>
                {cat.itemCount !== undefined && cat.itemCount > 0 && (
                  <span
                    className={cn(
                      "mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold",
                      isActive ? "bg-amber-500 text-zinc-950" : "text-zinc-400 bg-zinc-200/60"
                    )}
                  >
                    {cat.itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Bottom Quick Actions (Call Staff & Active Order shortcut) */}
        <div className="p-2 border-t border-zinc-200/70 flex flex-col gap-1.5 pb-20">
          {activeOrderCount > 0 && (
            <button
              type="button"
              onClick={onOpenOrderStatus}
              className="w-full py-2 px-1 rounded-xl bg-amber-500 text-zinc-950 flex flex-col items-center justify-center shadow-xs cursor-pointer"
              title="Cek Status Pesanan"
            >
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[9px] font-black uppercase mt-0.5">Status</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSupport}
            className={cn(
              "w-full py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-colors cursor-pointer",
              activeSupportTicket && activeSupportTicket.status !== "RESOLVED"
                ? activeSupportTicket.status === "IN_PROGRESS"
                  ? "bg-emerald-600 text-white border-emerald-700 animate-pulse shadow-sm"
                  : "bg-rose-500 text-white border-rose-600 animate-pulse"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-rose-50 hover:text-rose-700 shadow-2xs"
            )}
            title={activeSupportTicket?.status === "IN_PROGRESS" ? "Staff sedang menuju meja Anda" : "Panggil Pelayan / Staff"}
          >
            {activeSupportTicket && activeSupportTicket.status === "IN_PROGRESS" ? (
              <span className="text-xs leading-none">🏃‍♂️</span>
            ) : (
              <HelpCircle className="w-3.5 h-3.5" />
            )}
            <span className="text-[9px] font-black uppercase mt-0.5">
              {activeSupportTicket && activeSupportTicket.status === "IN_PROGRESS" ? "Staff OTW" : "Staff"}
            </span>
          </button>
        </div>
      </aside>

      {/* 2. Desktop & iPad / Tablet Full Sidebar (Visible on Tablet & Laptop >= md) */}
      <aside className="w-60 lg:w-72 xl:w-80 shrink-0 h-screen sticky top-0 bg-white/90 backdrop-blur-2xl border-r border-zinc-200/70 hidden md:flex flex-col justify-between select-none shadow-sm z-30">
        {/* Upper Area: Header, Menu Section, Category Nav */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 pb-2">
          {/* Top Brand Header: Havenso Logo Image + Table Badge */}
          <div className="flex items-center justify-between gap-2 lg:gap-3 pb-4 lg:pb-5 border-b border-zinc-100 mb-4 lg:mb-6">
            <div className="flex items-center">
              <Image
                src="/logohavenso.png"
                alt="Havenso Cafe"
                width={220}
                height={70}
                priority
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>

            {/* Table Number Pill (Clickable to switch table A1-A10) */}
            <button
              type="button"
              onClick={onOpenTableSwitch}
              className="shrink-0 px-3.5 py-2 rounded-2xl bg-zinc-50 hover:bg-sky-50 border border-zinc-200/80 hover:border-sky-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all group"
              title="Klik untuk ganti nomor meja (A1 - A10)"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-zinc-800 group-hover:text-sky-950 tracking-tight">
                Meja {tableNumber}
              </span>
            </button>
          </div>

          {/* Clean Section Title Label: "Menu" */}
          <div className="px-2 py-1 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Menu
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">
              {categories.length} Kategori
            </span>
          </div>

          {/* Clean & Professional Menu Categories Nav */}
          <nav className="flex flex-col gap-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.slug)}
                  className={cn(
                    "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 cursor-pointer text-left",
                    isActive
                      ? "bg-amber-500/15 text-amber-950 font-bold shadow-2xs border border-amber-300/80"
                      : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                        getCategoryBadgeBg(cat.slug, isActive)
                      )}
                    >
                      {getCategoryIcon(cat.slug, isActive)}
                    </div>
                    <span className="text-[13.5px] leading-tight font-semibold">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cat.itemCount !== undefined && (
                      <span
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors",
                          isActive
                            ? "bg-amber-500 text-zinc-950 font-black"
                            : "text-zinc-400 group-hover:text-zinc-600 bg-zinc-100"
                        )}
                      >
                        {cat.itemCount}
                      </span>
                    )}
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-150",
                        isActive
                          ? "text-amber-700 translate-x-0.5"
                          : "text-zinc-300 group-hover:text-zinc-400"
                      )}
                    />
                  </div>
                </button>
              );
            })}

            {/* Secondary Section: Aksi & Bantuan */}
            <div className="pt-5 mt-3 border-t border-zinc-100 flex flex-col gap-1">
              <span className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Aksi & Bantuan
              </span>

              {/* Order Status */}
              {activeOrderCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenOrderStatus}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-amber-900 bg-amber-50/70 hover:bg-amber-100/60 border border-amber-200/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-2xs">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <span className="text-[13.5px] font-bold">Status Pesanan</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono text-[11px] font-bold">
                    {activeOrderCount}
                  </span>
                </button>
              )}

              {/* Call Staff Button */}
              <button
                type="button"
                onClick={onOpenSupport}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-zinc-700 hover:bg-rose-50/70 hover:text-rose-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-zinc-100/70 group-hover:bg-white flex items-center justify-center text-zinc-500 group-hover:text-rose-600 transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[13.5px]">Panggil Staff</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              {/* Live Assistance Status Widget */}
              {activeSupportTicket && (
                <div className="mt-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {activeSupportTicket.status === "WAITING" && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-300/70 flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <span className="text-xs font-black text-amber-950">
                            Panggilan Terkirim
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Menunggu
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 leading-snug font-medium">
                        Mohon tunggu sebentar, staff kami sedang merespons panggilan.
                      </p>
                    </div>
                  )}

                  {activeSupportTicket.status === "IN_PROGRESS" && (
                    <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/80 flex flex-col gap-1.5 shadow-xs animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                          <span className="text-xs font-black text-emerald-950">
                            Staff Segera ke Sana!
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Menuju Meja
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900 leading-snug font-bold">
                        Staff sedang berjalan menuju Meja {tableNumber}.
                      </p>
                    </div>
                  )}

                  {activeSupportTicket.status === "RESOLVED" && (
                    <div className="p-3 rounded-2xl bg-zinc-100/90 border border-zinc-200/80 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-xs font-black text-zinc-900 block leading-tight">
                            Selesai Dilayani
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            Staff telah membantu meja Anda.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom Footer Area */}
        <div className="p-6 pt-3 border-t border-zinc-100 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-zinc-400">
            2026 © Havenso Cafe. All rights reserved
          </p>
        </div>
      </aside>
    </>
  );
};
