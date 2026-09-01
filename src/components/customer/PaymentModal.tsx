"use client";

import React, { useState, useEffect } from "react";
import { OrderData, PaymentData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { QrCode, CreditCard, Store, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderData | null;
  onConfirmPayment: (orderId: string, provider: string) => Promise<boolean>;
  onPaymentSuccess: (order: OrderData) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmPayment,
  onPaymentSuccess,
}) => {
  const [selectedProvider, setSelectedProvider] = useState("QRIS");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">("PENDING");
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  useEffect(() => {
    if (isOpen) {
      setPaymentStatus("PENDING");
      setIsProcessing(false);
      setTimeLeft(300);
    }
  }, [isOpen, order]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || paymentStatus !== "PENDING") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPaymentStatus("FAILED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentStatus]);

  if (!isOpen || !order) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      const success = await onConfirmPayment(order.id, selectedProvider);
      if (success) {
        setPaymentStatus("SUCCESS");
        setTimeout(() => {
          onPaymentSuccess(order);
          onClose();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const qrisData = `00020101021226580016ID.CO.HAVENSO.QR0118936009180000000000520458125303360540${order.total}5802ID5912HAVENSO CAFE6007JAKARTA62070703A016304${order.orderNumber}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Pesanan"
      description={`Order ${order.orderNumber} • Meja ${order.tableNumber || "A1"}`}
      maxWidth="md"
      glass
    >
      <div className="flex flex-col gap-5 mt-2">
        {paymentStatus === "SUCCESS" ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="font-extrabold text-xl text-zinc-900">
              Pembayaran Berhasil!
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs">
              Terima kasih! Pesanan Anda telah diteruskan ke dapur dan segera dipersiapkan.
            </p>
            <span className="text-sm font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Total {formatCurrency(order.total)}
            </span>
          </div>
        ) : (
          <>
            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "QRIS", label: "QRIS", icon: <QrCode className="w-4 h-4" /> },
                { id: "VA_BCA", label: "Virtual Account", icon: <CreditCard className="w-4 h-4" /> },
                { id: "CASHIER", label: "EDC / Debit", icon: <Store className="w-4 h-4" /> },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProvider(p.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-bold transition-all ${
                    selectedProvider === p.id
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                      : "bg-white/80 text-zinc-700 hover:bg-white border border-white/90"
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Total Amount & Timer */}
            <div className="p-3.5 rounded-2xl bg-white/90 border border-white shadow-2xs flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-semibold">Total Tagihan (Non-Tunai):</span>
              <span className="font-mono font-black text-sm text-sky-950">
                {formatCurrency(order.total)}
              </span>
            </div>

            {/* Dynamic Provider Form */}
            {selectedProvider === "QRIS" && (
              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-150">
                <div className="text-center">
                  <span className="font-extrabold text-sm text-zinc-900 block">
                    HASFALLENZ STORE
                  </span>
                  <span className="text-[10px] font-semibold text-rose-600">
                    QRIS Standar Indonesia (Semua Bank & E-Wallet)
                  </span>
                </div>
                <div className="p-1 bg-white rounded-xl border border-zinc-200 shadow-xs flex flex-col items-center">
                  <img
                    src="/qris.png"
                    alt="QRIS HASFALLENZ STORE"
                    className="w-52 max-w-full rounded-lg object-contain"
                  />
                </div>

                <span className="text-[10px] text-zinc-400 text-center font-medium">
                  Scan melalui BCA Mobile, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay
                </span>
              </div>
            )}

            {selectedProvider === "VA_BCA" && (
              <div className="p-4 rounded-2xl bg-white border border-sky-200 shadow-xs flex flex-col gap-2">
                <span className="text-[11px] font-bold text-sky-800">Nomor Virtual Account BCA</span>
                <div className="flex items-center justify-between p-2.5 bg-sky-50/70 rounded-xl border border-sky-100">
                  <span className="font-mono font-black text-base text-sky-950">80777 0891238471</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText("807770891238471")}
                    className="text-[10px] font-bold text-sky-700 bg-white px-2 py-1 rounded-lg border border-sky-200 hover:bg-sky-50 transition-colors"
                  >
                    Salin
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Transfer tepat sesuai total nominal. Pembayaran otomatis diverifikasi dalam 5 detik.
                </p>
              </div>
            )}

            {selectedProvider === "CASHIER" && (
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-col gap-2 text-center items-center">
                <Store className="w-8 h-8 text-sky-600 mb-1" />
                <span className="text-xs font-bold text-zinc-800">
                  Tunjukkan Nomor Pesanan ke Kasir
                </span>
                <span className="font-mono font-black text-xl text-sky-900 bg-sky-50 px-4 py-1.5 rounded-xl border border-sky-200">
                  {order.orderNumber}
                </span>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Havenso Cafe menerapkan sistem 100% Cashless. Kasir akan memvalidasi pembayaran via mesin EDC / Kartu Debit.
                </p>
              </div>
            )}

            {/* Action Simulator Button */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200/60">
              <Button
                type="button"
                variant="pastel"
                size="lg"
                isLoading={isProcessing}
                onClick={handleConfirmPayment}
                className="w-full"
              >
                ✅ Saya Sudah Transfer Sesuai Tagihan
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-zinc-500"
              >
                Tutup / Bayar Nanti
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
