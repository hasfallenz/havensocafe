"use client";

import React, { useRef } from "react";
import { OrderData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Printer, X, CheckCircle2, Utensils, Receipt } from "lucide-react";

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderData | null;
  mode?: "CUSTOMER" | "KITCHEN"; // Customer bill vs Kitchen preparation ticket
}

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  order,
  mode = "CUSTOMER",
}: ThermalReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = new Date(order.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Action Controls Bar */}
        <div className="w-full flex items-center justify-between mb-3 text-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
              {mode === "KITCHEN" ? (
                <Utensils className="w-4 h-4 text-amber-400" />
              ) : (
                <Receipt className="w-4 h-4 text-emerald-400" />
              )}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {mode === "KITCHEN" ? "Slip Pesanan Dapur" : "Struk Kasir Customer"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          ref={receiptRef}
          id="thermal-receipt-printable"
          className="w-full bg-[#fbfbfb] text-zinc-900 font-mono text-[11px] p-6 rounded-2xl shadow-2xl border border-zinc-300 relative overflow-hidden leading-relaxed"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-zinc-400">
            <h2 className="font-black text-base tracking-wider uppercase text-zinc-950">
              HAVENSO CAFE
            </h2>
            <p className="text-[10px] text-zinc-600">
              Artisan Coffee & Culinary Sanctuary
            </p>
            <p className="text-[9px] text-zinc-500">
              Jl. Ruko Havenso No. 88 • 0812-3456-7890
            </p>
            {mode === "KITCHEN" && (
              <div className="mt-2 inline-block px-2.5 py-0.5 rounded bg-zinc-900 text-amber-400 font-black text-[11px] tracking-widest uppercase">
                *** TIKET DAPUR / BARISTA ***
              </div>
            )}
          </div>

          {/* Order Details Header */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 text-[10px] flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span className="text-zinc-600">No. Order :</span>
              <span className="font-bold text-zinc-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Meja :</span>
              <span className="font-black text-amber-900 bg-amber-100 px-1 rounded">
                MEJA {order.tableNumber || "A1"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Waktu :</span>
              <span>
                {formattedDate}, {formattedTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Kasir/POS :</span>
              <span>Havenso AI Waiter</span>
            </div>
          </div>

          {/* Items List */}
          <div className="py-3 border-b border-dashed border-zinc-400 flex flex-col gap-2">
            {order.items.map((item, idx) => {
              let notesStr = "";
              if (item.customizations) {
                try {
                  const parsed =
                    typeof item.customizations === "string"
                      ? JSON.parse(item.customizations)
                      : item.customizations;
                  notesStr = parsed.notes || parsed.specialInstructions || "";
                } catch {
                  notesStr = item.customizations;
                }
              }

              return (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between font-bold text-zinc-950">
                    <span>
                      {item.quantity}x {item.nameSnapshot}
                    </span>
                    {mode === "CUSTOMER" && (
                      <span>{formatCurrency(item.subtotal)}</span>
                    )}
                  </div>

                  {mode === "CUSTOMER" && item.quantity > 1 && (
                    <div className="text-[9px] text-zinc-500 pl-4">
                      @ {formatCurrency(item.priceSnapshot)}
                    </div>
                  )}

                  {notesStr && (
                    <div className="text-[10px] text-amber-700 bg-amber-50/80 px-1.5 py-0.5 rounded mt-0.5 font-bold italic">
                      Catatan: {notesStr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pricing Calculation (Only for Customer Receipt) */}
          {mode === "CUSTOMER" && (
            <div className="py-2.5 border-b border-dashed border-zinc-400 flex flex-col gap-1 text-[10px]">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal || order.total / 1.1)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>PB1 Restoran (10%)</span>
                <span>{formatCurrency(order.tax || (order.total / 1.1) * 0.1)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1.5 border-t border-zinc-200 text-zinc-950">
                <span>TOTAL AKHIR</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 flex items-center justify-between text-[10px]">
            <span className="text-zinc-600">Metode Bayar:</span>
            <span className="font-extrabold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              QRIS DINAMIS (LUNAS)
            </span>
          </div>

          {/* Footer Receipt Note */}
          <div className="pt-4 text-center text-[9px] text-zinc-500 flex flex-col gap-1">
            <p className="font-bold text-zinc-700">
              Terima Kasih Telah Berkunjung!
            </p>
            <p>WiFi: Havenso-Guest • Pass: havenso123</p>
            <p className="text-[8px] text-zinc-400 pt-1 tracking-widest font-mono">
              *** HAVENSO INTELLIGENT AI POS ***
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Thermal Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-printable,
          #thermal-receipt-printable * {
            visibility: visible;
          }
          #thermal-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            padding: 4mm;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
