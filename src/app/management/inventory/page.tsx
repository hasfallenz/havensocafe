"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { InventoryItemData, RealtimeEvent } from "@/types";
import {
  Search,
  Boxes,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  Bot,
  ExternalLink,
  RefreshCw,
  MessageSquarePlus,
  ArrowRight,
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
          <button
            type="button"
            onClick={() => {
              setInitialDrawerPrompt("");
              setIsAIDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4 text-zinc-950" />
            <span>Instruksi Hermes AI</span>
          </button>
        </div>
      </div>

      {/* AI Centralized Management Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-md border border-zinc-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-400 text-zinc-950 font-black shrink-0 mt-0.5 sm:mt-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Mode Monitoring Owner Terpusat
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Penambahan, pengeditan stok, dan penghapusan bahan baku dikelola langsung melalui percakapan dengan{" "}
              <strong className="text-amber-300">Hermes AI di Room Chat Owner</strong>. Untuk pencatatan fisik operasional harian oleh staf dapur/barista, gunakan{" "}
              <strong className="text-zinc-100">Panel Staff</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setInitialDrawerPrompt("");
              setIsAIDrawerOpen(true);
            }}
            className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black transition-all shadow-xs cursor-pointer"
          >
            Buka Chat Hermes AI
          </button>
          <Link
            href="/staff"
            className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Panel Staff</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Quick Agent Actions / Command Chips */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Perintah Cepat ke Kolom Agent:
        </span>
        <button
          type="button"
          onClick={() => {
            setInitialDrawerPrompt("tambah bahan baku baru ");
            setIsAIDrawerOpen(true);
          }}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-950 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
        >
          + Tambah Bahan Baru
        </button>
        <button
          type="button"
          onClick={() => {
            setInitialDrawerPrompt("ubah stok ");
            setIsAIDrawerOpen(true);
          }}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-950 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
        >
          ✏️ Ubah / Koreksi Stok
        </button>
        <button
          type="button"
          onClick={() => {
            setInitialDrawerPrompt("hapus bahan baku ");
            setIsAIDrawerOpen(true);
          }}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-rose-100 hover:text-rose-950 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
        >
          🗑️ Hapus Bahan
        </button>
        <button
          type="button"
          onClick={() => {
            setInitialDrawerPrompt("bahan baku apa saja yang stoknya kritis atau habis?");
            setIsAIDrawerOpen(true);
          }}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-100 hover:text-amber-950 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
        >
          🔍 Cek Bahan Menipis
        </button>
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
