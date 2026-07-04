const cron = require("node-cron");
const Booking = require("../model/booking_model");
const Notification = require("../model/notification_model");
const { create_notification } = require("../utils/notify.util");

// Hours-before-departure windows to remind users at.
// Runs hourly, so each booking gets picked up once per window.
const REMINDER_WINDOWS = [48, 24, 3];

async function send_flight_reminders() {
  const now = new Date();

  for (const hours_before of REMINDER_WINDOWS) {
    const window_start = new Date(
      now.getTime() + (hours_before - 1) * 60 * 60 * 1000,
    );
    const window_end = new Date(now.getTime() + hours_before * 60 * 60 * 1000);

    const bookings = await Booking.find({
      status: "confirmed",
      depart_date: { $gte: window_start, $lte: window_end },
    });

    for (const booking of bookings) {
      // Guard against sending the same window's reminder twice if the job
      // overlaps or reruns within the hour.
      const already_sent = await Notification.findOne({
        user_id: booking.user_id,
        type: "flight_reminder",
        "metadata.booking_id": booking._id.toString(),
        "metadata.hours_before": hours_before,
      });

      if (already_sent) continue;

      await create_notification({
        user_id: booking.user_id,
        type: "flight_reminder",
        title: "Upcoming flight reminder",
        message: `Your flight from ${booking.origin} to ${booking.destination} departs in about ${hours_before} hours.`,
        metadata: { booking_id: booking._id.toString(), hours_before },
      });
    }
  }
}

function start_flight_reminder_job() {
  // Runs at the top of every hour.
  cron.schedule("0 * * * *", () => {
    send_flight_reminders().catch((error) => {
      console.error("flight reminder job error:", error);
    });
  });
}

module.exports = { start_flight_reminder_job, send_flight_reminders };
