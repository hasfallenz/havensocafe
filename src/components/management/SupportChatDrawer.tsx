"use client";

import React, { useState, useEffect, useRef } from "react";
import { SupportTicketData, MessageData } from "@/types";
import { formatDate } from "@/lib/utils";
import { X, Send, Bot, User, RotateCcw, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "../ui/Button";

interface SupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicketData | null;
  onSendMessage: (ticketId: string, conversationId: string, content: string) => Promise<void>;
  onReturnToAi: (ticketId: string) => Promise<void>;
  onResolveTicket: (ticketId: string) => Promise<void>;
  messages: MessageData[];
}

export const SupportChatDrawer: React.FC<SupportChatDrawerProps> = ({
  isOpen,
  onClose,
  ticket,
  onSendMessage,
  onReturnToAi,
  onResolveTicket,
  messages,
}) => {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  if (!isOpen || !ticket) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(ticket.id, ticket.conversationId || "", input.trim());
      setInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 leading-tight">
                Meja {ticket.tableNumber || "A1"}
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium truncate max-w-xs mt-0.5">
                {ticket.summary}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Takeover Control Bar */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Human Takeover Active (AI Paused)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReturnToAi(ticket.id)}
              className="bg-white text-xs h-7 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Return to AI</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onResolveTicket(ticket.id)}
              className="bg-emerald-700 hover:bg-emerald-800 text-xs h-7 gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Selesaikan</span>
            </Button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-zinc-50/50">
          {messages.map((msg) => {
            const isStaff = msg.senderType === "STAFF";
            const isUser = msg.senderType === "CUSTOMER";
            const isAI = msg.senderType === "AI";
            const isSystem = msg.senderType === "SYSTEM";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <span className="px-3 py-1 rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${
                  isStaff ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] font-bold ${
                    isStaff
                      ? "bg-emerald-600"
                      : isAI
                      ? "bg-sky-600"
                      : "bg-zinc-700"
                  }`}
                >
                  {isStaff ? "S" : isAI ? "AI" : "C"}
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3 rounded-2xl text-xs font-medium ${
                      isStaff
                        ? "bg-emerald-600 text-white rounded-tr-xs"
                        : isAI
                        ? "bg-sky-50 text-sky-950 border border-sky-200/80 rounded-tl-xs"
                        : "bg-white text-zinc-900 border border-zinc-200 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    <span className="block text-[10px] font-bold opacity-70 mb-0.5">
                      {isStaff ? "Staff (You)" : isAI ? "Havenso AI" : `Customer (Meja ${ticket.tableNumber})`}
                    </span>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-zinc-400 px-1 self-end font-medium">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Balas pesan customer sebagai staff..."
            className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />

          <Button
            type="submit"
            size="sm"
            isLoading={isSending}
            disabled={!input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
