const mongoose = require("mongoose");

const transaction_schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["virtual_account_funding", "flight_payment", "refund"],
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "booking" },
    nomba_transaction_id: { type: String, index: true },
    merchant_tx_ref: { type: String, unique: true, sparse: true, index: true },
    narration: { type: String },
    // Full raw webhook/API payload, kept for audit and weekly reconciliation
    // against Nomba's own transaction records.
    raw_payload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("transaction", transaction_schema);
