"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { InventoryItemData, RealtimeEvent } from "@/types";
import {
  Search,
  Boxes,
  Coffee,
  UtensilsCrossed,
  RefreshCw,
} from "lucide-react";
import { OwnerAIDrawer } from "@/components/owner/OwnerAIDrawer";

function getCategory(name: string): "MINUMAN" | "MAKANAN" {
  const n = name.toLowerCase();
  if (
    n.includes("kopi") ||
    n.includes("espresso") ||
    n.includes("susu") ||
    n.includes("milk") ||
    n.includes("sirup") ||
    n.includes("syrup") ||
    n.includes("butterscotch") ||
    n.includes("hazelnut") ||
    n.includes("karamel") ||
    n.includes("caramel") ||
    n.includes("vanilla") ||
    n.includes("matcha") ||
    n.includes("teh") ||
    n.includes("tea") ||
    n.includes("leci") ||
    n.includes("lemon") ||
    n.includes("cokelat") ||
    n.includes("chocolate") ||
    n.includes("choco") ||
    n.includes("red velvet") ||
    n.includes("taro") ||
    n.includes("avocado") ||
    n.includes("almond") ||
    n.includes("gula cair") ||
    n.includes("simple syrup")
  ) {
    return "MINUMAN";
  }
  return "MAKANAN";
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "MINUMAN" | "MAKANAN">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [initialDrawerPrompt, setInitialDrawerPrompt] = useState("");

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/inventory");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();

    // Listen to live inventory events from Staff & AI
    const eventSource = new EventSource("/api/realtime");
    eventSource.onmessage = (event) => {
      try {
        const parsed: RealtimeEvent = JSON.parse(event.data);
        if (
          parsed.type === "INVENTORY_CHANGED" ||
          parsed.type === "STOCK_REPORT_SUBMITTED"
        ) {
          loadInventory();
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Filter items
  const drinkCount = useMemo(
    () => items.filter((i) => getCategory(i.name) === "MINUMAN").length,
    [items]
  );
  const foodCount = useMemo(
    () => items.filter((i) => getCategory(i.name) === "MAKANAN").length,
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "AVAILABLE" && item.stock > 5) ||
        (statusFilter === "LOW_STOCK" && item.stock > 0 && item.stock <= 5) ||
        (statusFilter === "OUT_OF_STOCK" && item.stock <= 0);
      const matchesCategory =
        categoryFilter === "ALL" || getCategory(item.name) === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, categoryFilter]);

  // Summary counts
  const availableCount = items.filter((i) => i.stock > 5).length;
  const lowStockCount = items.filter((i) => i.stock > 0 && i.stock <= 5).length;
  const outOfStockCount = items.filter((i) => i.stock <= 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-zinc-700" />
            <span>Stok Inventori (Bahan Baku)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitoring ketersediaan bahan makanan dan racikan minuman Havenso Cafe
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadInventory}
            disabled={isLoading}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer border border-zinc-200"
            title="Refresh data stok"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <span className="text-[11px] font-bold block opacity-70">Total Bahan</span>
          <span className="text-xl font-black mt-0.5 block">{items.length} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "AVAILABLE"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-emerald-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-emerald-600">Stok Aman</span>
          <span className="text-xl font-black mt-0.5 block">{availableCount} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("LOW_STOCK")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "LOW_STOCK"
              ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-amber-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-amber-600">Stok Menipis</span>
          <span className="text-xl font-black mt-0.5 block">{lowStockCount} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("OUT_OF_STOCK")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "OUT_OF_STOCK"
              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-rose-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-rose-600">Stok Habis</span>
          <span className="text-xl font-black mt-0.5 block">{outOfStockCount} Item</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === "ALL"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Semua ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("MINUMAN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === "MINUMAN"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-amber-50/50"
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Minuman & Bar ({drinkCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("MAKANAN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === "MAKANAN"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-orange-50/50"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Makanan & Dapur ({foodCount})</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama bahan baku..."
            className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Clean Inventory Table (Read-Only for Owner Monitoring) */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nama Bahan</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Stok</th>
                <th className="py-3.5 px-4">Satuan</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Tidak ada bahan baku yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isAvailable = item.stock > 5;
                  const isLow = item.stock > 0 && item.stock <= 5;
                  const isDrink = getCategory(item.name) === "MINUMAN";

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* 1. Nama Bahan */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {item.name}
                      </td>

                      {/* 2. Kategori */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDrink
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-orange-50 text-orange-800 border-orange-200"
                          }`}
                        >
                          {isDrink ? (
                            <Coffee className="w-3 h-3 text-amber-600" />
                          ) : (
                            <UtensilsCrossed className="w-3 h-3 text-orange-600" />
                          )}
                          <span>{isDrink ? "Minuman & Bar" : "Makanan & Dapur"}</span>
                        </span>
                      </td>

                      {/* 3. Stok */}
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-zinc-900">
                        {item.stock}
                      </td>

                      {/* 4. Satuan */}
                      <td className="py-3.5 px-4 font-semibold text-zinc-600">
                        {item.unit}
                      </td>

                      {/* 5. Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isLow
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable
                                ? "bg-emerald-500"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {isAvailable ? "Tersedia" : isLow ? "Menipis" : "Habis"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Hermes AI Action Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => {
          setInitialDrawerPrompt("");
          setIsAIDrawerOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group flex items-center justify-center"
        title="Buka Kolom Agent Hermes AI"
      >
        <div className="w-full h-full rounded-[14px] bg-[#0c1017] overflow-hidden flex items-center justify-center p-1">
          <Image
            src="/logoagent.png"
            alt="Hermes AI"
            width={44}
            height={44}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      </button>

      {/* Embedded Hermes AI Owner Drawer */}
      <OwnerAIDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => {
          setIsAIDrawerOpen(false);
          loadInventory();
        }}
        initialPrompt={initialDrawerPrompt}
      />
    </div>
  );
}
