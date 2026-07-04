const mongoose = require("mongoose");

// Intentionally minimal — extend once the Travu/Nomba booking response
// shape is confirmed (passenger info, price breakdown, etc).
const booking_schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    offer_id: { type: String, required: true },
    travu_booking_id: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
    },
    // "pending" + payment_method "card" means awaiting the checkout webhook
    // to confirm payment. "pending" + "wallet" shouldn't normally be seen —
    // wallet payments confirm synchronously since the balance check happens
    // immediately, no async webhook wait needed.
    payment_method: { type: String, enum: ["card", "wallet"], required: true },
    // Only set for card payments — this is how the webhook finds which
    // booking a payment_success event belongs to.
    order_reference: { type: String, index: true, sparse: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    depart_date: { type: Date, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("booking", booking_schema);
