// Run with: node scripts/simulate-webhook.js <account_ref> <amount_in_naira>
// Example:   node scripts/simulate-webhook.js test_1783104976774 5000
//
// Sends a correctly-shaped, correctly-signed fake webhook straight at your
// REAL deployed /webhooks/nomba endpoint — proves whether your webhook
// handler's logic actually works, independent of whether Nomba itself is
// delivering real events. If this works but real transfers still don't show
// up, the problem is 100% on Nomba's delivery side (URL/secret registration
// for live mode), not your code.
//
// account_ref must belong to a REAL user already in your database —
// register a test user first (POST /auth/register), then use the
// accountRef your account returns.

require("dotenv").config();
const crypto = require("crypto");

const [, , account_ref, amount_naira] = process.argv;

if (!account_ref || !amount_naira) {
  console.error(
    "Usage: node scripts/simulate-webhook.js <account_ref> <amount_in_naira>",
  );
  process.exit(1);
}

// CHANGE THIS to your real deployed URL before running against production.
const WEBHOOK_URL = "https://flymate-t18x.onrender.com/webhooks/nomba";

const amount_kobo = Math.round(Number(amount_naira) * 100);
const timestamp = new Date().toISOString(); // RFC-3339, e.g. 2026-01-01T15:45:22Z

const payload = {
  event_type: "payment_success",
  requestId: crypto.randomUUID(),
  data: {
    merchant: {
      userId: process.env.NOMBA_PARENT_ACCOUNT_ID || "sim_user_id",
      walletId: process.env.NOMBA_SUB_ACCOUNT_ID || "sim_wallet_id",
      walletBalance: 0,
    },
    terminal: {},
    transaction: {
      type: "vact_transfer",
      transactionId: `sim_${Date.now()}`,
      transactionAmount: amount_kobo,
      time: timestamp,
      responseCode: "",
      aliasAccountReference: account_ref,
      aliasAccountName: "Sim/Test User",
      aliasAccountNumber: "0000000000",
      aliasAccountType: "VIRTUAL",
      fee: 0,
      sessionId: `sim_session_${Date.now()}`,
      originatingFrom: "api",
      narration: "Simulated funding for local testing",
    },
    customer: {
      bankCode: "090645",
      senderName: "Simulated Sender",
      bankName: "Nombank",
      accountNumber: "0000000000",
    },
  },
};

// Confirmed method from Nomba's docs — must match webhook_controller.js exactly.
function build_signature(payload, timestamp, secret) {
  const merchant = payload.data.merchant;
  const transaction = payload.data.transaction;

  let response_code = transaction.responseCode || "";
  if (response_code === "null") response_code = "";

  const hashing_payload = [
    payload.event_type,
    payload.requestId,
    merchant.userId,
    merchant.walletId,
    transaction.transactionId,
    transaction.type,
    transaction.time,
    response_code,
  ].join(":");

  const message = `${hashing_payload}:${timestamp}`;

  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

async function run() {
  const signature = build_signature(
    payload,
    timestamp,
    process.env.NOMBA_WEBHOOK_SECRET,
  );
  const raw_body = JSON.stringify(payload);

  console.log("Sending to:", WEBHOOK_URL);
  console.log("Signature:", signature);

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "nomba-signature": signature,
      "nomba-timestamp": timestamp,
    },
    body: raw_body,
  });

  const result = await response.json();
  console.log("\nStatus:", response.status);
  console.log("Response:", result);
}

run();
