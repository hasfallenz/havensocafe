"use client";

import React, { useState } from "react";
import { MenuItemData } from "@/types";
import { MenuCard } from "./MenuCard";
import { Skeleton } from "../ui/Skeleton";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuGridProps {
  categoryName: string;
  categorySlug: string;
  items: MenuItemData[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectItem?: (item: MenuItemData) => void;
  cartItemMap?: Record<string, number>;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categoryName,
  categorySlug,
  items,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectItem,
  cartItemMap = {},
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP & TABLET VIEW (Visible on Tablet & Laptop >= md) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 flex-col gap-6">
        {/* Original Left-Aligned Desktop Search Bar */}
        <div className="flex items-center justify-start">
          <div className="relative w-full sm:w-80 md:w-96">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4 text-zinc-500 stroke-[2.5]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari menu / rasa favorit..."
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-zinc-200/80 text-sm font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:border-sky-400 focus:bg-white transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Grid Content (Original 3-Column Glass Cards) */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="glass-card rounded-3xl p-4 flex flex-col gap-3">
                <Skeleton className="w-full aspect-square rounded-2xl" />
                <Skeleton className="w-3/4 h-5 rounded-lg mt-1" />
                <Skeleton className="w-full h-3 rounded-lg" />
                <Skeleton className="w-1/2 h-3 rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-sky-100/60 flex items-center justify-center text-sky-600 text-xl font-bold">
              ☕
            </div>
            <h3 className="font-bold text-lg text-zinc-800">
              Belum ada menu di kategori ini
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              {searchQuery
                ? `Tidak ditemukan menu yang sesuai dengan pencarian "${searchQuery}". Coba kata kunci lain.`
                : "Menu untuk kategori ini sedang disiapkan oleh barista kami."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onSelectItem={onSelectItem}
                cartQuantity={cartItemMap[item.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE VIEW (Visible on Mobile / Android < md) */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-1 flex-col">
        {/* Mobile Header: Clean Search Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-3 py-2 border-b border-zinc-100 flex items-center">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari menu / rasa favorit..."
              className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-zinc-100 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-amber-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Items List: Compact Horizontal Rows */}
        <div className="flex-1 p-2">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-zinc-100 divide-y divide-zinc-100 overflow-hidden shadow-2xs">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="w-3/5 h-4 rounded-md" />
                    <Skeleton className="w-4/5 h-3 rounded-md" />
                    <Skeleton className="w-1/4 h-3.5 rounded-md" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center flex flex-col items-center justify-center gap-2 mt-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 text-xl font-bold">
                ☕
              </div>
              <h3 className="font-bold text-sm text-zinc-900">
                Belum ada menu di kategori ini
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs">
                {searchQuery
                  ? `Tidak ditemukan menu yang sesuai dengan kata "${searchQuery}".`
                  : "Menu sedang disiapkan oleh barista kami."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-2xs divide-y divide-zinc-100 overflow-hidden">
              {items.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onSelectItem={onSelectItem}
                  cartQuantity={cartItemMap[item.id] || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
