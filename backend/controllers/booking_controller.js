const User = require("../model/user");
const Booking = require("../model/booking_model");
const Transaction = require("../model/transaction_model");
const { create_notification } = require("../utils/notify.util");
const {
  create_checkout_order,
  get_checkout_order_status,
} = require("../services/nomba.service");
const { generate_demo_ticket } = require("../utils/demo_flight.util");

async function checkout(req, res) {
  try {
    const {
      offer_id,
      origin,
      destination,
      depart_date,
      price,
      payment_method,
      passenger,
    } = req.body;

    if (
      !offer_id ||
      !origin ||
      !destination ||
      !depart_date ||
      !price ||
      !payment_method ||
      !passenger
    ) {
      return res.status(400).json({
        error:
          "offer_id, origin, destination, depart_date, price, payment_method and passenger are all required",
      });
    }

    if (!["card", "wallet"].includes(payment_method)) {
      return res
        .status(400)
        .json({ error: "payment_method must be 'card' or 'wallet'" });
    }

    const required_passenger_fields = [
      "given_name",
      "family_name",
      "born_on",
      "gender",
      "email",
      "phone_number",
    ];
    const missing = required_passenger_fields.filter(
      (field) => !passenger[field],
    );
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ error: `Missing passenger fields: ${missing.join(", ")}` });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const flight_details = {
      offer_id,
      origin,
      destination,
      depart_date,
      price,
      passenger,
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

// Demo-only now — generates a ticket, no external transfer of any kind.
function complete_booking(booking) {
  const demo_ticket = generate_demo_ticket({
    offer_id: booking.offer_id,
    passenger: booking.passenger,
  });
  booking.is_demo = true;
  booking.demo_ticket = demo_ticket;
  booking.status = "confirmed";
  return demo_ticket;
}

async function pay_with_wallet(
  user,
  { offer_id, origin, destination, depart_date, price, passenger },
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
    status: "pending",
    payment_method: "wallet",
    passenger,
    origin,
    destination,
    depart_date,
    price,
  });

  const demo_ticket = complete_booking(booking);
  await booking.save();

  await Transaction.create({
    user_id: user._id,
    type: "flight_payment",
    amount: price * 100, //kobo
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

  return res
    .status(201)
    .json({ booking, demo_ticket, wallet_balance: user.wallet_balance });
}

async function pay_with_card(
  user,
  { offer_id, origin, destination, depart_date, price, passenger },
  res,
) {
  const booking = await Booking.create({
    user_id: user._id,
    offer_id,
    status: "pending",
    payment_method: "card",
    passenger,
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

  return res.status(201).json({ booking, checkout_link: order.checkoutLink });
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

        const succeeded =
          order_status?.paymentStatus === "SUCCESS" ||
          order_status?.status === "SUCCESS" ||
          order_status?.orderStatus === "SUCCESS";

        if (succeeded) {
          complete_booking(booking);
          await booking.save();

          await Transaction.create({
            user_id: booking.user_id,
            type: "flight_payment",
            amount: booking.price,
            status: "success",
            booking_id: booking._id,
            merchant_tx_ref: `${booking.order_reference}_verified`,
            narration: `Card payment for flight ${booking.origin} to ${booking.destination}`,
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
