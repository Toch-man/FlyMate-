const User = require("../models/user.model");
const Booking = require("../models/booking.model");
const Transaction = require("../models/transaction.model");
const { create_notification } = require("../utils/notify.util");
const {
  create_checkout_order,
  get_checkout_order_status,
} = require("../services/nomba.service");

async function checkout(req, res) {
  try {
    const {
      offer_id,
      origin,
      destination,
      depart_date,
      price,
      payment_method,
    } = req.body;

    if (
      !offer_id ||
      !origin ||
      !destination ||
      !depart_date ||
      !price ||
      !payment_method
    ) {
      return res.status(400).json({
        error:
          "offer_id, origin, destination, depart_date, price and payment_method are required",
      });
    }

    if (!["card", "wallet"].includes(payment_method)) {
      return res
        .status(400)
        .json({ error: "payment_method must be 'card' or 'wallet'" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const flight_details = {
      origin,
      destination,
      depart_date,
      price,
      offer_id,
    };

    if (payment_method === "wallet") {
      return await pay_with_wallet(user, flight_details, res);
    }

    return await pay_with_card(user, flight_details, res);
  } catch (error) {
    console.error("checkout error:", error);
    return res.status(500).json({ error: "Could not complete checkout" });
  }
}

// Wallet payments confirm immediately — the balance check IS the payment,
// no external step or webhook wait involved.
async function pay_with_wallet(
  user,
  { offer_id, origin, destination, depart_date, price },
  res,
) {
  if (user.wallet_balance < price) {
    return res.status(400).json({
      error: "Insufficient wallet balance",
      wallet_balance: user.wallet_balance,
      required: price,
    });
  }

  user.wallet_balance -= price;
  await user.save();

  const booking = await Booking.create({
    user_id: user._id,
    offer_id,
    status: "confirmed",
    payment_method: "wallet",
    origin,
    destination,
    depart_date,
    price,
  });

  await Transaction.create({
    user_id: user._id,
    type: "flight_payment",
    amount: price,
    status: "success",
    booking_id: booking._id,
    merchant_tx_ref: `booking_${booking._id}`,
    narration: `Wallet payment for flight ${origin} to ${destination}`,
  });

  await create_notification({
    user_id: user._id,
    type: "booking_confirmed",
    title: "Flight booked!",
    message: `Your flight from ${origin} to ${destination} is booked. ₦${price} was deducted from your wallet.`,
    metadata: { booking_id: booking._id.toString(), price },
  });

  return res.status(201).json({
    booking,
    wallet_balance: user.wallet_balance,
  });
}

// Card payments are async — the booking starts "pending" and only becomes
// "confirmed" once the webhook tells us the checkout order actually
// succeeded. The frontend redirects the user to checkout_link to pay.
async function pay_with_card(
  user,
  { offer_id, origin, destination, depart_date, price },
  res,
) {
  const booking = await Booking.create({
    user_id: user._id,
    offer_id,
    status: "pending",
    payment_method: "card",
    origin,
    destination,
    depart_date,
    price,
  });

  const order_reference = `booking_${booking._id}`;

  const order = await create_checkout_order({
    order_reference,
    amount: price,
    customer_email: user.email,
    customer_id: user._id.toString(),
    callback_url: `${process.env.FRONTEND_URL}/booking/callback?booking_id=${booking._id}`,
  });

  booking.order_reference = order_reference;
  await booking.save();

  return res.status(201).json({
    booking,
    checkout_link: order.checkoutLink,
  });
}

async function get_my_bookings(req, res) {
  try {
    const bookings = await Booking.find({ user_id: req.user.id }).sort({
      created_at: -1,
    });
    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("get_my_bookings error:", error);
    return res.status(500).json({ error: "Could not fetch bookings" });
  }
}

// Used by the callback page — the user lands here right after paying, often
// before the webhook has processed yet, so the frontend polls this briefly.
//
// IMPORTANT: this does NOT just trust the webhook. If a card booking is
// still "pending", it actively asks Nomba what actually happened before
// answering. That covers the webhook being slow, dropped, or misconfigured —
// this endpoint self-heals regardless, which is the right way to handle
// this even outside of tonight's deadline pressure.
async function get_booking_by_id(req, res) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (
      booking.status === "pending" &&
      booking.payment_method === "card" &&
      booking.order_reference
    ) {
      try {
        const order_status = await get_checkout_order_status({
          order_reference: booking.order_reference,
        });

        // Field name for "it succeeded" isn't confirmed yet — checking a
        // few likely spots defensively rather than guessing one and failing
        // silently.
        const succeeded =
          order_status?.paymentStatus === "SUCCESS" ||
          order_status?.status === "SUCCESS" ||
          order_status?.orderStatus === "SUCCESS";

        if (succeeded) {
          booking.status = "confirmed";
          await booking.save();

          await Transaction.create({
            user_id: booking.user_id,
            type: "flight_payment",
            amount: booking.price,
            status: "success",
            booking_id: booking._id,
            merchant_tx_ref: `${booking.order_reference}_verified`,
            narration: `Card payment for flight ${booking.origin} to ${booking.destination} (confirmed via status check)`,
          });

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
        }
      } catch (status_check_error) {
        // Don't fail the whole request just because the live check failed —
        // fall back to whatever we already have in the database.
        console.error(
          "checkout order status check failed:",
          status_check_error,
        );
      }
    }

    return res.status(200).json({ booking });
  } catch (error) {
    console.error("get_booking_by_id error:", error);
    return res.status(500).json({ error: "Could not fetch booking" });
  }
}

module.exports = { checkout, get_my_bookings, get_booking_by_id };
