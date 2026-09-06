"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  SupportTicketData,
  OrderData,
  RealtimeEvent,
  InventoryItemData,
  StaffStockReportLog,
} from "@/types";
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
  CreditCard,
  Loader2,
  Clock,
  Boxes,
  Search,
  Coffee,
  UtensilsCrossed,
  ClipboardCheck,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
} from "lucide-react";
import ThermalReceiptModal from "@/components/receipt/ThermalReceiptModal";

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

export default function DedicatedStaffPage() {
  const [tickets, setTickets] = useState<SupportTicketData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = useState<"support" | "orders" | "inventory">("support");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [submittingTicketId, setSubmittingTicketId] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<{
    orderNumber: string;
    tableNumber: string;
    total: number;
    order: OrderData;
  } | null>(null);

  // Staff Inventory & Reporting State
  const [inventoryItems, setInventoryItems] = useState<InventoryItemData[]>([]);
  const [inventoryReports, setInventoryReports] = useState<StaffStockReportLog[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);

  // Report Modal State
  const [selectedReportItem, setSelectedReportItem] = useState<InventoryItemData | null>(null);
  const [reportActualStock, setReportActualStock] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccessToast, setReportSuccessToast] = useState<string | null>(null);

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

  const loadInventoryData = useCallback(async () => {
    setIsInventoryLoading(true);
    try {
      const res = await fetch("/api/staff/inventory");
      const json = await res.json();
      if (json.success && json.data) {
        setInventoryItems(json.data.items);
        setInventoryReports(json.data.recentReports);
      }
    } catch (e) {
      console.error("Failed to load staff inventory:", e);
    } finally {
      setIsInventoryLoading(false);
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
      loadInventoryData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [loadInventoryData]);

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
          event.type === "PAYMENT_COMPLETED" ||
          event.type === "INVENTORY_CHANGED" ||
          event.type === "STOCK_REPORT_SUBMITTED"
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
          if (event.type === "INVENTORY_CHANGED" || event.type === "STOCK_REPORT_SUBMITTED") {
            loadInventoryData();
          } else {
            loadData();
          }
        }
      } catch (err) {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [loadData, loadInventoryData, playOrderChime]);

  const handleOpenReportModal = (item: InventoryItemData) => {
    setSelectedReportItem(item);
    setReportActualStock(String(item.stock));
  };

  const handleSubmitStockReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportItem) return;
    const num = parseFloat(reportActualStock);
    if (isNaN(num) || num < 0) {
      alert("Masukkan jumlah stok yang valid (angka 0 atau lebih).");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/staff/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedReportItem.id,
          actualStock: num,
          staffName: "Staff Barista / Dapur",
          reportType: "UPDATE_STOK",
          notes: "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReportSuccessToast(`Stok "${selectedReportItem.name}" berhasil diperbarui: ${num} ${selectedReportItem.unit}`);
        setSelectedReportItem(null);
        setReportActualStock("");
        loadInventoryData();
        setTimeout(() => setReportSuccessToast(null), 3000);
      } else {
        alert(json.error?.message || "Gagal memperbarui stok.");
      }
    } catch (err) {
      console.error("Submit stock report error:", err);
      alert("Terjadi kesalahan jaringan saat memperbarui stok.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const lowStockCount = useMemo(
    () => inventoryItems.filter((i) => i.stock <= i.minStock).length,
    [inventoryItems]
  );

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((item) =>
      item.name.toLowerCase().includes(inventorySearch.toLowerCase())
    );
  }, [inventoryItems, inventorySearch]);

  const handleTakeRequest = async (ticket: SupportTicketData) => {
    setSubmittingTicketId(ticket.id);
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
    } finally {
      setSubmittingTicketId(null);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    setSubmittingTicketId(ticketId);
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
    } finally {
      setSubmittingTicketId(null);
    }
  };

  const handleConfirmDebit = async (ticket: SupportTicketData) => {
    setSubmittingTicketId(ticket.id);
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_DEBIT" }),
      });
      const json = await res.json();
      if (json.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? json.data : t))
        );
        if (json.order) {
          setSelectedReceiptOrder(json.order);
          setIsReceiptOpen(true);
        }
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingTicketId(null);
    }
  };

  const pendingCount = tickets.filter((t) => t.status === "WAITING").length;

  return (
    <div className="min-h-screen customer-canvas-bg text-zinc-900 flex flex-col font-sans">
      {/* Top Staff Bar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/70 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shadow-md shadow-emerald-600/15 bg-white border border-emerald-100 flex items-center justify-center shrink-0">
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
            <h1 className="font-black text-base sm:text-lg text-zinc-900 tracking-tight leading-tight">
              STAFF STATION
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">
              Havenso Cafe • Support Queue & Assistance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            <Bell className="w-3.5 h-3.5 text-rose-600 animate-bounce shrink-0" />
            <span className="hidden sm:inline">{pendingCount} Tiket Menunggu</span>
            <span className="sm:hidden">{pendingCount} Menunggu</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-4 sm:gap-6">
        {/* Instant New Order & Receipt Notification Banner */}
        {newOrderAlert && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500 text-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-950 text-amber-400 rounded-xl shadow-xs shrink-0">
                <Receipt className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-tight">
                    Pesanan Baru Masuk!
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

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptOrder(newOrderAlert.order);
                  setIsReceiptOpen(true);
                  setNewOrderAlert(null);
                  setActiveTab("orders");
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
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

        {/* Success Feedback Toast for Stock Report */}
        {reportSuccessToast && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between gap-3 shadow-lg shadow-emerald-600/20 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-xs sm:text-sm block">
                  Laporan Stok Berhasil Dicatat!
                </span>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {reportSuccessToast} — Tersinkronisasi otomatis ke Dashboard Owner & Hermes AI.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReportSuccessToast(null)}
              className="p-2 hover:bg-emerald-700 rounded-xl text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200/80 pb-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 select-none ${
              activeTab === "support"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            <HeadphonesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Antrean Bantuan & Panggilan Meja</span>
            <span className="sm:hidden">Antrean Bantuan</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${activeTab === "support" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-700"}`}>
              {tickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 select-none ${
              activeTab === "orders"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Monitor Pesanan Aktif</span>
            <span className="sm:hidden">Monitor Pesanan</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${activeTab === "orders" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-700"}`}>
              {orders.filter((o) => o.status !== "COMPLETED").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 select-none ${
              activeTab === "inventory"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span className="hidden sm:inline">Pencatatan & Laporan Bahan</span>
            <span className="sm:hidden">Lapor Bahan</span>
            {lowStockCount > 0 ? (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeTab === "inventory" ? "bg-amber-400 text-zinc-950 font-bold" : "bg-amber-100 text-amber-800"}`}>
                {lowStockCount} Menipis
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${activeTab === "inventory" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                {inventoryItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Support Queue */}
        {activeTab === "support" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {tickets.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-zinc-200 text-xs text-zinc-400">
                Tidak ada tiket bantuan yang aktif saat ini.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isCritical = ticket.priority === "P0" || ticket.priority === "P1";
                const isDebit = ticket.type === "DEBIT_PAYMENT";
                const isSubmittingThis = submittingTicketId === ticket.id;

                let ticketMeta: any = {};
                if (ticket.metadata) {
                  try {
                    ticketMeta = typeof ticket.metadata === "string" ? JSON.parse(ticket.metadata) : ticket.metadata;
                  } catch (e) {
                    ticketMeta = {};
                  }
                }

                return (
                  <div
                    key={ticket.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                      isDebit
                        ? ticket.status === "WAITING"
                          ? "border-indigo-300 ring-2 ring-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white"
                          : "border-indigo-200"
                        : ticket.status === "WAITING" && isCritical
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                            isDebit ? "text-indigo-950 bg-indigo-50 border-indigo-200" : "text-sky-950 bg-sky-50 border-sky-200"
                          }`}>
                            Meja {ticket.tableNumber || "A1"}
                          </span>
                          {isDebit && (
                            <span className="inline-flex items-center gap-1 font-black text-[10px] px-2 py-0.5 rounded-md bg-indigo-600 text-white tracking-wide uppercase shadow-xs">
                              <CreditCard className="w-3 h-3" />
                              Bayar EDC
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-zinc-400">
                          {formatTimeAgo(ticket.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="font-bold text-sm text-zinc-900 leading-snug">
                          {ticket.summary}
                        </p>

                        {/* Customer & Amount details for Debit Payment */}
                        {isDebit && (ticketMeta.customerName || ticketMeta.amount) && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col gap-1 text-xs">
                            {ticketMeta.customerName && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-500 font-medium">Atas Nama:</span>
                                <span className="font-black text-indigo-950 uppercase">{ticketMeta.customerName}</span>
                              </div>
                            )}
                            {ticketMeta.amount > 0 && (
                              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-indigo-100/60">
                                <span className="text-zinc-500 font-medium">Total Tagihan:</span>
                                <span className="font-black text-indigo-950 font-mono">{formatCurrency(ticketMeta.amount)}</span>
                              </div>
                            )}
                            {ticketMeta.orderNumber && (
                              <div className="flex justify-between items-center text-[10px] text-zinc-400">
                                <span>No. Order:</span>
                                <span className="font-mono font-bold text-zinc-600">{ticketMeta.orderNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {ticket.assignedUserName && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-2">
                            <User className="w-3 h-3" />
                            Ditangani: {ticket.assignedUserName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex items-center gap-2">
                      {ticket.status === "WAITING" ? (
                        isDebit ? (
                          <button
                            type="button"
                            disabled={isSubmittingThis}
                            onClick={() => handleTakeRequest(ticket)}
                            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {isSubmittingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            <span>Bawa Mesin EDC ke Meja</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmittingThis}
                            onClick={() => handleTakeRequest(ticket)}
                            className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {isSubmittingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <Hand className="w-4 h-4" />
                            )}
                            <span>Respon Panggilan</span>
                          </button>
                        )
                      ) : ticket.status === "IN_PROGRESS" ? (
                        isDebit ? (
                          <button
                            type="button"
                            disabled={isSubmittingThis}
                            onClick={() => handleConfirmDebit(ticket)}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            title="Klik setelah pembayaran kartu debit berhasil di mesin EDC"
                          >
                            {isSubmittingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                            <span>Konfirmasi Lunas EDC</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmittingThis}
                            onClick={() => handleResolveTicket(ticket.id)}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            title="Klik jika bantuan meja sudah selesai"
                          >
                            {isSubmittingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>Selesaikan Bantuan</span>
                          </button>
                        )
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 py-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{isDebit ? "Lunas via Kartu Debit / EDC" : "Selesai Dilayani"}</span>
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
          <div className="flex flex-col gap-3">
            {/* Mobile Card View (< md) for seamless Android experience */}
            <div className="flex md:hidden flex-col gap-3">
              {orders.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-zinc-200 text-xs text-zinc-400">
                  Tidak ada pesanan aktif saat ini.
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800">
                          {order.orderNumber}
                        </span>
                        <span className="font-extrabold text-xs text-sky-800">
                          Meja {order.tableNumber || "A1"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          order.status === "READY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "COOKING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-700">
                      <p className="font-bold text-zinc-900 mb-0.5">
                        A/N: <span className="uppercase">{order.customerName || "Pelanggan"}</span>
                      </p>
                      <p className="text-zinc-600 text-[11px] line-clamp-2">
                        {order.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold block leading-none">Total</span>
                        <span className="font-black text-sm text-zinc-900 font-mono">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReceiptOrder(order);
                          setIsReceiptOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 active:scale-95 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                        title="Cetak Struk Pembayaran"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block bg-white rounded-3xl border border-zinc-200 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs min-w-[640px]">
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
          </div>
        )}

        {/* Tab 3: Staff Inventory & Stock Reporting */}
        {activeTab === "inventory" && (
          <div className="flex flex-col gap-5">
            {/* Search Bar & Quick Refresh */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Cari nama bahan baku..."
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={loadInventoryData}
                disabled={isInventoryLoading}
                className="p-2.5 bg-white hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 text-xs rounded-2xl border border-zinc-200 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-60 shadow-2xs"
                title="Segarkan data inventori"
              >
                <RefreshCw className={`w-4 h-4 ${isInventoryLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Inventory Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredInventoryItems.length === 0 ? (
                <div className="col-span-full py-14 text-center bg-white rounded-3xl border border-zinc-200 text-xs text-zinc-400">
                  Tidak ada bahan baku yang sesuai dengan kriteria pencarian.
                </div>
              ) : (
                filteredInventoryItems.map((item) => {
                  const isDrink = getCategory(item.name) === "MINUMAN";
                  const isLow = item.stock <= item.minStock && item.stock > 0;
                  const isOut = item.stock <= 0;
                  const isAvailable = item.stock > item.minStock;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 ${
                        isOut
                          ? "border-rose-300 ring-2 ring-rose-100/60 bg-gradient-to-b from-rose-50/20 to-white"
                          : isLow
                          ? "border-amber-300 ring-2 ring-amber-100/60 bg-gradient-to-b from-amber-50/20 to-white"
                          : "border-zinc-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1.5 ${
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
                              <span>{isDrink ? "Minuman / Bar" : "Makanan / Dapur"}</span>
                            </span>
                            <h3 className="font-extrabold text-sm text-zinc-900 leading-snug">
                              {item.name}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
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
                            <span>{isAvailable ? "Aman" : isLow ? "Menipis" : "Habis"}</span>
                          </span>
                        </div>

                        {/* Stock Metric */}
                        <div className="mt-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-baseline justify-between">
                          <span className="text-[11px] font-bold text-zinc-500">
                            Stok Tercatat:
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono font-black text-xl text-zinc-900">
                              {item.stock}
                            </span>
                            <span className="text-xs font-bold text-zinc-500">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button: Kurang & Tambah Stok */}
                      <button
                        type="button"
                        onClick={() => handleOpenReportModal(item)}
                        className="w-full py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Kurang / Tambah Stok</span>
                        <Minus className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Riwayat Laporan Terakhir Staff */}
            <div className="mt-2 bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="font-extrabold text-sm text-zinc-900">
                    Riwayat Laporan Terakhir Staf
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Tersinkronisasi Realtime
                </span>
              </div>

              <div className="flex flex-col divide-y divide-zinc-100">
                {inventoryReports.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">
                    Belum ada laporan stok yang dicatat oleh staf hari ini.
                  </div>
                ) : (
                  inventoryReports.map((report) => (
                    <div
                      key={report.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-2">
                        <span className="font-extrabold text-zinc-900 shrink-0">
                          {report.userName || "Staff"}:
                        </span>
                        <span className="text-zinc-600 leading-relaxed">
                          {report.details}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0 self-start sm:self-auto">
                        {formatTimeAgo(report.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Update / Sesuaikan Stok Bahan */}
      {selectedReportItem && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 leading-tight">
                    Update Stok Bahan
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-semibold">
                    {selectedReportItem.name} • Satuan: {selectedReportItem.unit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportItem(null)}
                className="p-1.5 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Recorded Stock Card */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-500">Stok Saat Ini:</span>
              <span className="font-mono font-black text-sm text-zinc-900">
                {selectedReportItem.stock} {selectedReportItem.unit}
              </span>
            </div>

            <form onSubmit={handleSubmitStockReport} className="flex flex-col gap-4">
              {/* Actual Stock Input with Stepper */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-2 text-center">
                  Sesuaikan Jumlah Stok
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(reportActualStock) || 0;
                      const nextVal = Math.max(0, current - 1);
                      setReportActualStock(String(Math.round(nextVal * 10) / 10));
                    }}
                    className="w-11 h-11 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-800 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Kurangi 1"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={reportActualStock}
                      onChange={(e) => setReportActualStock(e.target.value)}
                      placeholder="0"
                      className="w-full text-center font-mono font-black text-lg py-2.5 px-3 rounded-2xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 pointer-events-none">
                      {selectedReportItem.unit}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(reportActualStock) || 0;
                      const nextVal = current + 1;
                      setReportActualStock(String(Math.round(nextVal * 10) / 10));
                    }}
                    className="w-11 h-11 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-800 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Tambah 1"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Step Helper Chips */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5">
                  {[-5, -1, 1, 5].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => {
                        const current = parseFloat(reportActualStock) || 0;
                        const nextVal = Math.max(0, current + delta);
                        setReportActualStock(String(Math.round(nextVal * 10) / 10));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingReport ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Simpan Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
