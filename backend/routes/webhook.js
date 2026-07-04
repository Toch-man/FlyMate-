const express = require("express");
const { handle_nomba_webhook } = require("../controllers/webhook_controller");

const router = express.Router();

// express.raw() here gives req.body as a raw Buffer instead of parsed JSON —
// required because the signature is computed over the exact original bytes.
// If this route ever gets JSON-parsed first (e.g. by a global
// app.use(express.json()) applied before this router), the raw bytes are
// lost and every signature check will fail.
router.post(
  "/nomba",
  express.raw({ type: "application/json" }),
  handle_nomba_webhook,
);

module.exports = router;
