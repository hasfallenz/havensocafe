"use client";

import React from "react";
import { OrderData, OrderStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { X, CheckCircle2, Clock, ChefHat, Sparkles, Check, HelpCircle } from "lucide-react";

interface OrderStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderData[];
  onOpenSupport: () => void;
}

export const OrderStatusDrawer: React.FC<OrderStatusDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  onOpenSupport,
}) => {
  if (!isOpen) return null;

  const steps = [
    { id: "PAYMENT", label: "Pembayaran", desc: "Terkonfirmasi" },
    { id: "QUEUED", label: "Antrean Dapur", desc: "Masuk antrean barista" },
    { id: "COOKING", label: "Sedang Diracik", desc: "Proses pembuatan pesanan" },
    { id: "READY", label: "Pesanan Siap", desc: "Diantar ke meja" },
    { id: "COMPLETED", label: "Selesai", desc: "Selamat menikmati" },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case "QUEUED":
        return 1;
      case "COOKING":
        return 2;
      case "READY":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full glass-pill border-l border-white/80 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900">
                Live Status Pesanan
              </h3>
              <p className="text-[11px] font-semibold text-zinc-500">
                Real-time Kitchen Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-5">
          {orders.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Clock className="w-12 h-12 text-zinc-300" />
              <p className="font-bold text-sm text-zinc-700">
                Belum ada pesanan aktif
              </p>
              <p className="text-xs text-zinc-500">
                Pesan menu favorit Anda untuk melihat proses pembuatan secara live!
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentStep = getStepIndex(order.status);

              return (
                <div
                  key={order.id}
                  className="glass-card rounded-3xl p-5 border border-white shadow-md flex flex-col gap-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-sm text-sky-950">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-zinc-500 block">
                        Meja {order.tableNumber || "A1"} • {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        order.status === "READY"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-bounce"
                          : order.status === "COOKING"
                          ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                          : order.status === "COMPLETED"
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Step Timeline */}
                  <div className="py-2 flex flex-col gap-3">
                    {steps.map((step, idx) => {
                      const isPassed = idx < currentStep;
                      const isCurrent = idx === currentStep;
                      const isPending = idx > currentStep;

                      return (
                        <div key={step.id} className="flex items-start gap-3 relative">
                          {idx !== steps.length - 1 && (
                            <div
                              className={`absolute left-3.5 top-6 bottom-0 w-0.5 -mb-3 transition-colors ${
                                isPassed ? "bg-sky-500" : "bg-zinc-200"
                              }`}
                            />
                          )}

                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                              isPassed
                                ? "bg-sky-600 text-white shadow-xs"
                                : isCurrent
                                ? "bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse"
                                : "bg-zinc-200 text-zinc-400"
                            }`}
                          >
                            {isPassed ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <span
                              className={`text-xs font-bold ${
                                isCurrent
                                  ? "text-amber-900 font-extrabold"
                                  : isPassed
                                  ? "text-zinc-800"
                                  : "text-zinc-400"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {step.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Items Preview */}
                  <div className="pt-3 border-t border-zinc-200/60 flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      Item Pesanan:
                    </span>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs font-medium text-zinc-800"
                      >
                        <span>
                          {item.quantity}x {item.nameSnapshot}
                        </span>
                        <span className="text-zinc-600">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between text-xs font-bold text-sky-950">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Support Button */}
        <div className="p-4 border-t border-zinc-200/60 bg-white/70 backdrop-blur-md">
          <button
            type="button"
            onClick={onOpenSupport}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ada Kendala? Panggil Staff / Bantuan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
