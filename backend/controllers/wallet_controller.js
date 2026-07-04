const User = require("../model/user");
const {
  fetch_bank_codes,
  lookup_bank_account,
  get_sub_account_balance,
} = require("../services/nomba.service");

// Bank codes barely change — cache in memory for the process lifetime
// instead of hitting Nomba on every request.
let cached_banks = null;

async function get_banks(req, res) {
  try {
    if (!cached_banks) {
      cached_banks = await fetch_bank_codes();
    }
    return res.status(200).json({ banks: cached_banks });
  } catch (error) {
    console.error("get_banks error:", error);
    return res.status(500).json({ error: "Could not fetch bank list" });
  }
}

// Always call this before letting a user confirm a transfer destination —
// shows them the resolved account name so they can catch a typo'd account
// number before money moves.
async function lookup_bank(req, res) {
  try {
    const { account_number, bank_code } = req.body;

    if (!account_number || !bank_code) {
      return res
        .status(400)
        .json({ error: "account_number and bank_code are required" });
    }

    const result = await lookup_bank_account({ account_number, bank_code });
    return res.status(200).json({ account_name: result.accountName });
  } catch (error) {
    console.error("lookup_bank error:", error);
    return res.status(500).json({ error: "Could not resolve that account" });
  }
}

// The user's own FlyMate wallet balance (our DB record, kept in sync by the
// funding webhook) plus their virtual account details to fund it with.
async function get_my_wallet(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      wallet_balance: user.wallet_balance,
      virtual_account: user.virtual_account,
    });
  } catch (error) {
    console.error("get_my_wallet error:", error);
    return res.status(500).json({ error: "Could not fetch wallet" });
  }
}

// The underlying Nomba sub-account balance — useful for you (ops/debugging),
// not something to expose to end users directly.
async function get_platform_balance(req, res) {
  try {
    const balance = await get_sub_account_balance();
    return res.status(200).json({ balance });
  } catch (error) {
    console.error("get_platform_balance error:", error);
    return res.status(500).json({ error: "Could not fetch platform balance" });
  }
}

module.exports = {
  get_banks,
  lookup_bank,
  get_my_wallet,
  get_platform_balance,
};
