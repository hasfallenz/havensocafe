"use client";

import React, { useState, useEffect } from "react";
import { OrderData } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Search, Eye, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const url = new URL("/api/orders", window.location.origin);
      if (selectedStatus !== "ALL") url.searchParams.set("status", selectedStatus);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // 1. High frequency 2.5s background polling for 100% real-time reliability
    const interval = setInterval(loadOrders, 2500);

    // 2. Setup real-time SSE listener
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime");
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const evtType = payload.type || payload.event;
          if (
            evtType === "ORDER_CREATED" ||
            evtType === "ORDER_STATUS_CHANGED" ||
            evtType === "KITCHEN_UPDATED" ||
            evtType === "PAYMENT_COMPLETED"
          ) {
            loadOrders();
          }
        } catch (err) {
          console.error("SSE parse error in orders page:", err);
        }
      };
    } catch (e) {
      // ignore
    }

    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
  }, [selectedStatus]);

  // Cashier Verification Action
  const handleVerifyPayment = async (orderId: string) => {
    setIsVerifying(orderId);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          provider: "QRIS",
          simulateSuccess: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        alert("Gagal memverifikasi pembayaran: " + (data.error?.message || "Error"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(null);
    }
  };

  // Cashier Reject / Unpaid Action
  const handleRejectPayment = async (orderId: string) => {
    if (!confirm("Tolak pembayaran ini? (Pelanggan akan diinfokan bahwa mutasi belum masuk / nominal kurang)")) {
      return;
    }
    setIsVerifying(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "REJECTED_UNPAID",
          status: "CANCELLED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(s)) ||
      o.items.some((i) => i.nameSnapshot.toLowerCase().includes(s))
    );
  });

  const statuses = ["ALL", "QUEUED", "COOKING", "READY", "COMPLETED", "CANCELLED"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Manajemen Pesanan & Kasir</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              Live QRIS
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar transaksi, validasi mutasi pembayaran QRIS, dan kontrol tiket kitchen
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            type="button"
            onClick={loadOrders}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no order / meja..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === st
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">No. Order</th>
                <th className="py-3 px-4">Meja</th>
                <th className="py-3 px-4">Menu Items</th>
                <th className="py-3 px-4">Total Tagihan</th>
                <th className="py-3 px-4">Status Pembayaran</th>
                <th className="py-3 px-4">Status Kitchen</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Verifikasi Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    Tidak ada data pesanan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.paymentStatus === "SUCCESS";
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-sky-800">
                        Meja {order.tableNumber || "A1"}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 max-w-xs truncate">
                        {order.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", ")}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-900 font-mono">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>LUNAS / VERIFIED</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>MENUNGGU VERIFIKASI</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            order.status === "COMPLETED"
                              ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                              : order.status === "READY"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.status === "COOKING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : order.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Verify Button for Cashier */}
                          {!isPaid && (
                            <>
                              <button
                                type="button"
                                disabled={isVerifying === order.id}
                                onClick={() => handleVerifyPayment(order.id)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                                title="Verifikasi Mutasi Masuk (Approve)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verifikasi</span>
                              </button>
                              <button
                                type="button"
                                disabled={isVerifying === order.id}
                                onClick={() => handleRejectPayment(order.id)}
                                className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="Tolak (Nominal Kurang / Palsu)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Lihat Detail Pesanan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Detail Pesanan ${selectedOrder?.orderNumber}`}
        description={`Meja ${selectedOrder?.tableNumber || "A1"} • ${selectedOrder ? formatDate(selectedOrder.createdAt) : ""}`}
        maxWidth="md"
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4 mt-2">
            {/* Status Info */}
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex justify-between items-center text-xs">
              <span className="text-zinc-600 font-medium">Status Pembayaran:</span>
              <span
                className={`font-extrabold px-2.5 py-1 rounded-md border text-[11px] ${
                  selectedOrder.paymentStatus === "SUCCESS"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }`}
              >
                {selectedOrder.paymentStatus === "SUCCESS" ? "LUNAS (VERIFIED)" : "MENUNGGU VERIFIKASI KASIR"}
              </span>
            </div>

            {/* Notes if any */}
            {selectedOrder.notes && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Catatan Meja:</strong> {selectedOrder.notes}
              </div>
            )}

            {/* Items Breakdown with Price Snapshot */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Rincian Item:
              </span>
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-2xl p-3 bg-white">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="py-2 first:pt-0 flex justify-between text-xs">
                    <div>
                      <span className="font-bold text-zinc-900 block">
                        {item.quantity}x {item.nameSnapshot}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        @ {formatCurrency(item.priceSnapshot)}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Totals */}
            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak (PB1 10%)</span>
                <span>{formatCurrency(selectedOrder.tax)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-extrabold text-zinc-900">
                <span>Total Wajib Transfer</span>
                <span className="text-emerald-700 font-mono">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            {selectedOrder.paymentStatus !== "SUCCESS" && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
                <Button
                  type="button"
                  variant="pastel"
                  isLoading={isVerifying === selectedOrder.id}
                  onClick={() => handleVerifyPayment(selectedOrder.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Verifikasi Pembayaran Masuk
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isLoading={isVerifying === selectedOrder.id}
                  onClick={() => handleRejectPayment(selectedOrder.id)}
                  className="px-4"
                >
                  Tolak
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
