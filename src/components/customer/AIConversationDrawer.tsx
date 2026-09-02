"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { MessageData, CartData } from "@/types";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { X, Send, User, Sparkles, CreditCard, ShoppingBag, Camera } from "lucide-react";
import { RichChatMessage } from "./RichChatMessage";

interface AIConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageData[];
  onSendMessage: (message: string, paymentVerified?: boolean, imageUrl?: string) => void;
  isLoading: boolean;
  tableNumber: string;
  aiStatus: "ACTIVE" | "PAUSED";
  cart?: CartData | null;
  onOpenPayment?: () => void;
  isCheckingOut?: boolean;
}

export const AIConversationDrawer: React.FC<AIConversationDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  tableNumber,
  aiStatus,
  cart,
  onOpenPayment,
  isCheckingOut = false,
}) => {
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMountRef = useRef(true);
  const isSendingRef = useRef(false);

  // Instant scroll to bottom on open (POV directly on newest messages with 0 scroll jump)
  useLayoutEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isOpen]);

  // Smooth scroll down when new messages arrive while drawer is already open
  useEffect(() => {
    if (isOpen && messagesContainerRef.current && !isFirstMountRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    isFirstMountRef.current = false;
  }, [messages.length, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSendingRef.current) return;
    isSendingRef.current = true;
    onSendMessage(input.trim());
    setInput("");
    setTimeout(() => {
      isSendingRef.current = false;
    }, 600);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in ease-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full glass-pill border-l border-white/80 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between bg-white/75 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* AI Profile Avatar */}
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-sky-500/20 bg-white border border-sky-100 flex items-center justify-center shrink-0">
              <Image
                src="/logoagent.png"
                alt="Havenso AI"
                width={40}
                height={40}
                priority
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 leading-none">
                Havenso AI
              </h3>
              <p className="text-[11px] font-bold text-zinc-500 mt-1">
                Meja {tableNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5"
        >
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-center p-6 my-auto">
              <span className="text-xs font-semibold text-zinc-400">
                Tidak ada pesan
              </span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isUser = msg.senderType === "CUSTOMER";
            const isStaff = msg.senderType === "STAFF";
            const isSystem = msg.senderType === "SYSTEM";

            let metaObj: any = null;
            if (msg.metadata) {
              try {
                metaObj = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
              } catch (e) {}
            }

            if (isSystem) {
              return (
                <div key={msg.id ? `${msg.id}-${idx}` : idx} className="flex justify-center my-1">
                  <div className="px-3 py-1 rounded-full bg-zinc-200/70 backdrop-blur-md text-[11px] font-semibold text-zinc-700 max-w-xs text-center border border-white/60">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id ? `${msg.id}-${idx}` : idx}
                className={`flex gap-2.5 max-w-[85%] ${
                  isUser ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs bg-white border border-zinc-200">
                    {isStaff ? (
                      <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <Image
                        src="/logoagent.png"
                        alt="Havenso AI"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium ${
                      isUser
                        ? "glass-chat-bubble-user rounded-tr-xs"
                        : isStaff
                        ? "glass-chat-bubble-staff rounded-tl-xs"
                        : "glass-chat-bubble-ai rounded-tl-xs text-zinc-800"
                    }`}
                  >
                    {isStaff && (
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 mb-1">
                        Service Staff
                      </span>
                    )}

                    {/* Render User Uploaded Screenshot (Natural Default Aspect Ratio) */}
                    {isUser && metaObj?.imageUrl && (
                      <div className="mb-2 rounded-2xl overflow-hidden border border-white/40 shadow-sm max-w-[240px] bg-black/10">
                        <img
                          src={metaObj.imageUrl}
                          alt="Bukti Transfer"
                          className="w-full h-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(metaObj.imageUrl, "_blank")}
                        />
                      </div>
                    )}

                    {isUser || isStaff ? (
                      msg.content
                    ) : (
                      <RichChatMessage
                        content={msg.content}
                        metadata={msg.metadata}
                        onQuickOrder={(name) => onSendMessage(`Pesen 1 ${name}`)}
                        onConfirmPayment={() =>
                          onSendMessage(
                            "Saya ingin memverifikasi pembayaran QRIS",
                            true
                          )
                        }
                        onUploadProof={(base64) =>
                          onSendMessage(
                            "Saya sudah bayar via QRIS, ini bukti transfernya 📸",
                            true,
                            base64
                          )
                        }
                        isAi
                        isLoading={isLoading}
                      />
                    )}
                  </div>

                  <span className="text-[10px] text-zinc-600 px-1 self-end font-medium">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* AI Typing Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 max-w-[85%] self-start items-center">
              <div className="w-7 h-7 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs bg-white border border-zinc-200">
                <Image
                  src="/logoagent.png"
                  alt="Havenso AI"
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="glass-chat-bubble-ai rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Chat Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-zinc-200/60 bg-white/80 backdrop-blur-md flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ketik pesan ke Havenso AI..."
            className="flex-1 px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 bg-zinc-100/80 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-sky-400 transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
