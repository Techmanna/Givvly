export interface GivvlyEmailTemplateOptions {
  title: string;
  bodyContent: string;
  appUrl?: string;
  badgeText?: string;
}

export interface GivvlyInvoiceItem {
  description: string;
  subtext?: string;
  qty: number;
  unitPriceFormatted: string;
  amountFormatted: string;
}

export interface GivvlyInvoiceData {
  invoiceNumber: string;
  reference: string;
  status: string;
  statusTone?: "success" | "warning" | "danger";
  issuedAt: string;
  billedToName: string;
  billedToEmail?: string;
  recipientName?: string;
  recipientContact?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  items: GivvlyInvoiceItem[];
  subtotalFormatted: string;
  wrappingFormatted?: string;
  deliveryFormatted?: string;
  vatFormatted?: string;
  platformFeeFormatted: string;
  totalFormatted: string;
  trackingUrl?: string;
  logoUrl?: string;
  autoPrint?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolvePublicAssetBase(appUrl?: string): string {
  const trimmed = (appUrl || "").trim().replace(/\/$/, "");
  if (!trimmed || trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
    return "https://www.givvly.store";
  }
  return trimmed;
}

export function renderGivvlyEmailHtml(options: GivvlyEmailTemplateOptions): string {
  const baseUrl = resolvePublicAssetBase(options.appUrl);
  const logoUrl = `${baseUrl}/images/givvly-logo.png`;
  const helpUrl = `${baseUrl}/help`;
  const safeTitle = escapeHtml(options.title);
  const badgeHtml = options.badgeText
    ? `<span style="display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:5px 12px;border-radius:999px;background:#F3E6DF;color:#B5495B;">${escapeHtml(options.badgeText)}</span>`
    : `<span style="display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:5px 12px;border-radius:999px;background:#F3E6DF;color:#B5495B;">Givvly</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF3EF;
      margin: 0;
      padding: 28px 16px;
      color: #332022;
      line-height: 1.6;
    }
    .email-frame {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #ECDCD6;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(51, 32, 34, 0.06);
    }
    .email-top-bar {
      height: 5px;
      background: linear-gradient(90deg, #B5495B 0%, #D4A959 50%, #B5495B 100%);
    }
    .email-header {
      padding: 24px 32px 18px;
      border-bottom: 1px solid #ECDCD6;
      background: #FFFDFC;
    }
    .email-body {
      padding: 32px;
      font-size: 15px;
      color: #332022;
    }
    .email-body h2 {
      font-family: "Fraunces", Georgia, serif;
      font-size: 22px;
      font-weight: 700;
      color: #332022;
      margin: 0 0 12px;
    }
    .email-body p {
      line-height: 1.6;
      margin: 0 0 16px;
      color: #5C474B;
    }
    .btn {
      display: inline-block;
      background-color: #B5495B;
      color: #FFFFFF !important;
      padding: 13px 28px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      margin-top: 8px;
    }
    .highlight-card {
      background: #FCF7F4;
      border: 1px solid #ECDCD6;
      border-radius: 14px;
      padding: 18px 20px;
      margin: 20px 0;
    }
    .email-footer {
      background: #FAF3EF;
      border-top: 1px solid #ECDCD6;
      padding: 22px 32px;
      text-align: center;
      font-size: 12px;
      color: #7A6468;
    }
    .email-footer a {
      color: #B5495B;
      text-decoration: none;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .email-header, .email-body, .email-footer {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-frame">
    <div class="email-top-bar"></div>
    <div class="email-header">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="left" valign="middle">
            <img src="${logoUrl}" alt="Givvly" height="42" style="height:42px;width:auto;display:block;border:0;" />
          </td>
          <td align="right" valign="middle">
            ${badgeHtml}
          </td>
        </tr>
      </table>
    </div>
    <div class="email-body">
      ${options.bodyContent}
    </div>
    <div class="email-footer">
      <p style="margin:0 0 6px;">
        Sent with care by <strong>Givvly</strong> &bull; <a href="${baseUrl}">givvly.store</a>
      </p>
      <p style="margin:0;">
        &copy; ${new Date().getFullYear()} Givvly Services. Need help? Visit <a href="${helpUrl}">givvly.store/help</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function renderGivvlyInvoiceHtml(data: GivvlyInvoiceData): string {
  const logoUrl = data.logoUrl || "https://www.givvly.store/images/givvly-logo.png";
  const tone = data.statusTone || "success";
  const statusStyles =
    tone === "danger"
      ? "background:#FDECEC;color:#C0392B;"
      : tone === "warning"
        ? "background:#FEF5E7;color:#B7791F;"
        : "background:#E8F5EE;color:#2E7D5B;";

  const itemsRowsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.description)}</strong>
          ${item.subtext ? `<span class="item-sub">${escapeHtml(item.subtext)}</span>` : ""}
        </td>
        <td>${item.qty}</td>
        <td>${escapeHtml(item.unitPriceFormatted)}</td>
        <td>${escapeHtml(item.amountFormatted)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Givvly Invoice — ${escapeHtml(data.invoiceNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: #FAF3EF;
      color: #332022;
      padding: 32px 16px;
      line-height: 1.55;
    }
    .invoice-sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #ECDCD6;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 18px 45px rgba(51, 32, 34, 0.07);
    }
    .invoice-accent {
      height: 6px;
      background: linear-gradient(90deg, #B5495B 0%, #D4A959 60%, #B5495B 100%);
    }
    .invoice-head {
      padding: 32px 36px 26px;
      border-bottom: 1px solid #ECDCD6;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      background: #FFFDFC;
    }
    .invoice-brand img {
      height: 48px;
      width: auto;
      object-fit: contain;
      display: block;
      margin-bottom: 8px;
    }
    .invoice-brand-meta { font-size: 12px; color: #7A6468; }
    .invoice-meta-right { text-align: right; }
    .invoice-title {
      font-family: "Fraunces", Georgia, serif;
      font-size: 22px;
      font-weight: 700;
      color: #332022;
    }
    .invoice-ref {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12.5px;
      color: #7A6468;
      margin-top: 4px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      ${statusStyles}
    }
    .invoice-parties {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 20px;
      padding: 24px 36px;
      background: #FCF7F4;
      border-bottom: 1px solid #ECDCD6;
    }
    .party-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #7A6468;
      margin-bottom: 6px;
    }
    .party-value { font-size: 14px; font-weight: 600; color: #332022; }
    .party-sub { font-size: 12.5px; color: #7A6468; margin-top: 2px; }
    .invoice-table-wrap { padding: 28px 36px 12px; }
    table.invoice-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    table.invoice-table th {
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #7A6468;
      padding: 0 0 12px;
      border-bottom: 1px solid #ECDCD6;
    }
    table.invoice-table th:last-child, table.invoice-table td:last-child { text-align: right; }
    table.invoice-table td {
      padding: 14px 0;
      border-bottom: 1px solid #F5EAE4;
      color: #332022;
    }
    .item-sub { display: block; font-size: 12px; color: #7A6468; margin-top: 2px; }
    .invoice-totals { padding: 12px 36px 32px; display: flex; justify-content: flex-end; }
    .totals-box { width: 100%; max-width: 320px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      font-size: 13.5px;
      color: #7A6468;
    }
    .totals-row.total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid #ECDCD6;
      font-size: 17px;
      font-weight: 700;
      color: #332022;
    }
    .totals-row.total span:last-child {
      color: #B5495B;
      font-family: "Fraunces", Georgia, serif;
      font-size: 20px;
    }
    .invoice-footer {
      background: #FAF3EF;
      border-top: 1px solid #ECDCD6;
      padding: 20px 36px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #7A6468;
    }
    .ledger-seal { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #332022; }
    .ledger-dot { width: 8px; height: 8px; border-radius: 50%; background: #2E7D5B; display: inline-block; }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .invoice-sheet { box-shadow: none; border: 1px solid #ECDCD6; }
    }
    @media (max-width: 600px) {
      .invoice-head, .invoice-parties, .invoice-table-wrap, .invoice-totals, .invoice-footer {
        padding-left: 20px; padding-right: 20px;
      }
      .invoice-meta-right { text-align: left; }
    }
  </style>
</head>
<body${data.autoPrint ? ' onload="window.print()"' : ""}>
  <div class="invoice-sheet">
    <div class="invoice-accent"></div>
    <div class="invoice-head">
      <div class="invoice-brand">
        <img src="${escapeHtml(logoUrl)}" alt="Givvly" />
        <div class="invoice-brand-meta">
          Givvly Celebrations &amp; Gifting Platform<br />
          support@givvly.store &bull; www.givvly.store
        </div>
      </div>
      <div class="invoice-meta-right">
        <div class="invoice-title">Official Invoice &amp; Receipt</div>
        <div class="invoice-ref">${escapeHtml(data.invoiceNumber)} &bull; Ref: ${escapeHtml(data.reference)}</div>
        <div class="status-badge">&#9679; ${escapeHtml(data.status)}</div>
      </div>
    </div>

    <div class="invoice-parties">
      <div>
        <div class="party-label">Billed To</div>
        <div class="party-value">${escapeHtml(data.billedToName)}</div>
        ${data.billedToEmail ? `<div class="party-sub">${escapeHtml(data.billedToEmail)}</div>` : ""}
      </div>
      ${
        data.recipientName
          ? `<div>
              <div class="party-label">Recipient &amp; Delivery</div>
              <div class="party-value">${escapeHtml(data.recipientName)}${data.recipientContact ? ` &bull; ${escapeHtml(data.recipientContact)}` : ""}</div>
              ${data.deliveryAddress ? `<div class="party-sub">${escapeHtml(data.deliveryAddress)}</div>` : ""}
            </div>`
          : ""
      }
      <div>
        <div class="party-label">Payment Details</div>
        <div class="party-value">${escapeHtml(data.paymentMethod)}</div>
        <div class="party-sub">${escapeHtml(data.issuedAt)}</div>
      </div>
    </div>

    <div class="invoice-table-wrap">
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="invoice-totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${escapeHtml(data.subtotalFormatted)}</span>
        </div>
        ${
          data.wrappingFormatted
            ? `<div class="totals-row"><span>Gift Wrapping</span><span>${escapeHtml(data.wrappingFormatted)}</span></div>`
            : ""
        }
        ${
          data.deliveryFormatted
            ? `<div class="totals-row"><span>Delivery &amp; Shipping</span><span>${escapeHtml(data.deliveryFormatted)}</span></div>`
            : ""
        }
        ${
          data.vatFormatted
            ? `<div class="totals-row"><span>VAT (7.5%)</span><span>${escapeHtml(data.vatFormatted)}</span></div>`
            : ""
        }
        <div class="totals-row">
          <span>Givvly Platform Fee</span>
          <span>${escapeHtml(data.platformFeeFormatted)}</span>
        </div>
        <div class="totals-row total">
          <span>Total Paid</span>
          <span>${escapeHtml(data.totalFormatted)}</span>
        </div>
      </div>
    </div>

    <div class="invoice-footer">
      <span class="ledger-seal">
        <span class="ledger-dot"></span>
        Verified by Givvly Double-Entry Ledger
      </span>
      ${
        data.trackingUrl
          ? `<span>Tracking: ${escapeHtml(data.trackingUrl)}</span>`
          : `<span>www.givvly.store</span>`
      }
    </div>
  </div>
</body>
</html>`.trim();
}
