const Notification = require("../models/notification.model");

async function get_notifications(req, res) {
  try {
    const notifications = await Notification.find({
      user_id: req.user.id,
    }).sort({
      created_at: -1,
    });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("get_notifications error:", error);
    return res.status(500).json({ error: "Could not fetch notifications" });
  }
}

async function mark_as_read(req, res) {
  try {
    const { id } = req.params;
    const updated = await Notification.updateOne(
      { _id: id, user_id: req.user.id },
      { $set: { is_read: true } },
    );
    if (updated.matchedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    return res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("mark_as_read error:", error);
    return res.status(500).json({ error: "Could not update notification" });
  }
}

async function mark_all_as_read(req, res) {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { $set: { is_read: true } },
    );
    return res
      .status(200)
      .json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("mark_all_as_read error:", error);
    return res.status(500).json({ error: "Could not update notifications" });
  }
}

module.exports = { get_notifications, mark_as_read, mark_all_as_read };
