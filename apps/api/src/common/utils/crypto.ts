import * as crypto from "crypto";

export function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hmacString(value: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(value).digest("hex");
}

/**
 * Encrypt sensitive bank account numbers using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex)
 */
export function encryptAesGcm(text: string, hexKey: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(hexKey, "hex");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt AES-256-GCM ciphertext
 */
export function decryptAesGcm(encryptedPayload: string, hexKey: string): string {
  const [ivHex, tagHex, dataHex] = encryptedPayload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const key = Buffer.from(hexKey, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

