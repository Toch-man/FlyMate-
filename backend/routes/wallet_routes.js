const express = require("express");
const { authenticate_user } = require("../middleware/auth.middleware");
const {
  get_banks,
  lookup_bank,
  get_my_wallet,
  get_platform_balance,
} = require("../controllers/wallet.controller");

const router = express.Router();

router.use(authenticate_user);

router.get("/banks", get_banks);
router.post("/lookup-bank", lookup_bank);
router.get("/me", get_my_wallet);
router.get("/platform-balance", get_platform_balance);

module.exports = router;
