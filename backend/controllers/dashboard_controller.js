const User = require("../model/user");
const Booking = require("../model/booking_model");
const Transaction = require("../model/transaction_model");

async function get_dashboard_summary(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [recent_bookings, recent_transactions, booking_count] =
      await Promise.all([
        Booking.find({ user_id: req.user.id })
          .sort({ created_at: -1 })
          .limit(5),
        Transaction.find({ user_id: req.user.id })
          .sort({ created_at: -1 })
          .limit(5),
        Booking.countDocuments({ user_id: req.user.id }),
      ]);

    return res.status(200).json({
      full_name: user.full_name,
      wallet_balance: user.wallet_balance,
      booking_count,
      recent_bookings,
      recent_transactions,
    });
  } catch (error) {
    console.error("get_dashboard_summary error:", error);
    return res.status(500).json({ error: "Could not load dashboard" });
  }
}

module.exports = { get_dashboard_summary };
