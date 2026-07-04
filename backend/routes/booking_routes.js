const express = require("express");
const { authenticate_user } = require("../middleware/auth.middleware");
const {
  checkout,
  get_my_bookings,
  get_booking_by_id,
} = require("../controllers/booking.controller");

const router = express.Router();

router.use(authenticate_user);

router.post("/checkout", checkout);
router.get("/", get_my_bookings);
router.get("/:id", get_booking_by_id);

module.exports = router;
