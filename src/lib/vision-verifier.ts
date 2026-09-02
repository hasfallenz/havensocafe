export interface ReceiptVerificationResult {
  isValidReceipt: boolean;
  detectedBankOrWallet?: string;
  detectedMerchant?: string;
  detectedAmount?: number;
  isAmountMatch: boolean;
  transactionStatus: "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN";
  isAuthentic: boolean;
  rejectionReason: string | null;
  rawAnalysis?: string;
}

/**
 * Validates whether an uploaded image is a legitimate payment transfer receipt (M-Banking/E-Wallet/QRIS)
 * using Groq Vision Multimodal Models (qwen3.8-27b / qwen3.6-27b).
 * Strictly detects and rejects fake images, selfies, random photos, memes, wrong amounts, or fake edits.
 */
export async function verifyPaymentReceiptWithVision(
  imageUrl: string,
  expectedAmount: number,
  tableNumber: string = "A1"
): Promise<ReceiptVerificationResult> {
  const apiKey = process.env.GROQ_API_KEY || "";

  if (!apiKey) {
    console.warn("GROQ_API_KEY is not set for Vision Verification");
    return {
      isValidReceipt: false,
      isAmountMatch: false,
      transactionStatus: "UNKNOWN",
      isAuthentic: false,
      rejectionReason: "Sistem verifikasi AI sedang tidak tersedia (API Key missing).",
    };
  }

  // Ensure imageUrl is a valid data URL or http URL
  if (!imageUrl || (!imageUrl.startsWith("data:image/") && !imageUrl.startsWith("http"))) {
    return {
      isValidReceipt: false,
      isAmountMatch: false,
      transactionStatus: "UNKNOWN",
      isAuthentic: false,
      rejectionReason: "Format gambar tidak valid atau rusak.",
    };
  }

  // Active production vision models on Groq
  const visionModels = [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
  ];

  for (const model of visionModels) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 600,
          messages: [
            {
              role: "system",
              content: `Kamu adalah AI Vision Inspector & Fraud Detector resmi di Havenso Cafe (Merchant: HASFALLENZ STORE / Dana / QRIS).
Tugasmu adalah menganalisis gambar dan memvalidasi apakah gambar tersebut adalah BUKTI PEMBAYARAN / STRUK TRANSFER / M-BANKING / E-WALLET (DANA, SeaBank, BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, LinkAja, Bank Jago, NeoBank, QRIS Nasional) yang SAH, ASLI, dan BUKAN HASIL EDITAN.

Detail transaksi yang diharapkan:
- Target Penerima / Acquirer / Merchant: HASFALLENZ STORE / Havenso Cafe / Dana / QRIS
- Nominal Tagihan yang diharapkan: Rp ${expectedAmount} (atau toleransi kecil pembulatan)
- Meja: Meja ${tableNumber}

ATURAN STRICT FRAUD DETECTION:
1. DETEKSI BUKAN STRUK:
   - Jika gambar adalah FOTO MANUSIA, SELFIE, ORANG, KELUARGA, HEWAN, MAKANAN, BARANG, MEME, SCREENSHOT CHAT WA, ATAU FOTO ACAK:
     -> WAJIB set "isValidReceipt": false
     -> Set "rejectionReason": "Gambar yang dikirimkan adalah foto pribadi / bukan bukti transfer pembayaran QRIS"
2. DETEKSI STRUK PALSU / EDITAN:
   - Jika terlihat editan teks/angka yang ditempel (font tidak seragam, pixel buram di bagian nominal, crop kasar, editan Canva/Photoshop):
     -> WAJIB set "isValidReceipt": false
     -> Set "isAuthentic": false
     -> Set "rejectionReason": "Bukti transfer terindikasi manipulasi / editan grafis yang tidak valid"
3. DETEKSI NOMINAL TIDAK SESUAI:
   - Jika struk asli dari bank/e-wallet manapun tapi nominal transfernya tidak sesuai dengan tagihan Rp ${expectedAmount}:
     -> Set "isValidReceipt": true, tapi "isAmountMatch": false
     -> Set "rejectionReason": "Nominal pada bukti transfer tidak sesuai dengan total tagihan pesanan"
4. BUKTI TRANSFER ASLI & SAH DARI BANK/E-WALLET MANAPUN:
   - Jika gambar adalah bukti transfer asli yang sukses (baik dari DANA, SeaBank, BCA, Mandiri, BRI, BNI, GoPay, ShopeePay, OVO, dll) dengan nominal yang sesuai:
     -> Set "isValidReceipt": true
     -> Set "isAmountMatch": true
     -> Set "transactionStatus": "SUCCESS"
     -> Set "isAuthentic": true
     -> Set "rejectionReason": null

Format output HANYA JSON murni:
{
  "isValidReceipt": boolean,
  "detectedBankOrWallet": string, // contoh: "DANA", "SeaBank", "BCA Mobile", "GoPay", "ShopeePay", "Mandiri Livin", "BRImo", "BNI", "Bank Jago", "None"
  "detectedMerchant": string, // nama merchant/acquirer/penerima yang tertera di struk
  "detectedAmount": number, // angka nominal rupiah transfer yang tertera di struk
  "isAmountMatch": boolean,
  "transactionStatus": "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN",
  "isAuthentic": boolean,
  "rejectionReason": string | null
}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Periksa bukti transfer ini untuk Meja ${tableNumber}. Total tagihan yang harus dibayar adalah Rp ${expectedAmount} ke merchant HASFALLENZ STORE / Dana.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Vision model ${model} failed (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      try {
        // Extract JSON string even if enclosed in markdown code fences
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const parsed = JSON.parse(jsonStr);

        return {
          isValidReceipt: Boolean(parsed.isValidReceipt),
          detectedBankOrWallet: parsed.detectedBankOrWallet || "E-Wallet / Bank",
          detectedMerchant: parsed.detectedMerchant || "",
          detectedAmount: typeof parsed.detectedAmount === "number" ? parsed.detectedAmount : undefined,
          isAmountMatch: Boolean(parsed.isAmountMatch),
          transactionStatus: parsed.transactionStatus || "UNKNOWN",
          isAuthentic: Boolean(parsed.isAuthentic ?? parsed.isValidReceipt),
          rejectionReason: parsed.rejectionReason || null,
          rawAnalysis: content,
        };
      } catch (parseErr) {
        console.error("Failed to parse Vision JSON response:", parseErr, content);
      }
    } catch (err) {
      console.warn(`Error running vision model ${model}:`, err);
    }
  }

  // Fallback safety
  return {
    isValidReceipt: false,
    isAmountMatch: false,
    transactionStatus: "UNKNOWN",
    isAuthentic: false,
    rejectionReason: "Tidak dapat memverifikasi visual struk pembayaran. Pastikan gambar jelas dan terang.",
  };
}
