const NOMBA_BASE_URL =
  process.env.NOMBA_BASE_URL || "https://sandbox.api.nomba.com/v1";

let cached_token = null;
let token_expires_at = null;

// Confirmed from your hackathon training: tokens last 60 min, refresh at 55.
// accountId header for THIS call specifically is the PARENT account.
async function get_access_token() {
  if (cached_token && token_expires_at && Date.now() < token_expires_at) {
    return cached_token;
  }

  const response = await fetch(`${NOMBA_BASE_URL}/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: process.env.NOMBA_PARENT_ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_PRIVATE_KEY,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.code !== "00") {
    throw new Error(
      `Nomba auth failed: ${data.description || response.statusText}`,
    );
  }

  cached_token = data.data.access_token;
  token_expires_at = Date.now() + 55 * 60 * 1000;
  return cached_token;
}

// Every call EXCEPT getting the token itself is scoped with your SUB-account
// ID in this header — per your hackathon email ("scope your calls to your
// sub-account ID") and confirmed by the training's endpoints having no
// sub-account path parameter anywhere (the scoping has to be happening
// through this header instead). This corrects an earlier version that used
// the parent ID everywhere.
async function nomba_request(path, options = {}) {
  const access_token = await get_access_token();

  const response = await fetch(`${NOMBA_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
      accountId: process.env.NOMBA_SUB_ACCOUNT_ID,
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok || data.code !== "00") {
    throw new Error(
      `Nomba request failed: ${data.description || response.statusText}`,
    );
  }

  return data.data;
}

// Confirmed simpler shape from training: no sub-account in the path, the
// accountId header (sub-account, from nomba_request above) already scopes it.
async function create_virtual_account({ account_ref, account_name }) {
  return nomba_request("/accounts/virtual", {
    method: "POST",
    body: JSON.stringify({
      accountRef: account_ref,
      accountName: account_name,
    }),
  });
}

async function fetch_bank_codes() {
  const data = await nomba_request("/transfers/banks", { method: "GET" });
  return data.results;
}

async function lookup_bank_account({ account_number, bank_code }) {
  return nomba_request("/transfers/bank/lookup", {
    method: "POST",
    body: JSON.stringify({
      accountNumber: account_number,
      bankCode: bank_code,
    }),
  });
}

// IMPORTANT: Nomba's amounts are in KOBO (₦15,000 = 1,500,000). Everywhere
// else in FlyMate (wallet_balance, booking prices) we work in naira, so this
// function takes a naira amount like the rest of the app and converts right
// here — the kobo detail stays contained to this one file.
async function transfer_to_bank({
  amount,
  account_number,
  account_name,
  bank_code,
  merchant_tx_ref,
  sender_name,
  narration,
}) {
  const amount_kobo = Math.round(amount * 100);

  return nomba_request("/transfers/bank", {
    method: "POST",
    headers: {
      "X-Idempotent-key": merchant_tx_ref,
    },
    body: JSON.stringify({
      amount: amount_kobo,
      accountNumber: account_number,
      accountName: account_name,
      bankCode: bank_code,
      merchantTxRef: merchant_tx_ref,
      senderName: sender_name,
      narration,
    }),
  });
}

// Check the status of an outgoing transfer you initiated, by the
// merchantTxRef you gave it.
async function check_transfer_status({ merchant_tx_ref }) {
  return nomba_request(`/transfers/${encodeURIComponent(merchant_tx_ref)}`, {
    method: "GET",
  });
}

// Confirmed from training: GET /transactions with dateFrom/dateTo/status/type
// query params, used for reconciliation.
async function fetch_transactions({
  date_from,
  date_to,
  status,
  type,
  cursor,
} = {}) {
  const params = new URLSearchParams();
  if (date_from) params.set("dateFrom", date_from);
  if (date_to) params.set("dateTo", date_to);
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  if (cursor) params.set("cursor", cursor);

  const query = params.toString() ? `?${params.toString()}` : "";
  return nomba_request(`/transactions${query}`, { method: "GET" });
}

// Look up one transaction by YOUR reference — training is explicit that
// merchantTxRef is the source of truth to join on, not Nomba's internal IDs
// (which can rotate on retries).
async function fetch_transaction_by_ref({ merchant_tx_ref }) {
  return nomba_request(`/transactions/${encodeURIComponent(merchant_tx_ref)}`, {
    method: "GET",
  });
}

module.exports = {
  get_access_token,
  create_virtual_account,
  fetch_bank_codes,
  lookup_bank_account,
  transfer_to_bank,
  check_transfer_status,
  fetch_transactions,
  fetch_transaction_by_ref,
};
