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
 * using Groq Llama 3.2 Vision Model.
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

  const visionModels = [
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
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
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Kamu adalah AI Vision Inspector & Fraud Detector resmi di Havenso Cafe (Merchant: HASFALLENZ STORE).
Tugasmu adalah menganalisis gambar dan memvalidasi apakah gambar tersebut adalah BUKTI PEMBAYARAN / STRUK TRANSFER / M-BANKING / E-WALLET (SeaBank, BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay, QRIS) yang SAH dan ASLI.

Detail transaksi yang diharapkan:
- Target Penerima / Merchant: HASFALLENZ STORE / Havenso Cafe / QRIS
- Nominal Tagihan yang diharapkan: Rp ${expectedAmount} (atau toleransi pembulatan/biaya admin kecil)
- Meja: Meja ${tableNumber}

ATURAN STRICT:
1. Jika gambar adalah FOTO MANUSIA, SELFIE, ORANG, KELUARGA, HEWAN, MAKANAN, BARANG, MEME, SCREENSHOT CHAT WA, ATAU FOTO ACAK YANG BUKAN STRUK TRANSFER:
   -> WAJIB set "isValidReceipt": false
   -> Set "rejectionReason": "Gambar yang dikirimkan adalah foto pribadi/objek acak, bukan bukti transfer pembayaran QRIS"
2. Jika gambar adalah struk transfer tapi nominalnya jauh lebih kecil dari Rp ${expectedAmount}:
   -> Set "isValidReceipt": true, tapi "isAmountMatch": false
   -> Set "rejectionReason": "Nominal pada bukti transfer tidak sesuai dengan total tagihan"
3. Jika gambar adalah bukti transfer m-banking/e-wallet asli yang berhasil dan nominalnya sesuai:
   -> Set "isValidReceipt": true
   -> Set "isAmountMatch": true
   -> Set "transactionStatus": "SUCCESS"
   -> Set "isAuthentic": true
   -> Set "rejectionReason": null

Format output HANYA JSON:
{
  "isValidReceipt": boolean,
  "detectedBankOrWallet": string, // contoh: "SeaBank", "BCA Mobile", "DANA", "GoPay", "ShopeePay", "Mandiri Livin", "None"
  "detectedMerchant": string, // nama merchant/penerima yang tertera
  "detectedAmount": number, // angka nominal transfer
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
                  text: `Periksa bukti transfer ini untuk Meja ${tableNumber}. Total tagihan yang harus dibayar adalah Rp ${expectedAmount} ke merchant HASFALLENZ STORE.`,
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
        const parsed = JSON.parse(content);
        return {
          isValidReceipt: Boolean(parsed.isValidReceipt),
          detectedBankOrWallet: parsed.detectedBankOrWallet || "E-Wallet / Bank",
          detectedMerchant: parsed.detectedMerchant || "",
          detectedAmount: typeof parsed.detectedAmount === "number" ? parsed.detectedAmount : undefined,
          isAmountMatch: Boolean(parsed.isAmountMatch),
          transactionStatus: parsed.transactionStatus || "UNKNOWN",
          isAuthentic: Boolean(parsed.isAuthentic),
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

  // Fallback if vision models could not be reached:
  // Reject safety by default rather than blindly accepting random pictures
  return {
    isValidReceipt: false,
    isAmountMatch: false,
    transactionStatus: "UNKNOWN",
    isAuthentic: false,
    rejectionReason: "Tidak dapat memverifikasi visual struk pembayaran. Pastikan gambar jelas dan terang.",
  };
}
