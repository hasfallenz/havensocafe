"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, Award, DollarSign, ShoppingBag, Sparkles } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<{
    todayRevenue: number;
    todayOrdersCount: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    totalOrders: number;
    popularItems: { name: string; count: number; revenue: number }[];
  }>({
    todayRevenue: 0,
    todayOrdersCount: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    popularItems: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    // Realtime SSE updates
    const eventSource = new EventSource("/api/realtime");
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (
          parsed.type === "PAYMENT_CONFIRMED" ||
          parsed.type === "ORDER_CREATED" ||
          parsed.type === "ORDER_STATUS_CHANGED"
        ) {
          loadAnalytics();
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const maxPopularCount = stats.popularItems.length > 0
    ? Math.max(...stats.popularItems.map((i) => i.count), 1)
    : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-zinc-700" />
          <span>Laporan & Analytics Penjualan</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Performa omset penjualan riil dan tren menu terlaris Havenso Cafe
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset Hari Ini */}
        <div className="p-5 rounded-3xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Omset Hari Ini
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-zinc-900">
              {formatCurrency(stats.todayRevenue)}
            </span>
            <span className="text-xs text-zinc-500 font-medium block mt-1">
              {stats.todayOrdersCount} transaksi sukses
            </span>
          </div>
        </div>

        {/* Total Omset Minggu Ini */}
        <div className="p-5 rounded-3xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Omset 7 Hari Terakhir
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-zinc-900">
              {formatCurrency(stats.weeklyRevenue)}
            </span>
            <span className="text-xs text-zinc-500 font-medium block mt-1">
              Akumulasi 7 hari terakhir
            </span>
          </div>
        </div>

        {/* Total Omset Bulan Ini */}
        <div className="p-5 rounded-3xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Omset Bulan Ini
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-zinc-900">
              {formatCurrency(stats.monthlyRevenue)}
            </span>
            <span className="text-xs text-zinc-500 font-medium block mt-1">
              Bulan berjalan
            </span>
          </div>
        </div>

        {/* Total Transaksi Selesai */}
        <div className="p-5 rounded-3xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Total Transaksi Selesai
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-sky-600">
              {stats.totalOrders} Pesanan
            </span>
            <span className="text-xs text-sky-700 font-semibold block mt-1">
              Katalog menu baru aktif
            </span>
          </div>
        </div>
      </div>

      {/* Top Selling Menu Items Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-zinc-900">
              Top Menu Paling Laris
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            Realtime Terhubung
          </span>
        </div>

        {stats.popularItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-zinc-800 mt-1">
              Belum Ada Data Penjualan Menu
            </p>
            <p className="text-xs text-zinc-400 max-w-md">
              Katalog menu baru belum memiliki riwayat pesanan. Data omset dan menu terlaris akan otomatis terisi secara real-time saat customer memesan dan menyelesaikan pembayaran.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {stats.popularItems.map((item, idx) => {
              const percentage = Math.round((item.count / maxPopularCount) * 100);

              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-100 font-bold text-zinc-700 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-zinc-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-700">{item.count} porsi terjual</span>
                      <span className="font-extrabold text-sky-900 min-w-20 text-right">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
