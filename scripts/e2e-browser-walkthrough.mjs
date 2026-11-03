import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:4000/api/v1";
const CHROMIUM_PATH = "/opt/homebrew/bin/chromium";

const results = [];

function record(suite, step, passed, details = "") {
  results.push({ suite, step, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${suite}] ${step} ${details ? `(${details})` : ""}`);
}

async function runWalkthrough() {
  console.log("=================================================");
  console.log("   GIVVLY COMPREHENSIVE E2E BROWSER WALKTHROUGH  ");
  console.log(`   Target Frontend: ${BASE_URL}                  `);
  console.log(`   Target API:      ${API_URL}                   `);
  console.log(`   Engine:          ${CHROMIUM_PATH}             `);
  console.log("=================================================\n");

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const pageErrors = [];

  try {
    // -------------------------------------------------------------
    // JOURNEY 1: Public Guest Experience
    // -------------------------------------------------------------
    console.log("\n--- JOURNEY 1: Public Guest Experience ---");
    const guestContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-NG",
      timezoneId: "Africa/Lagos",
    });
    const guestPage = await guestContext.newPage();

    guestPage.on("pageerror", (err) => {
      console.error("  [Browser PageError]:", err.message);
      pageErrors.push(`[Guest] ${err.message}`);
    });

    // 1.1 Celebration Details Page
    const celebRes = await guestPage.goto(`${BASE_URL}/e/adaobi-and-chidi-2026`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Public Guest",
      "GET /e/adaobi-and-chidi-2026",
      celebRes?.status() === 200,
      `Status: ${celebRes?.status()}`
    );

    await guestPage.waitForSelector("h1, h2, main");
    const celebContent = await guestPage.content();
    const hasHosts =
      celebContent.includes("Adaobi") || celebContent.includes("Chidi");
    record(
      "Public Guest",
      "Celebration Header Rendered",
      hasHosts,
      "Found Adaobi/Chidi in DOM"
    );

    // 1.2 Celebrations Directory
    const dirRes = await guestPage.goto(`${BASE_URL}/celebrations`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Public Guest",
      "GET /celebrations",
      dirRes?.status() === 200,
      `Status: ${dirRes?.status()}`
    );

    // 1.3 Gift Catalog Browsing
    const catalogRes = await guestPage.goto(`${BASE_URL}/gifts`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Public Guest",
      "GET /gifts (Catalog)",
      catalogRes?.status() === 200,
      `Status: ${catalogRes?.status()}`
    );

    // 1.4 Public Logistics Tracking
    const trackRes = await guestPage.goto(
      `${BASE_URL}/track/trk_2026_001_deliv`,
      { waitUntil: "domcontentloaded" }
    );
    record(
      "Public Guest",
      "GET /track/trk_2026_001_deliv",
      trackRes?.status() === 200,
      `Status: ${trackRes?.status()}`
    );

    await guestPage.waitForSelector("h1, main");
    const trackContent = await guestPage.content();
    const hasTrackTitle = trackContent.includes("Gift Delivery Tracking");
    record(
      "Public Guest",
      "Tracking Page Rendered",
      hasTrackTitle,
      "Found 'Gift Delivery Tracking'"
    );

    await guestContext.close();

    // -------------------------------------------------------------
    // JOURNEY 2: Direct Gift Checkout & Confirmation
    // -------------------------------------------------------------
    console.log("\n--- JOURNEY 2: Direct Gift Checkout & Confirmation ---");
    const checkoutContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-NG",
      timezoneId: "Africa/Lagos",
    });
    const checkoutPage = await checkoutContext.newPage();
    checkoutPage.on("pageerror", (err) => {
      console.error("  [Browser PageError]:", err.message);
      pageErrors.push(`[Checkout] ${err.message}`);
    });

    // 2.1 Single Product Checkout Page
    const singleCheckoutRes = await checkoutPage.goto(
      `${BASE_URL}/checkout/givvly-bite-2q5k`,
      { waitUntil: "domcontentloaded" }
    );
    record(
      "Direct Checkout",
      "GET /checkout/givvly-bite-2q5k",
      singleCheckoutRes?.status() === 200,
      `Status: ${singleCheckoutRes?.status()}`
    );

    // 2.2 Combo Gift Box Checkout Page
    const boxCheckoutRes = await checkoutPage.goto(`${BASE_URL}/checkout/box`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Direct Checkout",
      "GET /checkout/box",
      boxCheckoutRes?.status() === 200,
      `Status: ${boxCheckoutRes?.status()}`
    );

    // 2.3 Checkout Success Screen (Public Access)
    const successRes = await checkoutPage.goto(
      `${BASE_URL}/checkout/success?orderId=a07f5973-9173-4043-8e8e-5356b415ee13`,
      { waitUntil: "domcontentloaded" }
    );
    record(
      "Direct Checkout",
      "GET /checkout/success (Public Confirmation)",
      successRes?.status() === 200,
      `Status: ${successRes?.status()}`
    );

    await checkoutPage.waitForSelector("h1, h2");
    const successContent = await checkoutPage.content();
    const hasConfirmedMsg =
      successContent.includes("Gift Order Confirmed") ||
      successContent.includes("Track Order");
    record(
      "Direct Checkout",
      "Order Confirmation Message Rendered",
      hasConfirmedMsg,
      "Found confirmation header"
    );

    await checkoutContext.close();

    // -------------------------------------------------------------
    // JOURNEY 3: Celebration Host Hub
    // -------------------------------------------------------------
    console.log("\n--- JOURNEY 3: Celebration Host Hub ---");
    const hostContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-NG",
      timezoneId: "Africa/Lagos",
    });
    const hostPage = await hostContext.newPage();
    hostPage.on("pageerror", (err) => {
      console.error("  [Browser PageError]:", err.message);
      pageErrors.push(`[Host] ${err.message}`);
    });

    hostPage.on("console", (msg) => {
      console.log("  [Host Console]:", msg.type(), msg.text());
    });
    hostPage.on("response", (resp) => {
      if (resp.url().includes("/auth/")) {
        console.log("  [Host Response]:", resp.status(), resp.url());
      }
    });

    // 3.1 Host Login (adaobi@givvly.ng)
    await hostPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await hostPage.fill('input[type="email"]', "adaobi@givvly.ng");
    await hostPage.fill('input[type="password"]', "Password123!");
    await hostPage.click('button[type="submit"]');

    await hostPage.waitForURL("**/dashboard", { timeout: 10000 });
    record("Host Hub", "Host Login (adaobi@givvly.ng)", true, "Redirected to /dashboard");

    // 3.2 Host Dashboard
    const dashRes = await hostPage.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /dashboard",
      dashRes?.status() === 200,
      `Status: ${dashRes?.status()}`
    );

    // 3.3 Create Event Wizard
    const newEventRes = await hostPage.goto(`${BASE_URL}/events/new`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /events/new (Wizard)",
      newEventRes?.status() === 200,
      `Status: ${newEventRes?.status()}`
    );

    // 3.4 Account Profile
    const profileRes = await hostPage.goto(`${BASE_URL}/account`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /account (Profile)",
      profileRes?.status() === 200,
      `Status: ${profileRes?.status()}`
    );

    // 3.5 Account Notification Channels
    const notifRes = await hostPage.goto(`${BASE_URL}/account/notifications`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /account/notifications",
      notifRes?.status() === 200,
      `Status: ${notifRes?.status()}`
    );

    // 3.6 Account Security & Password
    const secRes = await hostPage.goto(`${BASE_URL}/account/security`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /account/security",
      secRes?.status() === 200,
      `Status: ${secRes?.status()}`
    );

    // 3.7 Account Payout Account (NUBAN)
    const payoutRes = await hostPage.goto(`${BASE_URL}/account/payout`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Host Hub",
      "GET /account/payout (Bank Setup)",
      payoutRes?.status() === 200,
      `Status: ${payoutRes?.status()}`
    );

    await hostContext.close();

    // -------------------------------------------------------------
    // JOURNEY 4: Admin Operations Console
    // -------------------------------------------------------------
    console.log("\n--- JOURNEY 4: Admin Operations Console ---");
    const adminContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-NG",
      timezoneId: "Africa/Lagos",
    });
    const adminPage = await adminContext.newPage();
    adminPage.on("pageerror", (err) => {
      console.error("  [Browser PageError]:", err.message);
      pageErrors.push(`[Admin] ${err.message}`);
    });

    // 4.1 Admin Login
    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await adminPage.fill('input[type="email"]', "admin@givvly.ng");
    await adminPage.fill('input[type="password"]', "Password123!");
    await adminPage.click('button[type="submit"]');

    await adminPage.waitForURL("**/admin", { timeout: 10000 });
    record("Admin Console", "Admin Login (admin@givvly.ng)", true, "Redirected to /admin");

    // 4.2 Admin Console Home
    const adminHomeRes = await adminPage.goto(`${BASE_URL}/admin`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin (Console Home)",
      adminHomeRes?.status() === 200,
      `Status: ${adminHomeRes?.status()}`
    );

    // 4.3 Orders & Fulfillment
    const adminOrdersRes = await adminPage.goto(`${BASE_URL}/admin/orders`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/orders (Fulfillment)",
      adminOrdersRes?.status() === 200,
      `Status: ${adminOrdersRes?.status()}`
    );

    // 4.4 Products & Inventory
    const adminProductsRes = await adminPage.goto(`${BASE_URL}/admin/products`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/products (Catalog)",
      adminProductsRes?.status() === 200,
      `Status: ${adminProductsRes?.status()}`
    );

    // 4.5 Balanced Double-Entry Ledger
    const adminLedgerRes = await adminPage.goto(`${BASE_URL}/admin/ledger`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/ledger (Balanced Ledger)",
      adminLedgerRes?.status() === 200,
      `Status: ${adminLedgerRes?.status()}`
    );

    // 4.6 Wall of Love Moderation
    const adminModRes = await adminPage.goto(`${BASE_URL}/admin/moderation`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/moderation (Wall Posts)",
      adminModRes?.status() === 200,
      `Status: ${adminModRes?.status()}`
    );

    // 4.7 Customer Disputes
    const adminDisputesRes = await adminPage.goto(`${BASE_URL}/admin/disputes`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/disputes (Resolutions)",
      adminDisputesRes?.status() === 200,
      `Status: ${adminDisputesRes?.status()}`
    );

    // 4.8 Events Directory
    const adminEventsRes = await adminPage.goto(`${BASE_URL}/admin/events`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/events",
      adminEventsRes?.status() === 200,
      `Status: ${adminEventsRes?.status()}`
    );

    // 4.9 User Accounts Directory
    const adminUsersRes = await adminPage.goto(`${BASE_URL}/admin/users`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/users",
      adminUsersRes?.status() === 200,
      `Status: ${adminUsersRes?.status()}`
    );

    // 4.10 Legacy Vendors Directory
    const adminVendorsRes = await adminPage.goto(`${BASE_URL}/admin/vendors`, {
      waitUntil: "domcontentloaded",
    });
    record(
      "Admin Console",
      "GET /admin/vendors",
      adminVendorsRes?.status() === 200,
      `Status: ${adminVendorsRes?.status()}`
    );

    await adminContext.close();
  } catch (err) {
    console.error("FATAL ERROR in E2E Walkthrough:", err);
    record("Walkthrough", "Fatal Execution", false, err.message);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log("            E2E WALKTHROUGH RESULTS              ");
  console.log("=================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`Passed: ${passedCount}/${totalCount} assertions`);
  console.log(`Uncaught Browser Page Errors: ${pageErrors.length}`);

  if (pageErrors.length > 0) {
    console.log("\nBrowser Page Errors:");
    pageErrors.forEach((e) => console.log(`  - ${e}`));
  }

  if (passedCount === totalCount && pageErrors.length === 0) {
    console.log("\n🌟 ALL E2E USER JOURNEYS PASSED CLEANLY! 🌟\n");
    process.exit(0);
  } else {
    console.error("\n❌ E2E WALKTHROUGH FAILED.\n");
    process.exit(1);
  }
}

runWalkthrough();
