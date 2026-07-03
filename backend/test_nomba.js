// Run with: node scripts/test-nomba.js
// Tests auth, virtual account creation (the real test of whether your one
// sub-account is enough — no separate sub-account creation needed), bank
// codes, and bank account lookup. Does NOT test transfer_to_bank, since that
// moves real (sandbox) money and needs an already-funded wallet — test that
// separately once this all passes.

require("dotenv").config();
const {
  get_access_token,
  create_virtual_account,
  fetch_bank_codes,
  lookup_bank_account,
} = require("./services/nomba.service");

async function run() {
  console.log("1. Testing authentication...");
  try {
    const token = await get_access_token();
    console.log("   ✅ Got access token:", token.slice(0, 20) + "...");
  } catch (error) {
    console.error("   ❌ Auth failed:", error.message);
    console.error("   Stopping here — nothing else will work without a token.");
    return;
  }

  console.log(
    "\n2. Testing virtual account creation — this call is scoped by your " +
      "sub-account ID via the accountId header, NOT a separate sub-account " +
      "creation step. If this succeeds, that confirms you don't need to " +
      "create anything extra.",
  );
  try {
    const account = await create_virtual_account({
      account_ref: `test_${Date.now()}`,
      account_name: "Test FlyMate User",
    });
    console.log("   ✅ Virtual account created:");
    console.log(account);
  } catch (error) {
    console.error("   ❌ Virtual account creation failed:", error.message);
  }

  console.log("\n3. Testing bank codes list...");
  let banks = [];
  try {
    banks = await fetch_bank_codes();
    console.log(`   ✅ Got ${banks.length} banks. First few:`);
    console.log(banks.slice(0, 3));
  } catch (error) {
    console.error("   ❌ Bank codes fetch failed:", error.message);
    console.error("   Full error:", error); // shows the real cause, not just the message
  }

  console.log(
    "\n4. Testing bank account lookup, using your training's test " +
      "instrument (Wema Bank, account 0000000000)...",
  );
  try {
    const wema = banks.find((bank) => bank.name.toLowerCase().includes("wema"));
    if (!wema) {
      console.warn(
        "   ⚠️  Couldn't find Wema Bank in the list from step 3 — skipping.",
      );
    } else {
      const lookup = await lookup_bank_account({
        account_number: "0000000000",
        bank_code: wema.code,
      });
      console.log("   ✅ Lookup result:", lookup);
    }
  } catch (error) {
    console.error("   ❌ Bank lookup failed:", error.message);
  }

  console.log("\nDone. Fix anything marked ❌ before moving on.");
}

run();
