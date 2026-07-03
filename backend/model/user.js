const mongoose = require("mongoose");

const refresh_token_schema = new mongoose.Schema(
  {
    // Hashed, same principle as password_hash — a DB leak shouldn't hand out
    // usable tokens.
    token_hash: { type: String, required: true },
    revoked: { type: Boolean, default: false },
    expires_at: { type: Date, required: true },
  },
  { _id: false, timestamps: { createdAt: "created_at", updatedAt: false } },
);

const virtual_account_schema = new mongoose.Schema(
  {
    account_ref: { type: String },
    account_holder_id: { type: String },
    bank_account_number: { type: String },
    bank_account_name: { type: String },
    bank_name: { type: String },
    currency: { type: String, default: "NGN" },
  },
  { _id: false },
);

const user_schema = new mongoose.Schema(
  {
    full_name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },
    phone_number: { type: String },
    refresh_tokens: { type: [refresh_token_schema], default: [] },
    virtual_account: { type: virtual_account_schema, default: null },
    // Mirrors funds sitting in the user's Nomba virtual account, kept in
    // sync via the funding webhook and debited when a booking is paid for.
    wallet_balance: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("user", user_schema);
