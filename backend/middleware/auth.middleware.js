const { verify_access_token } = require("../utils/token.util");
const User = require("../model/user");

/**
 * Middleware that authenticates a user by verifying the JWT access token
 * sent in the httpOnly cookie (set by the login endpoint).
 *
 * On success it attaches the full user document (minus the password hash) to
 * `req.user` so downstream handlers can access `req.user.id`, `req.user.email`,
 * etc.
 */
async function authenticate_user(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    const payload = verify_access_token(token);

    const user = await User.findById(payload.user_id).select("-password_hash");
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token has expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid access token" });
    }
    console.error("authenticate_user error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = { authenticate_user };
