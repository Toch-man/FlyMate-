const bcrypt = require("bcryptjs");
const User = require("../model/user");
const {
  generate_access_token,
  generate_refresh_token,
  verify_refresh_token,
} = require("../utils/token.util");
const { create_virtual_account } = require("../services/nomba.service");

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

async function register(req, res) {
  let created_user = null;

  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ error: "full_name, email and password are required" });
    }

    const existing_user = await User.findOne({ email });
    if (existing_user) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    created_user = await User.create({
      full_name,
      email,
      password_hash,
      phone_number,
    });

    // Every user gets a dedicated Nomba virtual account to fund — this is
    // what the agent later pays from when booking a flight. If this fails,
    // roll back the user record instead of leaving an account with no way
    // to pay for anything.
    const virtual_account = await create_virtual_account({
      account_ref: created_user._id.toString(),
      account_name: full_name,
    });

    created_user.virtual_account = {
      account_ref: virtual_account.accountRef,
      account_holder_id: virtual_account.accountHolderId,
      bank_account_number: virtual_account.bankAccountNumber,
      bank_account_name: virtual_account.bankAccountName,
      bank_name: virtual_account.bankName,
      currency: virtual_account.currency || "NGN",
    };
    await created_user.save();

    return res.status(201).json({
      user: {
        id: created_user._id,
        full_name: created_user.full_name,
        email: created_user.email,
        virtual_account: created_user.virtual_account,
      },
    });
  } catch (error) {
    console.error("register error:", error);

    if (created_user) {
      await User.deleteOne({ _id: created_user._id }).catch((cleanup_error) => {
        console.error("register rollback error:", cleanup_error);
      });
    }

    return res
      .status(500)
      .json({ error: "Something went wrong while creating your account" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const password_matches = await bcrypt.compare(password, user.password_hash);
    if (!password_matches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const access_token = generate_access_token(user);
    const refresh_token = generate_refresh_token(user);
    const token_hash = await bcrypt.hash(refresh_token, 10);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    user.refresh_tokens.push({ token_hash, expires_at });
    await user.save();

    // sameSite: "none" + secure: true because frontend and backend live on
    // different domains (same cross-domain cookie situation as HealthMate).
    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      access_token,
      user: { id: user._id, full_name: user.full_name, email: user.email },
    });
  } catch (error) {
    console.error("login error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong while logging in" });
  }
}

async function refresh(req, res) {
  try {
    const refresh_token = req.cookies?.refresh_token;
    if (!refresh_token) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const payload = verify_refresh_token(refresh_token);
    const user = await User.findById(payload.user_id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    // Refresh tokens are hashed at rest, so we compare against each stored
    // hash rather than looking one up directly.
    let matched_token = null;
    for (const stored of user.refresh_tokens) {
      const matches = await bcrypt.compare(refresh_token, stored.token_hash);
      if (matches) {
        matched_token = stored;
        break;
      }
    }

    if (
      !matched_token ||
      matched_token.revoked ||
      matched_token.expires_at < new Date()
    ) {
      return res
        .status(401)
        .json({ error: "Refresh token is invalid or expired" });
    }

    const access_token = generate_access_token(user);
    return res.status(200).json({ access_token });
  } catch (error) {
    console.error("refresh error:", error);
    return res.status(401).json({ error: "Could not refresh session" });
  }
}

async function logout(req, res) {
  try {
    const refresh_token = req.cookies?.refresh_token;

    if (refresh_token) {
      const payload = verify_refresh_token(refresh_token);
      const user = await User.findById(payload.user_id);

      if (user) {
        for (const stored of user.refresh_tokens) {
          if (await bcrypt.compare(refresh_token, stored.token_hash)) {
            stored.revoked = true;
            break;
          }
        }
        await user.save();
      }
    }

    res.clearCookie("refresh_token");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("logout error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong while logging out" });
  }
}

module.exports = { register, login, refresh, logout };
