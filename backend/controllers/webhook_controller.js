const crypto = require("crypto");
const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Transaction = require("../models/transaction.model");
const { create_notification } = require("../utils/notify.util");

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
    const raw_body = req.body;

    if (!verify_signature(raw_body, req)) {
      console.warn("Invalid Nomba webhook signature");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const payload = JSON.parse(raw_body.toString());

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

    if (transaction.type === "vact_transfer") {
      return await handle_wallet_funding(payload, transaction, res);
    }

    // UNCONFIRMED: card checkout payment_success events have never actually
    // been fired and inspected yet — this branch is a best guess at where
    // the orderReference lands, checked against a few likely spots. Once
    // you fire a real test checkout payment, log `payload` here and fix
    // this to match reality if it's wrong.
    const order_reference =
      payload?.data?.order?.orderReference ||
      payload?.data?.orderReference ||
      transaction.merchantTxRef;

    if (order_reference) {
      return await handle_card_payment(payload, order_reference, res);
    }

    console.warn(
      "nomba webhook: payment_success event didn't match any known type",
      payload,
    );
    return res.status(200).json({ received: true, ignored: true });
  } catch (error) {
    console.error("handle_nomba_webhook error:", error);
    return res.status(500).json({ error: "Could not process webhook" });
  }
}

// Virtual account funding — same logic as before.
async function handle_wallet_funding(payload, transaction, res) {
  const account_ref = transaction.aliasAccountReference;
  const amount_naira = transaction.transactionAmount / 100; // TODO: confirm kobo assumption

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
}

// Card checkout payment for a booking — finds the pending booking by the
// order_reference we set when creating the checkout order, and confirms it.
async function handle_card_payment(payload, order_reference, res) {
  const booking = await Booking.findOne({ order_reference });

  if (!booking) {
    console.warn(
      "nomba webhook: no booking found for order_reference",
      order_reference,
    );
    return res.status(200).json({ received: true });
  }

  if (booking.status === "confirmed") {
    return res.status(200).json({ received: true, duplicate: true });
  }

  booking.status = "confirmed";
  await booking.save();

  await Transaction.create({
    user_id: booking.user_id,
    type: "flight_payment",
    amount: booking.price,
    status: "success",
    booking_id: booking._id,
    merchant_tx_ref: payload.requestId,
    narration: `Card payment for flight ${booking.origin} to ${booking.destination}`,
    raw_payload: payload,
  });

  await create_notification({
    user_id: booking.user_id,
    type: "booking_confirmed",
    title: "Flight booked!",
    message: `Your flight from ${booking.origin} to ${booking.destination} is confirmed.`,
    metadata: { booking_id: booking._id.toString(), price: booking.price },
  });

  return res.status(200).json({ received: true });
}

module.exports = { handle_nomba_webhook };
