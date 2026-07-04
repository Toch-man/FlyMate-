const express = require("express");
const { authenticate_user } = require("../middleware/auth.middleware");
const { chat_with_agent } = require("../controllers/agent_controller");

const router = express.Router();

router.use(authenticate_user);
router.post("/chat", chat_with_agent);

module.exports = router;
