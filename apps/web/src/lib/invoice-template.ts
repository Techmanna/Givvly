export interface GivvlyInvoiceLineItem {
  description: string;
  subtext?: string;
  qty?: number;
  unitPrice?: string;
  amount: string;
}

export interface GivvlyInvoicePrintData {
  title?: string;
  invoiceNumber: string;
  reference: string;
  status: string;
  issuedAt: string;
  billedToName: string;
  billedToSub?: string;
  recipientName?: string;
  recipientSub?: string;
  paymentMethod?: string;
  items: GivvlyInvoiceLineItem[];
  totals: Array<{ label: string; value: string; isTotal?: boolean }>;
  footerNote?: string;
  logoUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildGivvlyInvoiceHtml(data: GivvlyInvoicePrintData): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.givvly.store";
  const logoUrl = data.logoUrl || `${origin}/images/givvly-logo.png`;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.description)}</strong>
          ${item.subtext ? `<span class="item-sub">${escapeHtml(item.subtext)}</span>` : ""}
        </td>
        <td>${item.qty ?? 1}</td>
        <td>${escapeHtml(item.unitPrice ?? item.amount)}</td>
        <td>${escapeHtml(item.amount)}</td>
      </tr>`
    )
    .join("");

  const totalsHtml = data.totals
    .map(
      (row) => `
      <div class="totals-row${row.isTotal ? " total" : ""}">
        <span>${escapeHtml(row.label)}</span>
        <span>${escapeHtml(row.value)}</span>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Givvly Receipt - ${escapeHtml(data.invoiceNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: #FAF3EF;
      color: #332022;
      padding: 28px 16px;
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
      background: #E8F5EE;
      color: #2E7D5B;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
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
  </style>
</head>
<body onload="setTimeout(function(){ window.print(); }, 250);">
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
        <div class="invoice-title">${escapeHtml(data.title || "Official Invoice & Receipt")}</div>
        <div class="invoice-ref">${escapeHtml(data.invoiceNumber)} &bull; Ref: ${escapeHtml(data.reference)}</div>
        <div class="status-badge">&#9679; ${escapeHtml(data.status)}</div>
      </div>
    </div>

    <div class="invoice-parties">
      <div>
        <div class="party-label">Account / Billed To</div>
        <div class="party-value">${escapeHtml(data.billedToName)}</div>
        ${data.billedToSub ? `<div class="party-sub">${escapeHtml(data.billedToSub)}</div>` : ""}
      </div>
      ${
        data.recipientName
          ? `<div>
              <div class="party-label">Recipient &amp; Delivery</div>
              <div class="party-value">${escapeHtml(data.recipientName)}</div>
              ${data.recipientSub ? `<div class="party-sub">${escapeHtml(data.recipientSub)}</div>` : ""}
            </div>`
          : ""
      }
      <div>
        <div class="party-label">Transaction Details</div>
        <div class="party-value">${escapeHtml(data.paymentMethod || "Givvly Platform")}</div>
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
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="invoice-totals">
      <div class="totals-box">
        ${totalsHtml}
      </div>
    </div>

    <div class="invoice-footer">
      <span class="ledger-seal">
        <span class="ledger-dot"></span>
        Verified by Givvly Double-Entry Ledger
      </span>
      <span>${escapeHtml(data.footerNote || "www.givvly.store")}</span>
    </div>
  </div>
</body>
</html>`;
}
