import crypto from "crypto";

export interface DanaTransactionPayload {
  orderId: string;
  orderNumber: string;
  amount: number;
  tableNumber?: string;
  customerSessionId?: string;
}

/**
 * Formats standard RSA Private Key in PEM format from raw base64 string
 */
function formatPrivateKey(rawKey: string): string {
  if (rawKey.includes("-----BEGIN RSA PRIVATE KEY-----") || rawKey.includes("-----BEGIN PRIVATE KEY-----")) {
    return rawKey;
  }
  // Standard PKCS#8 or PKCS#1 PEM wrapper
  return `-----BEGIN PRIVATE KEY-----\n${rawKey.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;
}

/**
 * Formats standard RSA Public Key in PEM format from raw base64 string
 */
function formatPublicKey(rawKey: string): string {
  if (rawKey.includes("-----BEGIN PUBLIC KEY-----")) {
    return rawKey;
  }
  return `-----BEGIN PUBLIC KEY-----\n${rawKey.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;
}

/**
 * Generates DANA SHA256withRSA Digital Signature
 */
export function generateDanaSignature(dataToSign: string, privateKeyRaw: string): string {
  try {
    const pemKey = formatPrivateKey(privateKeyRaw);
    const signer = crypto.createSign("SHA256");
    signer.update(dataToSign);
    signer.end();
    return signer.sign(pemKey, "base64");
  } catch (e) {
    console.error("Error generating DANA signature:", e);
    return "";
  }
}

/**
 * Verifies DANA SHA256withRSA Digital Signature from incoming Webhook
 */
export function verifyDanaSignature(dataToVerify: string, signature: string, publicKeyRaw: string): boolean {
  try {
    const pemKey = formatPublicKey(publicKeyRaw);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(dataToVerify);
    verifier.end();
    return verifier.verify(pemKey, signature, "base64");
  } catch (e) {
    console.error("Error verifying DANA signature:", e);
    return false;
  }
}

/**
 * Helper to get active DANA config from environment
 */
export function getDanaConfig() {
  return {
    apiUrl: process.env.DANA_API_URL || "https://api.sandbox.dana.id",
    merchantId: process.env.DANA_MERCHANT_ID || "",
    clientId: process.env.DANA_CLIENT_ID || "",
    clientSecret: process.env.DANA_CLIENT_SECRET || "",
    publicKey: process.env.DANA_PUBLIC_KEY || "",
    privateKey: process.env.DANA_PRIVATE_KEY || "",
  };
}
