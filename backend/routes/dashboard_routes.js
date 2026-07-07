const express = require("express");
const { authenticate_user } = require("../middleware/auth_middleware");
const {
  get_dashboard_summary,
} = require("../controllers/dashboard_controller");

const router = express.Router();

router.use(authenticate_user);
router.get("/", get_dashboard_summary);

module.exports = router;
