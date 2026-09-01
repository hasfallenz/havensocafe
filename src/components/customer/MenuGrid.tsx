"use client";

import React from "react";
import { MenuItemData } from "@/types";
import { MenuCard } from "./MenuCard";
import { Skeleton } from "../ui/Skeleton";
import { Search, X } from "lucide-react";

interface MenuGridProps {
  categoryName: string;
  categorySlug: string;
  items: MenuItemData[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categoryName,
  categorySlug,
  items,
  isLoading,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Left-Aligned Search Bar */}
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

      {/* Grid Content */}
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
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
