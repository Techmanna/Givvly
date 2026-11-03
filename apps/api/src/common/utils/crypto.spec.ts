import { encryptAesGcm, decryptAesGcm, hashString, hmacString } from "./crypto";

describe("Crypto Utils", () => {
  const hexKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("hashes strings deterministically with sha256", () => {
    const hash1 = hashString("password123");
    const hash2 = hashString("password123");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("creates HMAC hashes with secret key", () => {
    const hmac = hmacString("0123456789", "secret_key_123");
    expect(hmac).toHaveLength(64);
  });

  it("encrypts and decrypts bank account numbers with AES-256-GCM", () => {
    const plainAccountNumber = "0123456789";
    const encrypted = encryptAesGcm(plainAccountNumber, hexKey);

    expect(encrypted).toContain(":");
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptAesGcm(encrypted, hexKey);
    expect(decrypted).toBe(plainAccountNumber);
  });

  it("throws error when trying to decrypt tampered ciphertext", () => {
    const plain = "0987654321";
    const encrypted = encryptAesGcm(plain, hexKey);
    const parts = encrypted.split(":");
    // Invert the first character of the auth tag to guarantee verification failure
    parts[1] = (parts[1][0] === "a" ? "b" : "a") + parts[1].slice(1);
    const tampered = parts.join(":");

    expect(() => decryptAesGcm(tampered, hexKey)).toThrow();
  });
});

