"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OrderData, InventoryItemData } from "@/types";
import { formatCurrency, formatDate, formatTimeAgo } from "@/lib/utils";
import { StatCard } from "@/components/management/StatCard";
import {
  DollarSign,
  ShoppingBag,
  ChefHat,
  HeadphonesIcon,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function ManagementDashboardPage() {
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
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm font-bold text-zinc-500 animate-pulse">
          Memuat data operasional...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan Hari Ini"
          value={formatCurrency(data.stats.todayRevenue)}
          subtitle={`${data.stats.todayOrdersCount} transaksi sukses`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          trend="+18.4%"
          trendUp={true}
        />

        <StatCard
          title="Total Pesanan Hari Ini"
          value={data.stats.todayOrdersCount}
          subtitle="Customer ordering aktif"
          icon={<ShoppingBag className="w-5 h-5 text-sky-600" />}
          trend="+12%"
          trendUp={true}
        />

        <StatCard
          title="Antrean Dapur"
          value={data.stats.activeKitchenCount}
          subtitle="Sedang dimasak / mengantre"
          icon={<ChefHat className="w-5 h-5 text-amber-600" />}
          className={data.stats.activeKitchenCount > 0 ? "border-amber-300 bg-amber-50/20" : ""}
        />

        <StatCard
          title="Bantuan Staff Menunggu"
          value={data.stats.pendingSupportCount}
          subtitle="Ticket support / meja"
          icon={<HeadphonesIcon className="w-5 h-5 text-rose-600" />}
          className={data.stats.pendingSupportCount > 0 ? "border-rose-300 bg-rose-50/20" : ""}
        />
      </div>

      {/* Main Grid: Recent Orders & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h2 className="font-extrabold text-base text-zinc-900">
                  Pesanan Terbaru
                </h2>
                <p className="text-xs text-zinc-500">
                  Aktivitas transaksi live dari customer web
                </p>
              </div>
              <Link
                href="/management/orders"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-zinc-100">
              {data.recentOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-400">
                  Belum ada pesanan hari ini.
                </p>
              ) : (
                data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="py-3 first:pt-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center font-mono font-bold text-xs text-zinc-800 shrink-0">
                        {order.tableNumber || "A1"}
                      </div>
                      <div>
                        <span className="font-mono font-black text-xs text-zinc-900 block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {order.items.length} item • {formatTimeAgo(order.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-zinc-900 text-right">
                        {formatCurrency(order.total)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          order.status === "COMPLETED"
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                            : order.status === "READY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "COOKING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Dapur siap menerima instruksi otomatis</span>
            <Link
              href="/management/kitchen"
              className="font-bold text-zinc-800 hover:text-sky-600"
            >
              Buka Kitchen Kanban →
            </Link>
          </div>
        </div>

        {/* Right Column: Inventory Alert & Audit Log */}
        <div className="flex flex-col gap-6">
          {/* Low Stock Alerts */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  Peringatan Stok Bahan
                </h3>
              </div>
              <Link
                href="/management/inventory"
                className="text-[11px] font-bold text-sky-600 hover:underline"
              >
                Kelola
              </Link>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {data.lowStockItems.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium py-2">
                  ✓ Semua stok bahan dalam kondisi aman.
                </p>
              ) : (
                data.lowStockItems.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-950 block">
                        {inv.name}
                      </span>
                      <span className="text-[10px] text-amber-700">
                        Sisa {inv.stock} {inv.unit} (Min: {inv.minStock})
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {inv.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Audit Log */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs flex-1">
            <h3 className="font-bold text-sm text-zinc-900 pb-3 border-b border-zinc-100">
              Aktivitas Manajemen Terbaru
            </h3>

            <div className="mt-3 flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
              {data.recentLogs.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4">Belum ada log aktivitas.</p>
              ) : (
                data.recentLogs.map((log) => (
                  <div key={log.id} className="text-xs flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800">
                        {log.userName || "System"}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatTimeAgo(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
