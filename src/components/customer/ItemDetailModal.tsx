"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItemData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Plus, Minus, Flame, Snowflake } from "lucide-react";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItemData | null;
  onAddToCart: (item: MenuItemData, quantity: number, customizations: any) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [temperature, setTemperature] = useState<"hot" | "iced">("iced");
  const [sugarLevel, setSugarLevel] = useState<"normal" | "less" | "none" | "extra">("normal");
  const [iceLevel, setIceLevel] = useState<"normal" | "less" | "none">("normal");
  const [dairyOption, setDairyOption] = useState<"regular" | "oat" | "coconut">("regular");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setTemperature("iced");
      setSugarLevel("normal");
      setIceLevel("normal");
      setDairyOption("regular");
      setNotes("");
    }
  }, [isOpen, item]);

  if (!item) return null;

  const isDrink = item.category?.slug === "coffee" || item.category?.slug === "non-coffee" || item.category?.slug === "tea";

  const handleConfirm = () => {
    const customizations: any = {
      ...(isDrink && {
        temperature,
        sugarLevel,
        iceLevel: temperature === "iced" ? iceLevel : "none",
        dairyOption,
      }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    onAddToCart(item, quantity, customizations);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      description={item.description}
      maxWidth="lg"
      glass
    >
      <div className="flex flex-col gap-5 mt-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* Item Banner Image */}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xs bg-zinc-100">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
          />
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white font-extrabold text-sm">
            {formatCurrency(item.price)}
          </div>
        </div>

        {/* Customization Controls for Drinks */}
        {isDrink && (
          <div className="flex flex-col gap-4">
            {/* Temperature */}
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Suhu Penyajian
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setTemperature("iced")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
                    temperature === "iced"
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                      : "bg-white/80 text-zinc-700 hover:bg-white"
                  }`}
                >
                  <Snowflake className="w-4 h-4" />
                  <span>Dingin / Iced</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature("hot")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
                    temperature === "hot"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                      : "bg-white/80 text-zinc-700 hover:bg-white"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Panas / Hot</span>
                </button>
              </div>
            </div>

            {/* Sugar Level */}
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Tingkat Kemanisan (Sugar)
              </label>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {[
                  { id: "none", label: "0% No" },
                  { id: "less", label: "50% Less" },
                  { id: "normal", label: "100% Normal" },
                  { id: "extra", label: "Extra" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSugarLevel(s.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                      sugarLevel === s.id
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-white/70 text-zinc-700 hover:bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ice Level (if iced) */}
            {temperature === "iced" && (
              <div>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Jumlah Es (Ice)
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { id: "none", label: "No Ice" },
                    { id: "less", label: "Less Ice" },
                    { id: "normal", label: "Normal Ice" },
                  ].map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIceLevel(i.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                        iceLevel === i.id
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-white/70 text-zinc-700 hover:bg-white"
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Instructions */}
        <div>
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Catatan Khusus (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Contoh: Pisahkan saus, panaskan lebih lama, dll..."
            className="w-full mt-1.5 p-3 rounded-2xl bg-white/80 border border-white/90 text-xs text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Quantity & Add Button Footer */}
        <div className="pt-3 border-t border-white/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-2xl border border-white shadow-xs">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-1 text-zinc-600 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-zinc-900 min-w-4 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1 text-zinc-600 hover:text-zinc-900 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="pastel"
            size="md"
            onClick={handleConfirm}
            className="flex-1"
          >
            Tambah Pesanan • {formatCurrency(item.price * quantity)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
