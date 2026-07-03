const crypto = require("crypto");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const { create_notification } = require("../utils/notify.util");

// Per your hackathon training: HMAC-SHA256 over the RAW request body (not a
// reconstructed field string), hex-encoded, compared against the
// "nomba-signature" header. This requires the route to receive the raw
// Buffer body — see the express.raw() note in app.js wiring below.
//
// NOTE: this is a different recipe than what the general public docs showed
// earlier (colon-joined fields + timestamp + base64). Going with the
// training's version since it's specific to your hackathon gateway, but
// flagging this clearly: if signatures don't match on your first real test
// webhook, that's the thing to double check.
function verify_signature(raw_body, req) {
  const signature = req.headers["nomba-signature"];
  if (!signature) return false;

  const expected_signature = crypto
    .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET)
    .update(raw_body)
    .digest("hex");

  return signature === expected_signature;
}

async function handle_nomba_webhook(req, res) {
  try {
    // req.body is a raw Buffer here (see express.raw() in app.js) — not yet
    // parsed JSON. We need the raw bytes for the signature check first.
    const raw_body = req.body;

    if (!verify_signature(raw_body, req)) {
      console.warn("Invalid Nomba webhook signature");
      // TEMP DEBUG (remove once confirmed working): logs both signatures so
      // you can compare them directly against a real test webhook and
      // confirm this recipe is the right one before trusting it live.
      const computed = crypto
        .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET || "")
        .update(raw_body)
        .digest("hex");
      console.warn(
        "received:",
        req.headers["nomba-signature"],
        "| computed:",
        computed,
      );
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const payload = JSON.parse(raw_body.toString());

    // Training's explicit guidance: dedupe on requestId, since webhooks can
    // be delivered more than once.
    const existing_by_request = await Transaction.findOne({
      merchant_tx_ref: payload.requestId,
    });
    if (existing_by_request) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (payload.event_type !== "payment_success") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const transaction = payload?.data?.transaction || {};
    if (transaction.type !== "vact_transfer") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const account_ref = transaction.aliasAccountReference;
    // TODO — VERIFY WITH A REAL TEST TRANSFER: assuming this is in kobo,
    // same as every other amount field in this API family. Fund a virtual
    // account with a known small amount (e.g. ₦100) in sandbox and check
    // whether transactionAmount arrives as 100 or 10000 — adjust the
    // division below if it turns out to already be in naira.
    const amount_naira = transaction.transactionAmount / 100;

    if (!account_ref || !transaction.transactionAmount) {
      console.warn(
        "nomba webhook: missing aliasAccountReference or amount",
        payload,
      );
      return res.status(400).json({ error: "Malformed webhook payload" });
    }

    const user = await User.findOne({
      "virtual_account.account_ref": account_ref,
    });
    if (!user) {
      console.warn("nomba webhook: no user found for accountRef", account_ref);
      return res.status(200).json({ received: true });
    }

    user.wallet_balance += amount_naira;
    await user.save();

    await Transaction.create({
      user_id: user._id,
      type: "virtual_account_funding",
      amount: amount_naira,
      status: "success",
      nomba_transaction_id: transaction.transactionId,
      merchant_tx_ref: payload.requestId,
      narration: transaction.narration || "Virtual account funding",
      raw_payload: payload,
    });

    await create_notification({
      user_id: user._id,
      type: "wallet_funded",
      title: "Wallet funded",
      message: `Your FlyMate wallet has been credited with ₦${amount_naira}.`,
      metadata: { amount: amount_naira, request_id: payload.requestId },
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("handle_nomba_webhook error:", error);
    return res.status(500).json({ error: "Could not process webhook" });
  }
}

module.exports = { handle_nomba_webhook };
