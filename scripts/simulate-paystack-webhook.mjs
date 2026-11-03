import crypto from "node:crypto";

const API_BASE = "http://localhost:4000/api/v1";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret_key";

console.log("═════════════════════════════════════════════════════════════════════");
console.log("   GIVVLY - OPTION 2: PAYMENT WEBHOOK SIMULATION & FINANCIAL RECON   ");
console.log("═════════════════════════════════════════════════════════════════════");

function computeHmacSha512(payloadString, secret = PAYSTACK_SECRET) {
  return crypto.createHmac("sha512", secret).update(payloadString).digest("hex");
}

async function sendWebhook(bodyObj, overrideSignature = null) {
  const bodyString = JSON.stringify(bodyObj);
  const signature = overrideSignature !== null ? overrideSignature : computeHmacSha512(bodyString);

  const res = await fetch(`${API_BASE}/webhooks/paystack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature,
    },
    body: bodyString,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, body: json };
}

async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status}`);
  }
  const cookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
  const cookieStr = cookieHeaders.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json();
  return { cookie: cookieStr, user: json.data?.user || json.user };
}

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate Admin and Host
  console.log("\n--- STEP 0: Authentication for Operations & Verification ---");
  const { cookie: adminCookie } = await loginUser("admin@givvly.ng", "Password123!");
  assert(Boolean(adminCookie), "Admin authenticated successfully (admin@givvly.ng)");

  const { cookie: hostCookie, user: hostUser } = await loginUser("adaobi@givvly.ng", "Password123!");
  assert(Boolean(hostCookie), `Celebration Host authenticated successfully (${hostUser.email})`);

  // -------------------------------------------------------------
  // TEST 1: Security Invariant - Invalid HMAC-SHA512 Signature
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Security Invariant - Invalid HMAC-SHA512 Signature ---");
  const invalidSigPayload = {
    event: "charge.success",
    data: { reference: "fake_ref_12345", amount: 500000 },
  };
  const invalidSigRes = await sendWebhook(invalidSigPayload, "deadbeef_invalid_signature_1234567890abcdef");
  assert(
    invalidSigRes.status === 401,
    `Rejects forged webhook with 401 Unauthorized (got HTTP ${invalidSigRes.status})`
  );

  // -------------------------------------------------------------
  // TEST 2: Security Invariant - Amount Mismatch Rejection
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Security Invariant - Amount Mismatch Rejection ---");
  const catRes = await fetch(`${API_BASE}/catalog/products?limit=1`);
  const catData = await catRes.json();
  const testProduct = (catData.data?.items || catData.items || [])[0];
  const testProductId = testProduct?.id || "c55847a5-886a-4c95-920a-bf2e0075e4b0";

  const orderPayload = {
    items: [{ productId: testProductId, qty: 1 }],
    buyerEmail: "shopper@givvly.ng",
    recipient: {
      name: "Emeka Chidi",
      phone: "+2348011223344",
      email: "emeka@example.com",
    },
    address: {
      street: "123 Victoria Island",
      area: "VI",
      city: "Lagos",
      state: "Lagos",
    },
  };

  const createOrderRes = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload),
  });
  const orderResJson = await createOrderRes.json();
  const orderData = orderResJson.data || orderResJson;
  const testOrderNumber = orderData.order?.number;
  const testPaymentRef = orderData.payment?.reference || orderData.reference;
  const expectedAmountKobo = orderData.payment?.amountKobo || orderData.order?.totalKobo;

  console.log(`  Order created: ${testOrderNumber}, paymentRef: ${testPaymentRef}, expected: ₦${(expectedAmountKobo / 100).toLocaleString()}`);
  assert(Boolean(testPaymentRef), `Order created with valid payment reference: ${testPaymentRef}`);

  // Send webhook with tampered amount (underpaying by half)
  const tamperedAmountPayload = {
    event: "charge.success",
    data: {
      reference: testPaymentRef,
      amount: Math.floor(expectedAmountKobo / 2),
      currency: "NGN",
      channel: "card",
      status: "success",
      paid_at: new Date().toISOString(),
    },
  };
  const underpayRes = await sendWebhook(tamperedAmountPayload);
  assert(
    !underpayRes.ok,
    `Security invariant: Rejects underpaid transaction (HTTP ${underpayRes.status})`
  );

  // -------------------------------------------------------------
  // TEST 3: Direct Order Payment Capture (charge.success)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Direct Order Payment Capture (charge.success) ---");
  const legitimateOrderPayload = {
    event: "charge.success",
    data: {
      reference: testPaymentRef,
      amount: expectedAmountKobo,
      currency: "NGN",
      channel: "card",
      fees: 15000,
      status: "success",
      paid_at: new Date().toISOString(),
    },
  };

  const captureRes = await sendWebhook(legitimateOrderPayload);
  const captureBody = captureRes.body?.data || captureRes.body;
  assert(
    captureRes.ok && captureBody?.processed === true,
    `Processes legitimate charge.success webhook (HTTP ${captureRes.status})`
  );

  // Verify order transitioned to CONFIRMED
  const trackRes = await fetch(`${API_BASE}/public/track/${orderData.order?.trackingToken}`);
  const trackJson = await trackRes.json();
  const trackData = trackJson.data || trackJson;
  const resolvedStatus = trackData.status || trackData.order?.status;
  assert(
    resolvedStatus === "CONFIRMED",
    `Order status transitioned to CONFIRMED (actual: ${resolvedStatus})`
  );

  // -------------------------------------------------------------
  // TEST 4: Webhook Idempotency Replay Invariant
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Webhook Idempotency Replay Invariant ---");
  const replayRes = await sendWebhook(legitimateOrderPayload);
  const replayBody = replayRes.body?.data || replayRes.body;
  assert(
    replayRes.ok && replayBody?.alreadyProcessed === true,
    `Idempotent replay detected & duplicate execution prevented (alreadyProcessed: true)`
  );

  // -------------------------------------------------------------
  // TEST 5: Cash Gift to Celebration Pool & Payout Queue
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Cash Gift to Celebration Pool & Payout Queue ---");
  const giftAmountKobo = 4000000; // ₦40,000
  const giftInitRes = await fetch(`${API_BASE}/public/events/adaobi-and-chidi-2026/gifts/money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountKobo: giftAmountKobo,
      currency: "NGN",
      giverName: "Dr. Kalu",
      giverEmail: "kalu@example.com",
      message: "Congratulations to the newest couple in town! May peace abide with you.",
      isAnonymous: false,
      showOnWall: true,
    }),
  });

  const giftInitJson = await giftInitRes.json();
  const giftData = giftInitJson.data || giftInitJson;
  const giftPaymentRef = giftData.reference;
  const giftTotalKobo = giftData.totalKobo || giftData.amountKobo;
  const expectedPayoutRef = `payout_${giftData.giftId.replace(/-/g, "")}`;
  console.log(`  Gift initialized: ref=${giftPaymentRef}, giftId=${giftData.giftId}, totalKobo=₦${(giftTotalKobo / 100).toLocaleString()}`);
  console.log(`  Expected Host Payout Reference: ${expectedPayoutRef}`);

  const giftWebhookPayload = {
    event: "charge.success",
    data: {
      reference: giftPaymentRef,
      amount: giftTotalKobo,
      currency: "NGN",
      channel: "card",
      fees: 60000,
      status: "success",
      paid_at: new Date().toISOString(),
    },
  };

  const giftWebhookRes = await sendWebhook(giftWebhookPayload);
  const giftWebhookData = giftWebhookRes.body?.data || giftWebhookRes.body;
  assert(
    giftWebhookRes.ok && giftWebhookData?.processed === true,
    `Processes gift contribution webhook (HTTP ${giftWebhookRes.status})`
  );

  // Verify payment status
  const paymentStatusRes = await fetch(`${API_BASE}/payments/${giftPaymentRef}`);
  const paymentStatusJson = await paymentStatusRes.json();
  const paymentStatusData = paymentStatusJson.data || paymentStatusJson;
  assert(
    paymentStatusData.status === "SUCCESS",
    `Gift payment status confirmed SUCCESS`
  );

  // Verify host payout was queued
  const hostPayoutsRes = await fetch(`${API_BASE}/payouts`, {
    headers: { Cookie: hostCookie },
  });
  const hostPayoutsJson = await hostPayoutsRes.json();
  const hostPayoutsList = hostPayoutsJson.data || hostPayoutsJson;
  const queuedPayout = (Array.isArray(hostPayoutsList) ? hostPayoutsList : []).find(
    (p) => p.reference === expectedPayoutRef
  );
  assert(
    Boolean(queuedPayout) && queuedPayout.status === "QUEUED",
    `Host payout automatically queued (ref: ${expectedPayoutRef}, status: ${queuedPayout?.status}, amount: ₦${((queuedPayout?.amountKobo || 0) / 100).toLocaleString()})`
  );

  // -------------------------------------------------------------
  // TEST 6: Host Payout Transfer Fulfillment (transfer.success)
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Host Payout Transfer Fulfillment (transfer.success) ---");
  const transferPayload = {
    event: "transfer.success",
    data: {
      reference: expectedPayoutRef,
      amount: giftAmountKobo,
      currency: "NGN",
      transferred_at: new Date().toISOString(),
    },
  };

  const transferRes = await sendWebhook(transferPayload);
  const transferBody = transferRes.body?.data || transferRes.body;
  assert(
    transferRes.ok && transferBody?.processed === true,
    `Processes transfer.success for host payout ${expectedPayoutRef}`
  );

  // Verify payout status updated to SUCCESS in host history
  const updatedHostPayoutsRes = await fetch(`${API_BASE}/payouts`, {
    headers: { Cookie: hostCookie },
  });
  const updatedHostPayoutsJson = await updatedHostPayoutsRes.json();
  const updatedHostPayoutsList = updatedHostPayoutsJson.data || updatedHostPayoutsJson;
  const completedPayout = (Array.isArray(updatedHostPayoutsList) ? updatedHostPayoutsList : []).find(
    (p) => p.reference === expectedPayoutRef
  );
  assert(
    completedPayout?.status === "SUCCESS",
    `Host payout status transitioned to SUCCESS (completedAt: ${completedPayout?.completedAt})`
  );

  // -------------------------------------------------------------
  // TEST 7: Financial Ledger Double-Entry Reconciliation
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Financial Ledger Double-Entry Reconciliation ---");
  const ledgerReportRes = await fetch(`${API_BASE}/admin/ledger`, {
    headers: { Cookie: adminCookie },
  });

  assert(ledgerReportRes.ok, `Admin ledger report accessible (HTTP ${ledgerReportRes.status})`);
  const ledgerReportJson = await ledgerReportRes.json();
  const ledgerReport = ledgerReportJson.data || ledgerReportJson;

  console.log("  Trial Balance Summary:");
  console.log(`    Total Debits:  ₦${(ledgerReport.trialBalance.totalDebit / 100).toLocaleString()}`);
  console.log(`    Total Credits: ₦${(ledgerReport.trialBalance.totalCredit / 100).toLocaleString()}`);
  console.log(`    Is Balanced:   ${ledgerReport.trialBalance.isBalanced}`);
  console.log(`    Recent Entries Count: ${ledgerReport.recentEntries?.length}`);

  assert(
    ledgerReport.trialBalance.isBalanced === true,
    `Trial Balance IS BALANCED (Total Debits === Total Credits)`
  );
  assert(
    ledgerReport.trialBalance.totalDebit === ledgerReport.trialBalance.totalCredit,
    `Net financial disparity is strictly 0 kobo (Zero-Leakage Assurance)`
  );
  assert(
    ledgerReport.recentEntries?.length >= 5,
    `Double-entry audit log contains all required postings (${ledgerReport.recentEntries?.length} entries recorded)`
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n═════════════════════════════════════════════════════════════════════");
  console.log(`   OPTION 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("═════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in webhook simulation:", err);
  process.exit(1);
});
