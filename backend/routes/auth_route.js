const auth_controller = require("../controllers/auth_controller");
const router = require("express").Router();

router.post("/sign_in", auth_controller.register);
router.post("/login", auth_controller.login);
router.post("/logout", auth_controller.logout);
router.post("/refresh", auth_controller.refresh);

module.exports = router;
