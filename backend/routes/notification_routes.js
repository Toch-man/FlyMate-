const express = require("express");
const { authenticate_user } = require("../middleware/auth.middleware");
const {
  get_notifications,
  mark_as_read,
  mark_all_as_read,
} = require("../controllers/notification_controller");

const router = express.Router();

router.use(authenticate_user);

router.get("/", get_notifications);
router.patch("/:id/read", mark_as_read);
router.patch("/read-all", mark_all_as_read);

module.exports = router;
