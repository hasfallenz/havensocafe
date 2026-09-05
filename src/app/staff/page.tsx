"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { SupportTicketData, OrderData, RealtimeEvent } from "@/types";
import { formatTimeAgo, formatCurrency } from "@/lib/utils";
import {
  HeadphonesIcon,
  Hand,
  CheckCircle2,
  User,
  ShoppingBag,
  Bell,
  Printer,
  X,
  Receipt,
} from "lucide-react";
import ThermalReceiptModal from "@/components/receipt/ThermalReceiptModal";

export default function DedicatedStaffPage() {
  const [tickets, setTickets] = useState<SupportTicketData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = useState<"support" | "orders">("support");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<{
    orderNumber: string;
    tableNumber: string;
    total: number;
    order: OrderData;
  } | null>(null);

  const playOrderChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio autoplay policy
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ticketsRes, ordersRes] = await Promise.all([
        fetch("/api/support"),
        fetch("/api/orders"),
      ]);
      const ticketsJson = await ticketsRes.json();
      const ordersJson = await ordersRes.json();

      if (ticketsJson.success) setTickets(ticketsJson.data);
      if (ordersJson.success) setOrders(ordersJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const eventSource = new EventSource("/api/realtime");
    eventSource.onmessage = (e) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        if (
          event.type === "SUPPORT_TICKET_CREATED" ||
          event.type === "SUPPORT_TICKET_UPDATED" ||
          event.type === "ORDER_CREATED" ||
          event.type === "ORDER_STATUS_CHANGED" ||
          event.type === "STAFF_TAKEOVER" ||
          event.type === "RETURN_TO_AI" ||
          event.type === "PAYMENT_COMPLETED"
        ) {
          if (event.type === "ORDER_CREATED" || event.type === "PAYMENT_COMPLETED") {
            const ord = (event.data as any)?.order || event.data;
            if (ord && ord.orderNumber) {
              setNewOrderAlert({
                orderNumber: ord.orderNumber,
                tableNumber: ord.tableNumber || "A1",
                total: ord.total || 0,
                order: ord,
              });
              playOrderChime();
            }
          }
          loadData();
        }
      } catch (err) {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [loadData]);

  const handleTakeRequest = async (ticket: SupportTicketData) => {
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IN_PROGRESS" }),
      });
      const json = await res.json();
      if (json.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? json.data : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE" }),
      });
      const json = await res.json();
      if (json.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? json.data : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingCount = tickets.filter((t) => t.status === "WAITING").length;

  return (
    <div className="min-h-screen customer-canvas-bg text-zinc-900 flex flex-col font-sans">
      {/* Top Staff Bar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/70 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-md shadow-emerald-600/15 bg-white border border-emerald-100 flex items-center justify-center shrink-0">
            <Image
              src="/logostaff.png"
              alt="Staff Station"
              width={44}
              height={44}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-black text-lg text-zinc-900 tracking-tight leading-tight">
              SERVICE STAFF STATION
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Havenso Cafe • Support Queue & Table Assistance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            <Bell className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
            <span>{pendingCount} Tiket Bantuan Menunggu</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* Instant New Order & Receipt Notification Banner */}
        {newOrderAlert && (
          <div className="p-4 rounded-2xl bg-amber-500 text-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-950 text-amber-400 rounded-xl shadow-xs">
                <Receipt className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-tight">
                    Pesanan Baru Masuk & Siap Cetak Struk!
                  </span>
                  <span className="bg-zinc-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                    MEJA {newOrderAlert.tableNumber}
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-900 mt-0.5">
                  Order #{newOrderAlert.orderNumber} • A/N: <span className="font-black text-zinc-950 underline">{newOrderAlert.order?.customerName || "Pelanggan"}</span> • Total: {formatCurrency(newOrderAlert.total)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptOrder(newOrderAlert.order);
                  setIsReceiptOpen(true);
                  setNewOrderAlert(null);
                  setActiveTab("orders");
                }}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Cetak Struk Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setNewOrderAlert(null)}
                className="p-2 hover:bg-amber-600 rounded-xl text-zinc-950 transition-colors cursor-pointer"
                title="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200/80 pb-3">
          <button
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "support"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            <HeadphonesIcon className="w-4 h-4" />
            <span>Antrean Bantuan & Panggilan Meja ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Monitor Pesanan Aktif ({orders.filter((o) => o.status !== "COMPLETED").length})</span>
          </button>
        </div>

        {/* Tab 1: Support Queue */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-zinc-200 text-xs text-zinc-400">
                Tidak ada tiket bantuan yang aktif saat ini.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isCritical = ticket.priority === "P0" || ticket.priority === "P1";

                return (
                  <div
                    key={ticket.id}
                    className={`bg-white rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                      ticket.status === "WAITING" && isCritical
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-sky-950 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                          Meja {ticket.tableNumber || "A1"}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-400">
                          {formatTimeAgo(ticket.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="font-bold text-sm text-zinc-900 leading-snug">
                          {ticket.summary}
                        </p>
                        {ticket.assignedUserName && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            Ditangani: {ticket.assignedUserName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center gap-2">
                      {ticket.status === "WAITING" ? (
                        <button
                          type="button"
                          onClick={() => handleTakeRequest(ticket)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Hand className="w-3.5 h-3.5" />
                          <span>Respon</span>
                        </button>
                      ) : ticket.status === "IN_PROGRESS" ? (
                        <button
                          type="button"
                          onClick={() => handleResolveTicket(ticket.id)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
                          title="Klik jika bantuan meja sudah selesai"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                          <span className="group-hover:hidden truncate">Staff Segera ke Sana</span>
                          <span className="hidden group-hover:inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selesai
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Selesai Dilayani</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Orders Monitor */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No. Order</th>
                  <th className="py-3 px-4">Meja</th>
                  <th className="py-3 px-4">Menu Items</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Kitchen Status</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4 text-center">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-sky-800">
                        Meja {order.tableNumber || "A1"}
                      </div>
                      <div className="text-[11px] font-bold text-zinc-600 mt-0.5">
                        A/N: <span className="text-zinc-900 font-extrabold">{order.customerName || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700">
                      {order.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          order.status === "READY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "COOKING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">
                      {formatTimeAgo(order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceiptOrder(order);
                          setIsReceiptOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-white text-[11px] font-extrabold shadow-xs transition-all cursor-pointer group"
                        title="Cetak Struk Pembayaran"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400 group-hover:text-zinc-950 transition-colors" />
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Printable Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={selectedReceiptOrder}
        mode="CUSTOMER"
      />
    </div>
  );
}
