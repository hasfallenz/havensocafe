import React, { useState } from "react";
import { CheckCircle2, QrCode, Loader2, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RichChatMessageProps {
  content: string;
  metadata?: string | null;
  onConfirmPayment?: () => void;
  onUploadProof?: (base64Image: string) => void;
  onQuickOrder?: (name: string) => void;
  isAi?: boolean;
  isLoading?: boolean;
}

export const RichChatMessage: React.FC<RichChatMessageProps> = ({
  content,
  metadata,
  onConfirmPayment,
  onUploadProof,
  onQuickOrder,
  isAi = false,
  isLoading = false,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Auto-reset verifying spinner whenever global loading state finishes
  React.useEffect(() => {
    if (!isLoading && isVerifying) {
      setIsVerifying(false);
    }
  }, [isLoading]);

  // Parse metadata to check for QRIS or Order Confirmed or Image or Customization
  let metaObj: any = null;
  if (metadata) {
    try {
      metaObj = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    } catch (e) {
      metaObj = null;
    }
  }

  const qrisData = metaObj?.qris;
  const isOrderConfirmed = metaObj?.orderConfirmed;
  const imageUrl = metaObj?.imageUrl;
  const customizedItem = metaObj?.customizedItem;

  let customDetails: { name: string; qty: number; details: string } | null = null;
  if (customizedItem) {
    const parts: string[] = [];
    if (customizedItem.customizations) {
      const c =
        typeof customizedItem.customizations === "string"
          ? JSON.parse(customizedItem.customizations)
          : customizedItem.customizations;
      if (c.temperature) parts.push(c.temperature.toUpperCase());
      if (c.sugarLevel) parts.push(`Gula: ${c.sugarLevel}`);
      if (c.iceLevel && c.iceLevel !== "normal") parts.push(`Es: ${c.iceLevel}`);
      if (c.dairyOption && c.dairyOption !== "regular") parts.push(`Susu: ${c.dairyOption}`);
      if (c.spicyLevel) parts.push(`Pedas: ${c.spicyLevel}`);
      if (c.notes) parts.push(`"${c.notes}"`);
    } else if (customizedItem.notes) {
      parts.push(`"${customizedItem.notes}"`);
    }

    if (parts.length > 0 || customizedItem.menuName) {
      customDetails = {
        name: customizedItem.menuName || "Menu",
        qty: customizedItem.quantity || 1,
        details: parts.length > 0 ? parts.join(" • ") : "Kustomisasi pesanan tercatat",
      };
    }
  }

  const handlePayClick = () => {
    setIsVerifying(true);
    if (onConfirmPayment) {
      onConfirmPayment();
    }
    setTimeout(() => {
      setIsVerifying(false);
    }, 4000);
  };

  // If QRIS card is shown, filter out redundant template intro text
  const cleanContent = qrisData
    ? content
        .replace(/Siap kak! Ini kode QRIS resmi[\s\S]*?ya! 😊/gi, "")
        .trim()
    : content;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Main Formatted Text Content */}
      {cleanContent && (
        <div className="flex flex-col gap-2.5 leading-relaxed text-zinc-800">
          {renderCleanFormattedText(cleanContent)}
        </div>
      )}

      {/* Customization / Special Request Summary Badge Under Agent Response */}
      {customDetails && (
        <div className="mt-1 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/60 text-amber-950 flex flex-col gap-1 shadow-2xs animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[11px] text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{customDetails.qty}x {customDetails.name}</span>
            </span>
            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
              Kustomisasi Khusus
            </span>
          </div>
          <div className="text-[11px] font-semibold text-zinc-700 pl-5">
            {customDetails.details}
          </div>
        </div>
      )}

      {/* Uploaded Screenshot Preview in Chat Bubble (Natural Default Aspect Ratio) */}
      {imageUrl && (
        <div className="mt-1 rounded-2xl overflow-hidden border border-zinc-200 shadow-md max-w-[260px] bg-white">
          <img
            src={imageUrl}
            alt="Bukti Transfer QRIS"
            className="w-full h-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => window.open(imageUrl, "_blank")}
          />
          <div className="py-1.5 px-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[10.5px] text-zinc-600 font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Bukti Transfer QRIS
            </span>
          </div>
        </div>
      )}

      {/* 2. Clean & Pure In-Chat QRIS Card */}
      {qrisData && (
        <div className="mt-2 p-4 rounded-3xl bg-white border border-rose-200/90 shadow-xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200 text-zinc-900">
          {/* Top QRIS Banner */}
          <div className="w-full flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[11px] tracking-wider">
                QRIS
              </span>
              <span className="text-[10px] font-bold text-zinc-500">
                Quick Response Code
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-400">
              NMID: ID1020304050607
            </span>
          </div>

          {/* Merchant Title */}
          <div className="text-center">
            <h4 className="font-extrabold text-sm text-zinc-900 leading-tight">
              HASFALLENZ STORE
            </h4>
            <p className="text-[11px] font-semibold text-sky-700">
              Havenso Cafe • Meja {qrisData.tableNumber || "A1"}
            </p>
          </div>

          {/* Real QRIS Image Container */}
          <div className="p-2 bg-white rounded-2xl border border-zinc-200 shadow-inner flex flex-col items-center justify-center">
            <img
              src="/qris.png"
              alt="QRIS HASFALLENZ STORE"
              className="w-56 max-w-full rounded-xl object-contain shadow-xs"
            />
          </div>

          {/* Amount and PB1 */}
          <div className="w-full text-center py-2 px-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col items-center">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              Total Tagihan (inc. PB1 10%)
            </span>
            <span className="font-black text-xl text-sky-950 font-mono">
              {formatCurrency(qrisData.amount || 0)}
            </span>
          </div>

          {/* Verification / Action Button */}
          {hasConfirmed || isOrderConfirmed ? (
            <div className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✅ Pembayaran Terverifikasi! Pesanan Masuk Dapur</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isVerifying}
              onClick={handlePayClick}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Pembayaran...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saya Sudah Bayar (Verifikasi)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Order Confirmed Badge inside chat */}
      {isOrderConfirmed && (
        <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>Pesanan Masuk ke Dapur: {isOrderConfirmed.orderNumber}</span>
          </div>
          <span className="font-mono text-emerald-950 font-black">
            {formatCurrency(isOrderConfirmed.total)}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Parses markdown paragraphs, bullet points, headers, and clean receipt lists with flawless typography
 */
function renderCleanFormattedText(content: string) {
  const cleanContent = normalizeTablesToText(content);
  // Split by double newline to preserve paragraph blocks
  const paragraphs = cleanContent.split(/\n\s*\n/);

  return paragraphs.map((para, pIdx) => {
    const rawLines = para.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length === 0) return null;

    return (
      <div key={pIdx} className="flex flex-col gap-1.5">
        {rawLines.map((line, lIdx) => {
          // Check if line is a bullet item or numbered list
          const isBullet = /^[-*•]\s+/.test(line);
          const isNumbered = /^\d+\.\s+/.test(line);

          if (isBullet || isNumbered) {
            const cleanText = line.replace(/^[-*•]\s+|^\d+\.\s+/, "");
            return (
              <div key={lIdx} className="flex items-start gap-2 text-xs leading-relaxed pl-1 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0" />
                <div className="flex-1 text-zinc-800">
                  {parseInlineStyles(cleanText)}
                </div>
              </div>
            );
          }

          // Check if line is a header
          const isHeader =
            line.startsWith("### ") ||
            line.startsWith("## ") ||
            line.startsWith("# ") ||
            (/^(\*\*.*?\*\*)$/.test(line) && line.length < 60);

          if (isHeader) {
            const cleanHeader = line.replace(/^#{1,3}\s*/, "").replace(/^\*\*|\*\*$/g, "");
            return (
              <div key={lIdx} className="pt-1.5 pb-0.5">
                <h4 className="font-extrabold text-zinc-950 text-[13px] tracking-tight">
                  {parseInlineStyles(cleanHeader)}
                </h4>
              </div>
            );
          }

          return (
            <p key={lIdx} className="text-xs leading-relaxed text-zinc-800">
              {parseInlineStyles(line)}
            </p>
          );
        })}
      </div>
    );
  });
}

/**
 * Converts raw markdown pipe tables into clean, readable bullet points
 */
function normalizeTablesToText(content: string): string {
  const lines = content.split("\n");
  const resultLines: string[] = [];
  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      inTable = true;
      if (/^\|[\s-:]+\|$/.test(line) || line.includes("---")) {
        continue;
      }
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim().replace(/\*\*/g, ""));

      if (cells.length >= 2) {
        const title = cells[0];
        const desc = cells.slice(1).join(" — ");
        if (title.toLowerCase() !== "menu" && title.toLowerCase() !== "nama menu") {
          resultLines.push(`- **${title}** — ${desc}`);
        }
      }
    } else {
      inTable = false;
      resultLines.push(rawLine);
    }
  }

  return resultLines.join("\n");
}

/**
 * Robust Markdown inline parser for ***bold italic***, **bold**, *(notes)*, *italic*, and removes orphan stars
 */
function parseInlineStyles(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. ***bold italic***
  // 2. **bold**
  // 3. *(badge note)* or * (badge note) *
  // 4. *italic* or *(notes)*
  const tokenRegex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*\([\s\S]+?\)\*|\*[\s\S]+?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // 1. Bold Italic (***text***)
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={idx} className="font-extrabold text-zinc-950 italic">
          {inner}
        </strong>
      );
    }

    // 2. Bold (**text**)
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold text-zinc-950">
          {inner}
        </strong>
      );
    }

    // 3. Badge Note (*(text)*)
    if (part.startsWith("*(") && part.endsWith(")*") && part.length > 3) {
      const inner = part.slice(2, -2);
      return (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-semibold text-[11px] border border-amber-200/80 mx-1 align-baseline shadow-2xs"
        >
          {inner}
        </span>
      );
    }

    // 4. Italic (*text*)
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const inner = part.slice(1, -1).trim();
      // If inner has parentheses e.g. (termasuk PB1 10%)
      if (inner.startsWith("(") && inner.endsWith(")")) {
        return (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-semibold text-[11px] border border-amber-200/80 mx-1 align-baseline shadow-2xs"
          >
            {inner.slice(1, -1)}
          </span>
        );
      }
      return (
        <em key={idx} className="italic text-zinc-700 font-normal">
          {inner}
        </em>
      );
    }

    // Remove any leftover stray asterisks so no raw '*' symbols show in UI
    const sanitized = part.replace(/\*/g, "");
    return <React.Fragment key={idx}>{sanitized}</React.Fragment>;
  });
}
