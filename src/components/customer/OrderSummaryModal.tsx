"use client";

import React from "react";
import Image from "next/image";
import { CartData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ShoppingBag } from "lucide-react";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartData | null;
  tableNumber: string;
  onUpdateQuantity?: (cartItemId: string, newQty: number) => void;
  onRemoveItem?: (cartItemId: string) => void;
  onProceedToPayment: (notes: string) => void;
  isProcessing: boolean;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableNumber,
  onProceedToPayment,
  isProcessing,
}) => {
  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;

  const parseCustomizations = (customStr?: string | null) => {
    if (!customStr) return null;
    try {
      const obj = JSON.parse(customStr);
      const parts = [];
      if (obj.temperature) parts.push(obj.temperature.toUpperCase());
      if (obj.sugarLevel) parts.push(`Sugar: ${obj.sugarLevel}`);
      if (obj.iceLevel) parts.push(`Ice: ${obj.iceLevel}`);
      if (obj.dairyOption && obj.dairyOption !== "regular") parts.push(`Milk: ${obj.dairyOption}`);
      if (obj.notes) parts.push(`"${obj.notes}"`);
      return parts.length > 0 ? parts.join(" • ") : null;
    } catch (e) {
      return customStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ringkasan Pesanan"
      description={`Meja ${tableNumber} • Havenso Cafe`}
      maxWidth="lg"
      glass
    >
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100/70 flex items-center justify-center text-amber-700">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-zinc-800">
              Keranjang pesanan masih kosong
            </p>
            <p className="text-xs text-zinc-500">
              Ketik pesanan atau request kamu langsung ke Hermes AI di kolom chat!
            </p>
          </div>
        ) : (
          <>
            {/* Items List (Read-only review of AI recorded orders) */}
            <div className="flex flex-col gap-2.5 divide-y divide-zinc-200/50">
              {items.map((item) => {
                const customLabel = parseCustomizations(item.customizations);
                return (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.menuItem?.imageUrl && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-100 shadow-2xs border border-zinc-200/60">
                          <Image
                            src={item.menuItem.imageUrl}
                            alt={item.menuItem.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-zinc-900 truncate">
                          {item.menuItem?.name || "Menu Item"}
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {formatCurrency(item.unitPrice)}
                        </span>
                        {customLabel && (
                          <span className="text-[10px] text-amber-800 font-medium line-clamp-1">
                            {customLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity & Subtotal (Read-only) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-300/40 text-amber-950 font-extrabold text-xs">
                        {item.quantity}x
                      </span>

                      <span className="font-bold text-xs text-zinc-900 min-w-16 text-right">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Conversational Tip Banner */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-2.5">
              <span className="text-base leading-none">💬</span>
              <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                Pemesanan, kustomisasi rasa, dan catatan dikelola langsung oleh <strong className="font-bold">Hermes AI</strong>. Untuk menambah, mengurangi, atau memberi catatan khusus, cukup ketik di kolom chat.
              </p>
            </div>

            {/* Receipt Summary Calculation */}
            <div className="p-4 rounded-2xl bg-white/85 border border-zinc-200/60 shadow-xs flex flex-col gap-2">
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                <span>Pajak Restoran (PB1 10%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200/60 flex justify-between text-sm font-extrabold text-zinc-900">
                <span>Total Pembayaran</span>
                <span className="text-amber-800 text-base font-black">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              type="button"
              variant="pastel"
              size="lg"
              isLoading={isProcessing}
              onClick={() => onProceedToPayment("")}
              className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black border-none"
            >
              Lanjut ke Pembayaran • {formatCurrency(total)}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
