// Confirmed from the verified-endpoints guide: sandbox.nomba.com, /v1
// NOT baked into the base — every path below includes it explicitly.
const NOMBA_BASE_URL =
  process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com";

let cached_token = null;
let token_expires_at = null;

// accountId header on auth (and on EVERY call, per the new guide) is the
// PARENT account. Sub-account scoping happens via {subAccountId} in the URL
// path on the specific endpoints that need it — not via this header.
async function get_access_token() {
  if (cached_token && token_expires_at && Date.now() < token_expires_at) {
    return cached_token;
  }

  const response = await fetch(`${NOMBA_BASE_URL}/v1/auth/token/issue`, {
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

async function nomba_request(path, options = {}) {
  const access_token = await get_access_token();

  const response = await fetch(`${NOMBA_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
      accountId: process.env.NOMBA_PARENT_ACCOUNT_ID,
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

// Confirmed: POST /v1/accounts/virtual/{subAccountId}
async function create_virtual_account({
  account_ref,
  account_name,
  expiry_date,
}) {
  return nomba_request(
    `/v1/accounts/virtual/${process.env.NOMBA_SUB_ACCOUNT_ID}`,
    {
      method: "POST",
      body: JSON.stringify({
        accountRef: account_ref,
        accountName: account_name,
        ...(expiry_date ? { expiryDate: expiry_date } : {}),
      }),
    },
  );
}

// Fixed: relative path, not a hardcoded absolute URL — passing a full URL
// here would have concatenated onto NOMBA_BASE_URL and built a broken
// double-domain request.
async function fetch_bank_codes() {
  const data = await nomba_request("/v1/transfers/banks", { method: "GET" });

  // TEMP DEBUG: log the raw shape so we can see exactly what came back —
  // remove this line once fetch_bank_codes is confirmed working.
  console.log(
    "RAW /v1/transfers/banks response:",
    JSON.stringify(data, null, 2),
  );

  // Defensive: handle either { results: [...] } or a bare array, since we
  // don't yet know for certain which shape this endpoint actually returns.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.banks)) return data.banks;

  throw new Error(
    "Unrecognized response shape from /v1/transfers/banks — see the RAW log above and adjust fetch_bank_codes to match it.",
  );
}

async function lookup_bank_account({ account_number, bank_code }) {
  return nomba_request("/v1/transfers/bank/lookup", {
    method: "POST",
    body: JSON.stringify({
      accountNumber: account_number,
      bankCode: bank_code,
    }),
  });
}

// Confirmed: POST /v2/transfers/bank/{subAccountId} — scoped via path, same
// pattern as virtual account creation. Amount converted to kobo here.
// merchantTxRef (in the body) is the documented mechanism that prevents
// duplicate transfers — no separate idempotency header is mentioned
// anywhere in the verified-endpoints guide, so not adding one on a guess.
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

  return nomba_request(
    `/v2/transfers/bank/${process.env.NOMBA_SUB_ACCOUNT_ID}`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: amount_kobo,
        accountNumber: account_number,
        accountName: account_name,
        bankCode: bank_code,
        merchantTxRef: merchant_tx_ref,
        senderName: sender_name,
        narration,
      }),
    },
  );
}

// Confirmed: GET /v1/transactions/accounts/{subAccountId} — "reconcile
// inflows" per the guide. Query filters (dateFrom/dateTo/status/type) kept
// on top, matching the training's filtering behavior.
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
  return nomba_request(
    `/v1/transactions/accounts/${process.env.NOMBA_SUB_ACCOUNT_ID}${query}`,
    {
      method: "GET",
    },
  );
}

// Confirmed: GET /v1/transactions/requery/{sessionId} — "confirm" a specific
// transaction. Lower priority for tonight; keeping it available.
async function requery_transaction({ session_id }) {
  return nomba_request(
    `/v1/transactions/requery/${encodeURIComponent(session_id)}`,
    {
      method: "GET",
    },
  );
}

// Confirmed: GET /v1/accounts/{subAccountId}/balance
async function get_sub_account_balance() {
  return nomba_request(
    `/v1/accounts/${process.env.NOMBA_SUB_ACCOUNT_ID}/balance`,
    {
      method: "GET",
    },
  );
}

module.exports = {
  get_access_token,
  create_virtual_account,
  fetch_bank_codes,
  lookup_bank_account,
  transfer_to_bank,
  fetch_transactions,
  requery_transaction,
  get_sub_account_balance,
};
