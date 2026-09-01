"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OrderData, InventoryItemData } from "@/types";
import { formatCurrency, formatDate, formatTimeAgo } from "@/lib/utils";
import {
  Crown,
  DollarSign,
  ShoppingBag,
  ChefHat,
  Coffee,
  Boxes,
  QrCode,
  BarChart3,
  Settings,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { OwnerAICommandBar } from "@/components/owner/OwnerAICommandBar";

const defaultData = {
  stats: {
    todayRevenue: 0,
    todayOrdersCount: 0,
    activeKitchenCount: 0,
    pendingSupportCount: 0,
    menuCount: 20,
  },
  recentOrders: [],
  lowStockItems: [],
  recentLogs: [],
};

export default function DedicatedOwnerPage() {

  const [data, setData] = useState<{
    stats: {
      todayRevenue: number;
      todayOrdersCount: number;
      activeKitchenCount: number;
      pendingSupportCount: number;
      menuCount: number;
    };
    recentOrders: OrderData[];
    lowStockItems: InventoryItemData[];
    recentLogs: any[];
  }>(defaultData);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 100% Realtime SSE Push Stream
    const eventSource = new EventSource("/api/realtime");
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (
          parsed.type === "ORDER_CREATED" ||
          parsed.type === "PAYMENT_CONFIRMED" ||
          parsed.type === "ORDER_STATUS_CHANGED" ||
          parsed.type === "INVENTORY_CHANGED" ||
          parsed.type === "SUPPORT_TICKET_CREATED" ||
          parsed.type === "SUPPORT_TICKET_RESOLVED" ||
          parsed.type === "MENU_UPDATED"
        ) {
          loadData();
        }
      } catch (e) {}
    };

    // Auto live heartbeat sync (every 5 seconds)
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#07090d] flex flex-col items-center justify-center text-zinc-300 font-sans gap-3">
        <div className="w-10 h-10 rounded-2xl border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
        <span className="text-xs font-semibold text-zinc-400 tracking-wider">
          Menghubungkan ke Live Realtime Hub...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-100 flex flex-col font-sans relative overflow-hidden selection:bg-amber-400 selection:text-zinc-950">
      {/* Dynamic Ambient Glow Orbs for Glassmorphism Depth */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Glass Effect */}
      <header className="bg-[#0b0e14]/70 border-b border-white/[0.08] px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-black flex items-center justify-center text-lg shadow-lg shadow-amber-500/20">
            <Crown className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">
                DASHBOARD OWNER
              </h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Havenso Cafe • Realtime Financial Analytics & Operations
            </p>
          </div>
        </div>
      </header>

      {/* Main Glass Content Container */}
      <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-8 relative z-10">
        
        {/* Google/Gemini-Style Executive AI Voice & Text Command Bar */}
        <section className="w-full">
          <OwnerAICommandBar />
        </section>

        {/* KPI Financial & Operations Overview — 3-Column Ultra Clean Glass Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Today Revenue */}
          <div className="relative rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100" />
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Omset Hari Ini
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <span className="text-2xl md:text-3xl font-black text-white tracking-tight block drop-shadow-sm">
                {formatCurrency(data.stats.todayRevenue)}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{data.stats.todayOrdersCount} transaksi berhasil</span>
              </div>
            </div>
          </div>

          {/* Card 2: Kitchen & Waiter */}
          <div className="relative rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-amber-500/30 transition-all duration-300 group overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100" />
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Aktivitas Dapur
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-inner">
                <ChefHat className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <span className="text-2xl md:text-3xl font-black text-white tracking-tight block drop-shadow-sm">
                {data.stats.activeKitchenCount}{" "}
                <span className="text-sm font-bold text-zinc-400">Pesanan</span>
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{data.stats.pendingSupportCount} bantuan meja aktif</span>
              </div>
            </div>
          </div>

          {/* Card 3: Catalog & Menu */}
          <div className="relative rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-purple-500/30 transition-all duration-300 group overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100" />
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Katalog Menu
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-inner">
                <Coffee className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-5">
              <span className="text-2xl md:text-3xl font-black text-white tracking-tight block drop-shadow-sm">
                {data.stats.menuCount}{" "}
                <span className="text-sm font-bold text-zinc-400">Item</span>
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span>4 Kategori Menu Aktif</span>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Access Operational Glass Grid */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Akses Cepat Modul Manajemen
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Link
              href="/management/menu"
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] hover:border-purple-400/40 transition-all duration-300 flex flex-col items-center text-center gap-2.5 group shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  Kelola Menu
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Katalog & Harga
                </span>
              </div>
            </Link>

            <Link
              href="/management/inventory"
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] hover:border-sky-400/40 transition-all duration-300 flex flex-col items-center text-center gap-2.5 group shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  Stok Bahan
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Inventori Realtime
                </span>
              </div>
            </Link>

            <Link
              href="/management/tables"
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] hover:border-teal-400/40 transition-all duration-300 flex flex-col items-center text-center gap-2.5 group shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  QR & Meja
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Cetak Barcode
                </span>
              </div>
            </Link>

            <Link
              href="/management/settings"
              className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/40 transition-all duration-300 flex flex-col items-center text-center gap-2.5 group shadow-lg hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">
                  Pengaturan
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Pajak & AI Assistant
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Live Transactions & System Activity — Glass Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Orders Glass Card */}
          <div className="rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Transaksi Terkini
                </h3>
              </div>
              <Link
                href="/management/orders"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-white/[0.06] flex-1">
              {data.recentOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Belum ada transaksi tercatat hari ini
                </div>
              ) : (
                data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between group hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                          Meja {order.tableNumber || "A1"}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-1">
                        {order.items.length} item • {formatTimeAgo(order.createdAt)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-xs text-emerald-400 block">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Logs Glass Card */}
          <div className="rounded-3xl p-6 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  Audit & Aktivitas Sistem
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Realtime Security
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 max-h-72 overflow-y-auto pr-1 flex-1 divide-y divide-white/[0.06]">
              {data.recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Belum ada log sistem tercatat
                </div>
              ) : (
                data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="pt-3 first:pt-0 text-xs flex flex-col gap-1 hover:bg-white/[0.02] p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">
                        {log.userName || "System"}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {formatTimeAgo(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
