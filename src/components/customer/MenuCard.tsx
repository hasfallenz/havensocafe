"use client";

import React from "react";
import Image from "next/image";
import { MenuItemData } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

interface MenuCardProps {
  item: MenuItemData;
  onSelectItem?: (item: MenuItemData) => void;
  cartQuantity?: number;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  cartQuantity = 0,
}) => {
  const isAvailable = item.isAvailable && (item.stock === undefined || item.stock > 0);

  return (
    <>
      {/* 1. Mobile Compact Horizontal Row (Non-clickable catalog display) */}
      <div
        className={cn(
          "group relative md:hidden flex items-center justify-between gap-3 p-2.5 sm:p-3 transition-all duration-150 border-b border-zinc-100 last:border-b-0 select-none bg-white",
          !isAvailable && "opacity-60 bg-zinc-50/40"
        )}
      >
        {/* Left: Compact Square Rounded Thumbnail (~64x64 on mobile) */}
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200/60 shadow-2xs">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="72px"
            className={cn(
              "object-cover transition-transform duration-300",
              !isAvailable && "grayscale"
            )}
          />

          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
              <span className="text-[9px] font-black uppercase text-white tracking-tighter">
                Habis
              </span>
            </div>
          )}
        </div>

        {/* Center: Details (Name, brief description, price) */}
        <div className="flex-1 min-w-0 pr-1.5 flex flex-col justify-center">
          <h3 className="font-bold text-[13.5px] sm:text-[14.5px] text-zinc-900 leading-snug line-clamp-2">
            {item.name}
          </h3>

          {item.description && (
            <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-500 line-clamp-1 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="mt-1 flex items-center justify-between">
            <span className="font-extrabold text-xs sm:text-sm text-zinc-900 tracking-tight">
              {formatCurrency(item.price)}
            </span>
            {cartQuantity > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950">
                {cartQuantity}x di Pesanan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Desktop Glass Card (Non-clickable showcase, orders via AI chat) */}
      <div
        className={cn(
          "group relative flex-col justify-between rounded-3xl p-3.5 lg:p-4 transition-all duration-300",
          "glass-card hover:bg-white/90 shadow-sm",
          "hidden md:flex"
        )}
      >
        <div>
          {/* Image Container (Ratio 1:1) */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-xs">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-102"
            />

            {!isAvailable && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-md">
                  Habis / Unavailable
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="mt-3.5 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base text-zinc-900 leading-snug">
                {item.name}
              </h3>
              <span className="font-extrabold text-sm text-amber-700 whitespace-nowrap">
                {formatCurrency(item.price)}
              </span>
            </div>

            <p className="mt-1 text-xs text-zinc-600 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
