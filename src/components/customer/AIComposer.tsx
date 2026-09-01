"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MenuItemData } from "@/types";
import { Send, Sparkles, X, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIComposerProps {
  selectedItems: MenuItemData[];
  onRemoveSelectedItem: (itemId: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onOpenConversation: () => void;
  unreadCount?: number;
}

export const AIComposer: React.FC<AIComposerProps> = ({
  selectedItems,
  onRemoveSelectedItem,
  onSendMessage,
  isLoading,
  onOpenConversation,
  unreadCount = 0,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && selectedItems.length === 0) return;

    const messageToSend =
      inputValue.trim() ||
      (selectedItems.length > 0
        ? `Pesan ${selectedItems.map((i) => i.name).join(", ")}`
        : "");
    onSendMessage(messageToSend);
    setInputValue("");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[500px] z-40 flex flex-col gap-2">
      {/* Main Composer Box */}
      <div className="glass-pill rounded-3xl p-3 shadow-2xl transition-all duration-300">
        {/* Selected Items Context Banner */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200/60 overflow-x-auto">
            <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-sky-600" />
              Context:
            </span>
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-400/40 text-xs font-bold text-sky-950 shrink-0"
              >
                <span>1x {item.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSelectedItem(item.id)}
                  className="rounded-full hover:bg-sky-400/30 p-0.5 text-sky-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input & Action Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Chat History Drawer Toggle Button with Agent Avatar */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onOpenConversation}
              className="w-9 h-9 rounded-2xl bg-white hover:bg-sky-50 border border-zinc-200/80 shadow-2xs transition-all hover:scale-105 cursor-pointer flex items-center justify-center p-0.5"
              title="Buka Chat Havenso AI"
            >
              <div className="w-full h-full rounded-xl overflow-hidden">
                <Image
                  src="/logoagent.png"
                  alt="Havenso AI"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="Silahkan Pesan Disini..."
            className="flex-1 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 bg-transparent focus:outline-hidden disabled:opacity-60"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || (!inputValue.trim() && selectedItems.length === 0)}
            className={cn(
              "shrink-0 h-10 px-4 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer shadow-md",
              inputValue.trim() || selectedItems.length > 0
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sky-600/30 hover:opacity-95 active:scale-95"
                : "bg-zinc-200 text-zinc-400 shadow-none cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <span className="typing-dot bg-white" />
                <span className="typing-dot bg-white" />
                <span className="typing-dot bg-white" />
              </div>
            ) : (
              <>
                <span>Kirim</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
