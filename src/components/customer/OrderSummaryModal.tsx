"use client";

import React, { useState } from "react";
import Image from "next/image";
import { CartData, CartItemData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Trash2, Plus, Minus, Receipt, ShoppingBag, Utensils } from "lucide-react";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartData | null;
  tableNumber: string;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToPayment: (notes: string) => void;
  isProcessing: boolean;
}

export const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
  isOpen,
  onClose,
  cart,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToPayment,
  isProcessing,
}) => {
  const [notes, setNotes] = useState("");

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
            <div className="w-12 h-12 rounded-full bg-sky-100/70 flex items-center justify-center text-sky-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-zinc-800">
              Keranjang pesanan masih kosong
            </p>
            <p className="text-xs text-zinc-500">
              Pilih menu favoritmu atau ketik langsung ke AI Waiter!
            </p>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex flex-col gap-2.5 divide-y divide-zinc-200/50">
              {items.map((item) => {
                const customLabel = parseCustomizations(item.customizations);
                return (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.menuItem?.imageUrl && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-100 shadow-2xs">
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
                        <span className="text-[11px] font-semibold text-sky-800">
                          {formatCurrency(item.unitPrice)}
                        </span>
                        {customLabel && (
                          <span className="text-[10px] text-zinc-500 line-clamp-1">
                            {customLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Modifier */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1 rounded-xl border border-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-zinc-900 min-w-3 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-bold text-xs text-zinc-900 min-w-16 text-right">
                        {formatCurrency(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes to Kitchen */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                Catatan untuk Barista & Dapur
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Contoh: Minta disajikan bersamaan..."
                className="w-full mt-1 p-2.5 rounded-xl bg-white/80 border border-white/90 text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-sky-400 shadow-2xs resize-none"
              />
            </div>

            {/* Receipt Summary Calculation */}
            <div className="p-4 rounded-2xl bg-white/85 border border-white/90 shadow-xs flex flex-col gap-2">
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
                <span className="text-sky-800 text-base">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              type="button"
              variant="pastel"
              size="lg"
              isLoading={isProcessing}
              onClick={() => onProceedToPayment(notes)}
              className="w-full mt-1"
            >
              Lanjut ke Pembayaran • {formatCurrency(total)}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
