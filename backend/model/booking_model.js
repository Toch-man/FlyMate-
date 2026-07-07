const mongoose = require("mongoose");

const passenger_schema = new mongoose.Schema(
  {
    given_name: { type: String, required: true },
    family_name: { type: String, required: true },
    born_on: { type: String, required: true },
    gender: { type: String, enum: ["m", "f"], required: true },
    email: { type: String, required: true },
    phone_number: { type: String, required: true },
  },
  { _id: false },
);

const booking_schema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    offer_id: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
    },
    payment_method: { type: String, enum: ["card", "wallet"], required: true },
    order_reference: { type: String, index: true, sparse: true },
    passenger: { type: passenger_schema, required: true },
    // Set for real Duffel bookings only.
    duffel_order_id: { type: String },
    // Set for FlyMate Demo Airline bookings instead.
    is_demo: { type: Boolean, default: false },
    demo_ticket: { type: mongoose.Schema.Types.Mixed },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    depart_date: { type: Date, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

module.exports = mongoose.model("booking", booking_schema);
