const express = require("express");
const { authenticate_user } = require("../middleware/auth_middleware");
const {
  get_reconciliation_logs,
} = require("../controllers/reconciliation_controller");

const router = express.Router();

router.use(authenticate_user);
router.get("/", get_reconciliation_logs);

module.exports = router;
