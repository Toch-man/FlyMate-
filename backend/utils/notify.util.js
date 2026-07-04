const Notification = require("../model/notification_model");

// Called inline from any controller (booking, payment, reminder job, etc.)
// whenever a user needs to be notified in-app.
async function create_notification({
  user_id,
  type,
  title,
  message,
  metadata,
}) {
  return Notification.create({ user_id, type, title, message, metadata });
}

module.exports = { create_notification };
