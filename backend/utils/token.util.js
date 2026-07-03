const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function generate_access_token(user) {
  return jwt.sign(
    { user_id: user._id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generate_refresh_token(user) {
  return jwt.sign(
    { user_id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function verify_access_token(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verify_refresh_token(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  generate_access_token,
  generate_refresh_token,
  verify_access_token,
  verify_refresh_token,
};