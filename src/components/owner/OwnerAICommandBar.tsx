"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Mic,
  MicOff,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OwnerAICommandBarProps {
  onExecuteCommand?: (command: string) => void;
}

export const OwnerAICommandBar: React.FC<OwnerAICommandBarProps> = ({
  onExecuteCommand,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [lastSubmittedCommand, setLastSubmittedCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition if available in browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "id-ID"; // Indonesian language recognition

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechTranscript("");
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setSpeechTranscript(currentTranscript);
          setPrompt(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Browser Anda belum mendukung Web Speech Recognition. Silakan gunakan Google Chrome atau Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechTranscript("");
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  // Handle Command Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setLastSubmittedCommand(cleanPrompt);
    if (onExecuteCommand) {
      onExecuteCommand(cleanPrompt);
    }

    // Clear after submission
    setPrompt("");
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Main Google-AI Style Command Capsule Bar */}
      <div
        className={cn(
          "relative rounded-3xl p-2 sm:p-2.5 transition-all duration-300",
          "bg-white/[0.04] hover:bg-white/[0.06] backdrop-blur-2xl border",
          isListening
            ? "border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/30"
            : "border-white/[0.12] focus-within:border-amber-400/60 focus-within:shadow-[0_0_30px_rgba(251,191,36,0.25)] shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
        )}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
          
          {/* Left Emblem: Search Icon */}
          <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Search className="w-4 h-4 text-amber-400" />
          </div>

          {/* Prompt Text Input */}
          <div className="flex-1 min-w-0 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything boss..."
              className="w-full bg-transparent text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-hidden py-2 pr-8"
            />

            {/* Clear Input Button */}
            {prompt && !isListening && (
              <button
                type="button"
                onClick={() => setPrompt("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Hapus ketikan"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons: Voice Mic & Submit */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Google-Style Voice Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "relative p-2.5 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center",
                isListening
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse scale-105"
                  : "bg-white/[0.07] hover:bg-white/[0.12] text-amber-400 hover:text-amber-300 border border-white/[0.08]"
              )}
              title={isListening ? "Klik untuk menghentikan rekaman" : "Bicara perintah suara (Voice Command)"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}

              {/* Pulsing Ripple Dot when Listening */}
              {isListening && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
              )}
            </button>

            {/* Submit Arrow Button */}
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={cn(
                "h-10 px-4 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md",
                prompt.trim()
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-amber-400/20 hover:scale-102 active:scale-98"
                  : "bg-white/[0.05] text-zinc-600 border border-white/[0.05] cursor-not-allowed"
              )}
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Live Voice Listening Visualizer Banner */}
      {isListening && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-rose-950/40 border border-rose-500/30 backdrop-blur-xl flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-3">
            {/* Audio Wave Frequency Bars */}
            <div className="flex items-center gap-1 h-5 px-1">
              <span className="w-1 bg-rose-400 rounded-full animate-bounce [animation-delay:0ms] h-3" />
              <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms] h-5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-4" />
              <span className="w-1 bg-sky-400 rounded-full animate-bounce [animation-delay:450ms] h-2" />
            </div>

            <div>
              <span className="text-xs font-bold text-rose-300 block">
                Mendengarkan suara Anda...
              </span>
              <p className="text-[11px] text-zinc-300 italic line-clamp-1">
                {speechTranscript || "Silakan ucapkan perintah seperti 'Cek omset hari ini' atau 'Habiskan stok Americano'"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.2] text-white border border-white/[0.15] transition-colors cursor-pointer"
          >
            Selesai Bicara
          </button>
        </div>
      )}

      {/* Temporary Feedback for User Testing */}
      {lastSubmittedCommand && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              Perintah terkirim: <strong>&ldquo;{lastSubmittedCommand}&rdquo;</strong>
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 italic">
            (UI Command Bar Siap &mdash; Otak & Tangan Agent Siap Dihubungkan)
          </span>
        </div>
      )}
    </div>
  );
};
