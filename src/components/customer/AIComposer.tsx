"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MenuItemData } from "@/types";
import { Send, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIComposerProps {
  selectedItems: MenuItemData[];
  onRemoveSelectedItem: (itemId: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onOpenConversation: () => void;
  unreadCount?: number;
  hasCartBottomBar?: boolean;
}

export const AIComposer: React.FC<AIComposerProps> = ({
  selectedItems,
  onRemoveSelectedItem,
  onSendMessage,
  isLoading,
  onOpenConversation,
  unreadCount = 0,
  hasCartBottomBar = false,
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
    <div
      className={cn(
        "z-40 flex flex-col gap-2 transition-all duration-300 fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-[480px]",
        hasCartBottomBar ? "bottom-20" : "bottom-3 sm:bottom-6"
      )}
    >
      {/* Main Composer Box */}
      <div className="glass-pill rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-xl border border-zinc-200/80">
        {/* Selected Items Context Banner */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200/60 overflow-x-auto">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 shrink-0">
              <MessageSquare className="w-3 h-3 text-amber-600" />
              Item:
            </span>
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs font-bold text-amber-950 shrink-0"
              >
                <span>1x {item.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSelectedItem(item.id)}
                  className="rounded-full hover:bg-amber-400/30 p-0.5 text-amber-900 transition-colors"
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
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-amber-50 border border-zinc-200/80 shadow-2xs transition-all hover:scale-105 cursor-pointer flex items-center justify-center p-0.5"
              title="Buka Chat Hermes AI"
            >
              <div className="w-full h-full rounded-lg overflow-hidden">
                <Image
                  src="/logoagent.png"
                  alt="Hermes AI"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border-2 border-white" />
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="Tanya / Pesan via Hermes AI..."
            className="flex-1 px-2.5 py-1.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 bg-transparent focus:outline-hidden disabled:opacity-60"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || (!inputValue.trim() && selectedItems.length === 0)}
            className={cn(
              "shrink-0 h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs",
              inputValue.trim() || selectedItems.length > 0
                ? "bg-zinc-900 text-white hover:bg-amber-600 active:scale-95 shadow-zinc-900/20"
                : "bg-zinc-100 text-zinc-400 shadow-none cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <span className="typing-dot bg-zinc-600" />
                <span className="typing-dot bg-zinc-600" />
                <span className="typing-dot bg-zinc-600" />
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">Kirim</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
