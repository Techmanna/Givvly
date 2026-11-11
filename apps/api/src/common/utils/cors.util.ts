/**
 * Determines whether an incoming HTTP Origin header is allowed to access the Givvly API.
 * Supports:
 * - Undefined origin (server-to-server, curl, mobile apps, webhooks)
 * - Configured origins from CORS_ORIGINS or APP_URL (with or without trailing slash)
 * - Givvly apex and subdomains (*.givvly.store, givvly.store)
 * - Vercel deployment preview domains (*.vercel.app)
 * - Render internal/preview domains (*.onrender.com)
 * - Localhost and loopback interfaces (localhost, 127.0.0.1) on any port
 */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  configuredOrigins: string[] = []
): boolean {
  if (!origin) {
    return true;
  }

  const normalized = origin.trim().replace(/\/+$/, "").toLowerCase();

  // 1. Configured origins list (case-insensitive and trimmed of trailing slashes)
  for (const raw of configuredOrigins) {
    if (!raw) continue;
    const clean = raw.trim().replace(/\/+$/, "").toLowerCase();
    if (clean && normalized === clean) {
      return true;
    }
  }

  // 2. Givvly domains and subdomains (givvly.store, www.givvly.store, admin.givvly.store, etc.)
  if (/^https?:\/\/([a-z0-9-]+\.)*givvly\.store$/i.test(normalized)) {
    return true;
  }

  // 3. Vercel deployment previews (*.vercel.app)
  if (/^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(normalized)) {
    return true;
  }

  // 4. Render deployments (*.onrender.com)
  if (/^https?:\/\/([a-z0-9-]+\.)*onrender\.com$/i.test(normalized)) {
    return true;
  }

  // 5. Localhost and loopback IPs on any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    return true;
  }

  return false;
}
