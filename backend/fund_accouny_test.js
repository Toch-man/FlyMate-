// Run with: node scripts/fund-sandbox-account.js
// Creates a virtual account, then sends it a real (sandbox) ₦100 transfer —
// sandbox virtual accounts accept transfers up to ₦150 max. This is what
// actually triggers the funding webhook, per Nomba's docs: "All transfers
// will trigger webhooks to the Sandbox webhook URL."
//
// Make sure app.js is already running (node app.js) in another terminal
// BEFORE running this, and that your webhook URL is registered/reachable —
// otherwise there's nothing listening to receive the webhook this triggers.

require("dotenv").config();
const {
  create_virtual_account,
  fetch_bank_codes,
  transfer_to_bank,
} = require("./services/nomba.service");

async function run() {
  console.log("1. Creating a virtual account...");
  const account = await create_virtual_account({
    account_ref: `fund_test_${Date.now()}`,
    account_name: "Fund Test User",
  });
  console.log("   ✅", account);

  console.log("\n2. Finding the right bank code for", account.bankName, "...");
  const banks = await fetch_bank_codes();
  const bank = banks.find(
    (b) =>
      b.name.toLowerCase().trim() === account.bankName.toLowerCase().trim(),
  );

  if (!bank) {
    console.error(
      `   ❌ Couldn't find an exact match for "${account.bankName}" in the bank list.`,
    );
    console.error("   Here are close matches to check manually:");
    console.error(
      banks.filter((b) => b.name.toLowerCase().includes("nomba")).slice(0, 5),
    );
    return;
  }
  console.log(`   ✅ Found: ${bank.name} (${bank.code})`);

  console.log(
    "\n3. Sending ₦100 to the virtual account (sandbox cap is ₦150)...",
  );
  const merchant_tx_ref = `fund_test_${Date.now()}`;
  const transfer = await transfer_to_bank({
    amount: 100,
    account_number: account.bankAccountNumber,
    account_name: account.bankAccountName,
    bank_code: bank.code,
    merchant_tx_ref,
    sender_name: "Test Sender",
    narration: "Sandbox funding test",
  });
  console.log("   ✅ Transfer sent:", transfer);

  console.log(
    "\nDone. Now check the terminal running `node app.js` — you should see " +
      "your webhook handler fire within a few seconds. If nothing shows up, " +
      "that's the next thing to debug (webhook URL registration, most likely).",
  );
}

run().catch((error) => {
  console.error("❌ Failed:", error.message);
  console.error(error);
});
