const crypto = require("crypto");
const User = require("../model/user");
const Booking = require("../model/booking_model");
const Transaction = require("../model/transaction_model");
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
  console.log("\n=================================================");
  console.log("📩 Nomba Webhook Received");
  console.log("Time:", new Date().toISOString());

  try {
    const raw_body = req.body;

    console.log("\nHeaders:");
    console.log(req.headers);

    console.log("\nRaw Body:");
    console.log(raw_body.toString());

    if (!verify_signature(raw_body, req)) {
      console.warn("\n❌ Invalid webhook signature");

      const computed = crypto
        .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET || "")
        .update(raw_body)
        .digest("hex");

      console.warn("Received :", req.headers["nomba-signature"]);
      console.warn("Computed :", computed);

      console.log("=================================================\n");

      return res.status(401).json({
        error: "Invalid webhook signature",
      });
    }

    console.log("\n✅ Signature verified");

    const payload = JSON.parse(raw_body.toString());

    console.log("\nPayload:");
    console.log(JSON.stringify(payload, null, 2));

    console.log("\nEvent Type:", payload.event_type);

    const existing_by_request = await Transaction.findOne({
      merchant_tx_ref: payload.requestId,
    });

    if (existing_by_request) {
      console.log("⚠ Duplicate webhook received");
      console.log("=================================================\n");

      return res.status(200).json({
        received: true,
        duplicate: true,
      });
    }

    if (payload.event_type !== "payment_success") {
      console.log("Ignoring event:", payload.event_type);
      console.log("=================================================\n");

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const transaction = payload?.data?.transaction || {};

    console.log("Transaction Type:", transaction.type);

    if (transaction.type === "vact_transfer") {
      console.log("➡ Routing to Wallet Funding");
      return await handle_wallet_funding(payload, transaction, res);
    }

    const order_reference =
      payload?.data?.order?.orderReference ||
      payload?.data?.orderReference ||
      transaction.merchantTxRef;

    if (order_reference) {
      console.log("➡ Routing to Card Checkout");
      return await handle_card_payment(payload, order_reference, res);
    }

    console.warn("Unknown payment_success webhook");
    console.log(payload);

    console.log("=================================================\n");

    return res.status(200).json({
      received: true,
      ignored: true,
    });
  } catch (error) {
    console.error("\n❌ handle_nomba_webhook error");
    console.error(error);

    console.log("=================================================\n");

    return res.status(500).json({
      error: "Could not process webhook",
    });
  }
}

async function handle_wallet_funding(payload, transaction, res) {
  console.log("\n========== WALLET FUNDING ==========");

  const account_ref = transaction.aliasAccountReference;
  const amount_naira = transaction.transactionAmount / 100;

  console.log("Account Ref:", account_ref);
  console.log("Amount:", amount_naira);

  if (!account_ref || !transaction.transactionAmount) {
    console.warn("Missing account reference or amount");

    return res.status(400).json({
      error: "Malformed webhook payload",
    });
  }

  const user = await User.findOne({
    "virtual_account.account_ref": account_ref,
  });

  if (!user) {
    console.warn("No user found");
    console.warn(account_ref);

    return res.status(200).json({
      received: true,
    });
  }

  console.log("\nMatched User:");
  console.log({
    id: user._id,
    email: user.email,
    previous_balance: user.wallet_balance,
  });

  const previous_balance = user.wallet_balance;

  user.wallet_balance += amount_naira;

  await user.save();

  console.log(
    `Wallet Updated: ₦${previous_balance} -> ₦${user.wallet_balance}`,
  );

  const created_transaction = await Transaction.create({
    user_id: user._id,
    type: "virtual_account_funding",
    amount: amount_naira,
    status: "success",
    nomba_transaction_id: transaction.transactionId,
    merchant_tx_ref: payload.requestId,
    narration: transaction.narration || "Virtual account funding",
    raw_payload: payload,
  });

  console.log("Transaction Saved");
  console.log(created_transaction._id);

  await create_notification({
    user_id: user._id,
    type: "wallet_funded",
    title: "Wallet funded",
    message: `Your FlyMate wallet has been credited with ₦${amount_naira}.`,
    metadata: {
      amount: amount_naira,
      request_id: payload.requestId,
    },
  });

  console.log("Notification Created");

  console.log("✅ Wallet funding completed");
  console.log("====================================\n");

  return res.status(200).json({
    received: true,
  });
}

async function handle_card_payment(payload, order_reference, res) {
  console.log("\n========== CARD PAYMENT ==========");

  console.log("Order Reference:", order_reference);

  const booking = await Booking.findOne({
    order_reference,
  });

  if (!booking) {
    console.warn("No booking found");
    console.warn(order_reference);

    return res.status(200).json({
      received: true,
    });
  }

  console.log("Booking Found:");
  console.log({
    id: booking._id,
    user: booking.user_id,
    status: booking.status,
  });

  if (booking.status === "confirmed") {
    console.log("Booking already confirmed");

    return res.status(200).json({
      received: true,
      duplicate: true,
    });
  }

  booking.status = "confirmed";

  await booking.save();

  console.log("Booking Confirmed");

  const created_transaction = await Transaction.create({
    user_id: booking.user_id,
    type: "flight_payment",
    amount: booking.price,
    status: "success",
    booking_id: booking._id,
    merchant_tx_ref: payload.requestId,
    narration: `Card payment for flight ${booking.origin} to ${booking.destination}`,
    raw_payload: payload,
  });

  console.log("Transaction Saved");
  console.log(created_transaction._id);

  await create_notification({
    user_id: booking.user_id,
    type: "booking_confirmed",
    title: "Flight booked!",
    message: `Your flight from ${booking.origin} to ${booking.destination} is confirmed.`,
    metadata: {
      booking_id: booking._id.toString(),
      price: booking.price,
    },
  });

  console.log("Booking Notification Created");

  console.log("✅ Card payment completed");
  console.log("===================================\n");

  return res.status(200).json({
    received: true,
  });
}

module.exports = {
  handle_nomba_webhook,
};
