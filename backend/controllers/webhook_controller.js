const crypto = require("crypto");
const User = require("../model/user");
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
  console.log("\n==========================================");
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

      console.log("==========================================\n");

      return res.status(401).json({
        error: "Invalid webhook signature",
      });
    }

    console.log("✅ Signature verified");

    const payload = JSON.parse(raw_body.toString());

    console.log("\nPayload:");
    console.log(JSON.stringify(payload, null, 2));

    console.log("\nEvent Type:", payload.event_type);

    const existing_transaction = await Transaction.findOne({
      merchant_tx_ref: payload.requestId,
    });

    if (existing_transaction) {
      console.log("Duplicate webhook received.");
      console.log("==========================================\n");

      return res.status(200).json({
        received: true,
        duplicate: true,
      });
    }

    if (payload.event_type !== "payment_success") {
      console.log("Ignoring event:", payload.event_type);
      console.log("==========================================\n");

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const transaction = payload?.data?.transaction || {};

    console.log("Transaction Type:", transaction.type);

    if (transaction.type !== "vact_transfer") {
      console.log("Ignoring transaction type:", transaction.type);
      console.log("==========================================\n");

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const account_ref = transaction.aliasAccountReference;
    const amount_naira = transaction.transactionAmount / 100;

    console.log("Account Ref:", account_ref);
    console.log("Amount:", amount_naira);

    if (!account_ref || !transaction.transactionAmount) {
      console.warn("Missing account reference or amount");
      console.log("==========================================\n");

      return res.status(400).json({
        error: "Malformed webhook payload",
      });
    }

    const user = await User.findOne({
      "virtual_account.account_ref": account_ref,
    });

    if (!user) {
      console.warn("No user found for accountRef:", account_ref);
      console.log("==========================================\n");

      return res.status(200).json({
        received: true,
      });
    }

    console.log("\nMatched User:");
    console.log({
      id: user._id,
      email: user.email,
      wallet_balance: user.wallet_balance,
    });

    const previous_balance = user.wallet_balance;

    user.wallet_balance += amount_naira;

    await user.save();

    console.log(
      `Wallet Updated: ₦${previous_balance} -> ₦${user.wallet_balance}`,
    );

    const saved_transaction = await Transaction.create({
      user_id: user._id,
      type: "virtual_account_funding",
      amount: amount_naira,
      status: "success",
      nomba_transaction_id: transaction.transactionId,
      merchant_tx_ref: payload.requestId,
      narration: transaction.narration || "Virtual account funding",
      raw_payload: payload,
    });

    console.log("Transaction Saved:");
    console.log(saved_transaction._id);

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

    console.log("\n✅ Webhook processed successfully");
    console.log("==========================================\n");

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("\n❌ Webhook Processing Error");
    console.error(error);
    console.log("==========================================\n");

    return res.status(500).json({
      error: "Could not process webhook",
    });
  }
}

module.exports = {
  handle_nomba_webhook,
};
