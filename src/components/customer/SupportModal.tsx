"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  onRequestSupport: (type: string, priority: string, summary: string) => Promise<void>;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  onRequestSupport,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("Minuman tumpah");
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [callCount, setCallCount] = useState<number>(0);

  const quickOptions = [
    "Minuman tumpah",
    "Ada masalah dengan makanan/minuman",
  ];

  // Storage key for this table's cooldown state
  const storageKey = `havenso_support_cd_${tableNumber || "A1"}`;

  // Check storage on mount & when modal opens
  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        if (parsed.cooldownUntil && parsed.cooldownUntil > now) {
          const remaining = Math.ceil((parsed.cooldownUntil - now) / 1000);
          setCooldownSeconds(remaining);
          setCallCount(parsed.count || 2);
        } else {
          setCooldownSeconds(0);
          setCallCount(parsed.count || 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen, storageKey]);

  // Interval timer for cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          // Cooldown finished: reset counter
          try {
            sessionStorage.removeItem(storageKey);
          } catch (e) {}
          setCallCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds, storageKey]);

  const handleSelectOption = (opt: string) => {
    if (cooldownSeconds > 0) return;
    if (selectedReason === opt) {
      setSelectedReason("");
    } else {
      setSelectedReason(opt);
      setCustomMessage(""); // Clean text column if option is selected
    }
  };

  const handleTextareaFocus = () => {
    if (cooldownSeconds > 0) return;
    setSelectedReason(""); // Clear radio selection when user focuses on text column
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (cooldownSeconds > 0) return;
    setCustomMessage(e.target.value);
    if (selectedReason) {
      setSelectedReason(""); // Ensure radio selection is removed while typing
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    setIsSubmitting(true);
    try {
      const summary = customMessage.trim() || selectedReason || "Panggilan Staff";

      await onRequestSupport("PHYSICAL_ASSISTANCE", "P1", summary);
      
      // Update rate limit tracking
      const newCount = callCount + 1;
      setCallCount(newCount);

      if (newCount >= 2) {
        const cooldownUntil = Date.now() + 60000;
        setCooldownSeconds(60);
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ count: newCount, cooldownUntil })
          );
        } catch (e) {}
      } else {
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ count: newCount, cooldownUntil: 0 })
          );
        } catch (e) {}
      }

      onClose();
      setCustomMessage("");
      setSelectedReason("Minuman tumpah");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOnCooldown = cooldownSeconds > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ada yang bisa kami bantu?"
      description={`Meja ${tableNumber}`}
      maxWidth="md"
      glass
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        
        {/* Cooldown Active Alert Banner */}
        {isOnCooldown && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Batas 2x panggilan tercapai. Harap tunggu sebentar.</span>
            </div>
            <span className="font-mono font-bold bg-amber-200/90 text-amber-950 px-2.5 py-1 rounded-xl text-xs shrink-0 ml-2">
              {cooldownSeconds}s
            </span>
          </div>
        )}

        {/* Quick Options List (Pure Text with Google Form style radio circle) */}
        <div className="flex flex-col gap-2">
          {quickOptions.map((opt) => {
            const isSelected = selectedReason === opt && !isOnCooldown;

            return (
              <button
                key={opt}
                type="button"
                disabled={isOnCooldown}
                onClick={() => handleSelectOption(opt)}
                className={cn(
                  "w-full p-3.5 px-4 rounded-2xl text-sm font-semibold text-left transition-all border flex items-center gap-3 group",
                  isOnCooldown
                    ? "opacity-50 cursor-not-allowed bg-zinc-50 border-zinc-200 text-zinc-400"
                    : isSelected
                    ? "bg-sky-50/90 border-sky-300 text-sky-950 font-bold shadow-2xs cursor-pointer"
                    : "bg-white/80 border-zinc-200/80 text-zinc-700 hover:bg-white hover:border-zinc-300 cursor-pointer"
                )}
              >
                {/* Google Forms style Radio Circle */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shrink-0 transition-all",
                    isOnCooldown
                      ? "border-zinc-300"
                      : isSelected
                      ? "border-sky-600 shadow-2xs"
                      : "border-zinc-300 group-hover:border-zinc-400"
                  )}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-in zoom-in-75 duration-150" />
                  )}
                </div>

                <span className="leading-tight">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Message Textarea with Label */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-700">
            Atau memiliki masalah lain?
          </label>
          <textarea
            value={customMessage}
            disabled={isOnCooldown}
            onFocus={handleTextareaFocus}
            onChange={handleTextareaChange}
            rows={3}
            placeholder={
              isOnCooldown
                ? "Sedang cooldown, mohon tunggu..."
                : "Tuliskan jika ada kebutuhan khusus..."
            }
            className={cn(
              "w-full p-3.5 rounded-2xl border text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-hidden transition-all shadow-2xs resize-none",
              isOnCooldown
                ? "bg-zinc-100/70 border-zinc-200 opacity-60 cursor-not-allowed"
                : "bg-white/90 border-zinc-200 focus:ring-2 focus:ring-sky-400 focus:bg-white"
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isOnCooldown}
            isLoading={isSubmitting}
            className={cn(
              "flex-1 font-bold py-3.5 rounded-2xl shadow-md transition-all",
              isOnCooldown
                ? "bg-zinc-300 text-zinc-500 shadow-none cursor-not-allowed"
                : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-600/20"
            )}
          >
            {isOnCooldown
              ? `Tunggu Cooldown (${cooldownSeconds}s)`
              : `Kirim Panggilan Staff Meja ${tableNumber}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};



