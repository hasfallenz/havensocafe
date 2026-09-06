"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  Send,
  Mic,
  MicOff,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OwnerDrawerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface OwnerAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onInventoryUpdate?: () => void;
}

export const OwnerAIDrawer: React.FC<OwnerAIDrawerProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  onInventoryUpdate,
}) => {
  const [messages, setMessages] = useState<OwnerDrawerMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "id-ID";

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechTranscript("");
        };

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setSpeechTranscript(current);
          setInput(current);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  // Handle initial prompt if opened via Command Bar
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
    }
  }, [isOpen, initialPrompt]);

  // Auto scroll to bottom
  useLayoutEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isOpen, messages, isLoading]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setSpeechTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Speech error", e);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend ?? input).trim();
    if (!promptText || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: OwnerDrawerMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: promptText,
      createdAt: new Date(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/owner/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          history: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await response.json();
      if (json.success && json.data?.reply) {
        const aiMsg: OwnerDrawerMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: json.data.reply,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        onInventoryUpdate?.();
      } else {
        const errorMsg: OwnerDrawerMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Maaf Boss, koneksi ke modul Hermes AI sedang terputus. Silakan coba lagi.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (e) {
      console.error(e);
      const errorMsg: OwnerDrawerMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Terjadi gangguan saat mengambil data analitik dari server. Silakan ulangi.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg h-full bg-[#0a0d14]/95 border-l border-white/[0.12] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0e121b]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Hermes Owner Avatar - Pure PP without green dot */}
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-amber-500/20 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0c1017] overflow-hidden flex items-center justify-center">
                <Image
                  src="/logoagent.png"
                  alt="Hermes AI"
                  width={44}
                  height={44}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                  HERMES
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    OWNER AI
                  </span>
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Hapus riwayat obrolan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Tutup Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs text-zinc-100"
          style={{ color: "#f4f4f5" }}
        >
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-center p-6 my-auto">
              <span className="text-xs font-semibold text-zinc-500">
                Tidak ada pesan
              </span>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-end gap-2 max-w-[88%]",
                m.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
              )}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shrink-0 mb-0.5 shadow-xs">
                  <div className="w-full h-full rounded-[10px] bg-[#0c1017] overflow-hidden flex items-center justify-center">
                    <Image
                      src="/logoagent.png"
                      alt="Hermes AI"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "p-3.5 rounded-2xl text-xs leading-relaxed transition-all shadow-md",
                  m.role === "user"
                    ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white font-semibold rounded-tr-xs border border-amber-400/40 shadow-lg shadow-amber-950/40"
                    : "bg-[#151c2a] text-zinc-100 border border-white/[0.12] rounded-tl-xs shadow-lg shadow-black/40"
                )}
                style={
                  m.role === "user"
                    ? { color: "#ffffff", backgroundColor: "#d97706" }
                    : { color: "#f4f4f5", backgroundColor: "#151c2a" }
                }
              >
                {m.role === "user" ? (
                  <span className="text-white font-semibold text-xs tracking-wide" style={{ color: "#ffffff" }}>
                    {m.content}
                  </span>
                ) : (
                  renderHermesMessage(m.content)
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mr-auto flex items-end gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shrink-0 mb-0.5 shadow-xs">
                <div className="w-full h-full rounded-[10px] bg-[#0c1017] overflow-hidden flex items-center justify-center">
                  <Image
                    src="/logoagent.png"
                    alt="Hermes AI"
                    width={28}
                    height={28}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#131823]/95 border border-white/[0.08] rounded-tl-xs flex items-center gap-2.5 text-xs text-amber-300 shadow-md">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="font-medium text-[11px] text-zinc-300">
                  Menganalisis live database cafe...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Listening Live Transcript Banner */}
        {isListening && (
          <div className="px-4 py-2 bg-rose-500/15 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Mendengarkan suara: &ldquo;{speechTranscript || "..."}&rdquo;
            </span>
            <button
              onClick={toggleListening}
              className="text-[10px] font-bold underline cursor-pointer"
            >
              Kirim Suara
            </button>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#0c1017]/90 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.12] rounded-2xl p-1.5 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all"
          >
            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center",
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-amber-400 hover:text-amber-300 hover:bg-white/[0.08]"
              )}
              title={isListening ? "Hentikan perekaman suara" : "Gunakan perintah suara"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input Text */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Tanya omset, menu, stok, atau kendala dapur..."
              className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-hidden px-1 disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0",
                input.trim() && !isLoading
                  ? "bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-400/25 hover:scale-105 active:scale-95"
                  : "bg-white/[0.05] text-zinc-600 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Formats Hermes AI messages with crystal-clear high contrast, gold accents, and bullet points
 */
function renderHermesMessage(content: string) {
  if (!content) return null;

  // Split by double newlines into clean paragraph blocks
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <div className="flex flex-col gap-2.5 leading-relaxed text-zinc-100" style={{ color: "#f4f4f5" }}>
      {paragraphs.map((para, pIdx) => {
        const lines = para.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) return null;

        return (
          <div key={pIdx} className="flex flex-col gap-1.5">
            {lines.map((line, lIdx) => {
              // 1. Check bullet item (- or * or •)
              const isBullet = /^[-*•]\s+/.test(line);
              if (isBullet) {
                const bulletText = line.replace(/^[-*•]\s+/, "");
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 py-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0 shadow-xs"
                      style={{ backgroundColor: "#fbbf24" }}
                    />
                    <div className="flex-1 text-zinc-100 text-xs leading-relaxed" style={{ color: "#f4f4f5" }}>
                      {parseMarkdownInline(bulletText)}
                    </div>
                  </div>
                );
              }

              // 2. Check numbered list (1. 2. 3.)
              const isNumbered = /^\d+\.\s+/.test(line);
              if (isNumbered) {
                const match = line.match(/^(\d+\.)\s+(.*)/);
                const num = match ? match[1] : "";
                const numText = match ? match[2] : line;
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1 py-0.5">
                    <span
                      className="font-bold text-amber-400 shrink-0 text-xs"
                      style={{ color: "#fbbf24" }}
                    >
                      {num}
                    </span>
                    <div className="flex-1 text-zinc-100 text-xs leading-relaxed" style={{ color: "#f4f4f5" }}>
                      {parseMarkdownInline(numText)}
                    </div>
                  </div>
                );
              }

              // 3. Check section header (e.g. **Omset hari ini:** or **📊 Data – ...**)
              const isSectionTitle =
                line.startsWith("#") ||
                (/^(\*\*|###|##).+(:|\*\*)$/.test(line) && line.length < 90) ||
                line.startsWith("📊 ") ||
                line.startsWith("🔎 ") ||
                line.startsWith("💡 ") ||
                line.startsWith("⚠️ ");

              if (isSectionTitle) {
                const cleanHeader = line.replace(/^#{1,3}\s*/, "");
                return (
                  <div
                    key={lIdx}
                    className="pt-1.5 pb-0.5 font-extrabold text-amber-300 text-xs tracking-tight"
                    style={{ color: "#fcd34d" }}
                  >
                    {parseMarkdownInline(cleanHeader)}
                  </div>
                );
              }

              // 4. Regular paragraph text
              return (
                <p
                  key={lIdx}
                  className="text-xs text-zinc-100 leading-relaxed"
                  style={{ color: "#f4f4f5" }}
                >
                  {parseMarkdownInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Parses inline **bold**, *italic*, and clean metrics with guaranteed bright white contrast
 */
function parseMarkdownInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match **bold** or *italic*
  const tokenRegex = /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={idx}
          className="font-extrabold text-white drop-shadow-2xs"
          style={{ color: "#ffffff", fontWeight: 800 }}
        >
          {inner}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em
          key={idx}
          className="italic text-zinc-200"
          style={{ color: "#e4e4e7" }}
        >
          {inner}
        </em>
      );
    }

    return (
      <span key={idx} style={{ color: "#f4f4f5" }}>
        {part}
      </span>
    );
  });
}
