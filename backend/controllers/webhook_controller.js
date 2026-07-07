const crypto = require("crypto");
const User = require("../model/user");
const Booking = require("../model/booking_model");
const Transaction = require("../model/transaction_model");
const { create_notification } = require("../utils/notify.util");
const { generate_demo_ticket } = require("../utils/demo_flight.util");

function verify_signature(payload, req) {
  const signature = req.headers["nomba-signature"];
  const timestamp = req.headers["nomba-timestamp"];
  if (!signature || !timestamp) return false;

  const merchant = payload?.data?.merchant || {};
  const transaction = payload?.data?.transaction || {};

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
  const expected_signature = crypto
    .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET)
    .update(message)
    .digest("base64");

  return signature === expected_signature;
}

async function handle_nomba_webhook(req, res) {
  try {
    const raw_body = req.body;
    const payload = JSON.parse(raw_body.toString());

    if (!verify_signature(payload, req)) {
      console.warn("❌ Invalid webhook signature");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

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

    const order_reference =
      payload?.data?.order?.orderReference ||
      payload?.data?.orderReference ||
      transaction.merchantTxRef;

    if (order_reference) {
      return await handle_card_payment(payload, order_reference, res);
    }

    return res.status(200).json({ received: true, ignored: true });
  } catch (error) {
    console.error("❌ handle_nomba_webhook error", error);
    return res.status(500).json({ error: "Could not process webhook" });
  }
}

async function handle_wallet_funding(payload, transaction, res) {
  const account_ref = transaction.aliasAccountReference;
  const amount_naira = transaction.transactionAmount / 100;

  if (!account_ref || !transaction.transactionAmount) {
    return res.status(400).json({ error: "Malformed webhook payload" });
  }

  const user = await User.findOne({
    "virtual_account.account_ref": account_ref,
  });
  if (!user) {
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

async function handle_card_payment(payload, order_reference, res) {
  const booking = await Booking.findOne({ order_reference });

  if (!booking) {
    return res.status(200).json({ received: true });
  }

  if (booking.status === "confirmed") {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const demo_ticket = generate_demo_ticket({
    offer_id: booking.offer_id,
    passenger: booking.passenger,
  });

  booking.is_demo = true;
  booking.demo_ticket = demo_ticket;
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
