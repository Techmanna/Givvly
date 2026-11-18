const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passcode",
  "pin",
  "secret",
  "token",
  "authorization",
  "cookie",
  "csrf",
  "signature",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
  "bvn",
  "nin",
  "cvv",
  "cardnumber",
  "card_number",
  "accountnumber",
  "account_number",
  "otp",
  "hash",
  "salt",
];

const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 10;
const MAX_STRING_LENGTH = 400;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function redactString(value: string): string {
  // Redact JWTs or Bearer strings even if stored under a non-sensitive key
  if (/^Bearer\s+/i.test(value)) {
    return "Bearer [REDACTED]";
  }
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    return "[REDACTED_JWT]";
  }
  if (value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}…[truncated ${value.length - MAX_STRING_LENGTH} chars]`;
  }
  return value;
}

/**
 * Recursively redacts sensitive fields (passwords, tokens, secrets, PINs, BVN/NIN,
 * cookies, signatures) and truncates oversized payloads for safe structured logging.
 */
export function sanitizeForLog(
  input: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (typeof input === "string") {
    return redactString(input);
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (typeof input === "bigint") {
    return input.toString();
  }
  if (input instanceof Date) {
    return input.toISOString();
  }
  if (Buffer.isBuffer(input)) {
    return `[Buffer ${input.length} bytes]`;
  }
  if (typeof input !== "object") {
    return String(input);
  }
  if (seen.has(input)) {
    return "[Circular]";
  }
  if (depth >= MAX_DEPTH) {
    return "[MaxDepth]";
  }

  seen.add(input);

  if (Array.isArray(input)) {
    const sliced = input
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForLog(item, depth + 1, seen));
    if (input.length > MAX_ARRAY_ITEMS) {
      sliced.push(`…[${input.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return sliced;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = sanitizeForLog(val, depth + 1, seen);
    }
  }
  return out;
}
