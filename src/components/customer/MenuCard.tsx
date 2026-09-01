"use client";

import React from "react";
import Image from "next/image";
import { MenuItemData } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Check, Clock, Sparkles } from "lucide-react";

interface MenuCardProps {
  item: MenuItemData;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  const isAvailable = item.isAvailable && (item.stock === undefined || item.stock > 0);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-3xl p-4 transition-all duration-300",
        "glass-card hover:bg-white/90 hover:shadow-xl hover:shadow-sky-900/10 hover:-translate-y-1"
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
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
            <h3 className="font-bold text-base text-zinc-900 leading-snug group-hover:text-sky-900 transition-colors">
              {item.name}
            </h3>
            <span className="font-extrabold text-sm text-sky-700 whitespace-nowrap">
              {formatCurrency(item.price)}
            </span>
          </div>

          <p className="mt-1 text-xs text-zinc-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
};
