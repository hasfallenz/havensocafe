"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { OrderData, OrderStatus, RealtimeEvent } from "@/types";
import { formatTimeAgo, formatCurrency } from "@/lib/utils";
import {
  Clock,
  Play,
  CheckCircle2,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function DedicatedKitchenPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const eventSource = new EventSource("/api/realtime");
    eventSource.onmessage = (e) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        if (
          event.type === "ORDER_CREATED" ||
          event.type === "KITCHEN_UPDATED" ||
          event.type === "ORDER_STATUS_CHANGED" ||
          event.type === "PAYMENT_COMPLETED"
        ) {
          loadOrders();
        }
      } catch (err) {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [loadOrders]);

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const parseCustomizations = (customStr?: string | null) => {
    if (!customStr) return null;
    try {
      const obj = JSON.parse(customStr);
      const parts = [];
      if (obj.temperature) parts.push(obj.temperature.toUpperCase());
      if (obj.sugarLevel) parts.push(`Sugar: ${obj.sugarLevel}`);
      if (obj.iceLevel && obj.iceLevel !== "normal") parts.push(`Ice: ${obj.iceLevel}`);
      if (obj.dairyOption && obj.dairyOption !== "regular") parts.push(`Milk: ${obj.dairyOption}`);
      if (obj.spicyLevel) parts.push(obj.spicyLevel);
      if (obj.notes) parts.push(`"${obj.notes}"`);
      return parts.length > 0 ? parts.join(" • ") : null;
    } catch (e) {
      return customStr;
    }
  };

  const columns: Array<{
    id: OrderStatus;
    title: string;
    color: string;
    border: string;
    badgeBg: string;
  }> = [
    {
      id: "QUEUED",
      title: "Antrean Masuk (Queued)",
      color: "text-sky-400",
      border: "border-sky-500/30 bg-sky-950/20",
      badgeBg: "bg-sky-500/20 text-sky-300",
    },
    {
      id: "COOKING",
      title: "Sedang Dimasak (Cooking)",
      color: "text-amber-400",
      border: "border-amber-500/30 bg-amber-950/20",
      badgeBg: "bg-amber-500/20 text-amber-300",
    },
    {
      id: "READY",
      title: "Siap Diantar (Ready)",
      color: "text-emerald-400",
      border: "border-emerald-500/30 bg-emerald-950/20",
      badgeBg: "bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "COMPLETED",
      title: "Selesai (Completed)",
      color: "text-zinc-400",
      border: "border-zinc-700/40 bg-zinc-900/30",
      badgeBg: "bg-zinc-800 text-zinc-400",
    },
  ];

  const activeTotal = orders.filter((o) => o.status !== "COMPLETED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Kitchen Top Bar */}
      <header className="bg-zinc-900/90 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-md shadow-amber-500/20 bg-white border border-amber-200/40 flex items-center justify-center shrink-0">
            <Image
              src="/logokitchen.png"
              alt="Kitchen Display"
              width={44}
              height={44}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-black text-lg text-white tracking-tight leading-tight">
              KITCHEN DISPLAY STATION
            </h1>
            <p className="text-xs text-zinc-400">
              Havenso Cafe • Real-Time Order & Prep Status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            title={soundEnabled ? "Mute Bell" : "Enable Bell"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </header>

      {/* Main Kanban Content */}
      <main className="p-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 flex-1 items-start">
          {columns.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.id);

            return (
              <div
                key={col.id}
                className={`rounded-3xl p-4 border ${col.border} flex flex-col gap-3 min-h-[75vh] backdrop-blur-xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="font-extrabold text-sm text-white">
                    {col.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold font-mono ${col.badgeBg}`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Orders List */}
                <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto">
                  {colOrders.length === 0 ? (
                    <div className="py-16 text-center text-xs text-zinc-600 font-medium">
                      Kosong
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-lg flex flex-col justify-between gap-3 transition-all hover:border-zinc-700"
                      >
                        <div>
                          {/* Order Top Bar */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-base text-white">
                              {order.orderNumber}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(order.createdAt)}</span>
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-lg">
                              MEJA {order.tableNumber || "A1"}
                            </span>
                            <span className="text-xs font-bold text-zinc-400">
                              {order.items.length} item
                            </span>
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div className="mt-2.5 p-2 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-medium flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>Note: {order.notes}</span>
                            </div>
                          )}

                          {/* Item Checklist */}
                          <div className="mt-3 flex flex-col gap-2 divide-y divide-zinc-800/60">
                            {order.items.map((item) => {
                              const custom = parseCustomizations(item.customizations);
                              return (
                                <div key={item.id} className="pt-2 first:pt-0 flex flex-col">
                                  <span className="font-extrabold text-xs text-zinc-100">
                                    {item.quantity}x {item.nameSnapshot}
                                  </span>
                                  {custom && (
                                    <span className="text-[11px] font-bold text-amber-300/90 bg-amber-950/30 px-2 py-0.5 rounded-md self-start mt-1 border border-amber-800/30">
                                      {custom}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Status Action Buttons */}
                        <div className="pt-2 border-t border-zinc-800">
                          {order.status === "QUEUED" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, "COOKING")}
                              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>MULAI RACIK / MASAK</span>
                            </button>
                          )}

                          {order.status === "COOKING" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, "READY")}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>PESANAN SIAP (READY)</span>
                            </button>
                          )}

                          {order.status === "READY" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order.id, "COMPLETED")}
                              className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selesaikan Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
