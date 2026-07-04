const NOMBA_BASE_URL =
  process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com";

let cached_token = null;
let token_expires_at = null;

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

// Kept but de-prioritized per current direction — card checkout is the
// primary payment path now. Still fully working if you want a bank-transfer
// funding option later.
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

async function fetch_bank_codes() {
  const data = await nomba_request("/v1/transfers/banks", { method: "GET" });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.banks)) return data.banks;

  throw new Error(
    "Unrecognized response shape from /v1/transfers/banks — log `data` here to see the real shape.",
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

async function requery_transaction({ session_id }) {
  return nomba_request(
    `/v1/transactions/requery/${encodeURIComponent(session_id)}`,
    {
      method: "GET",
    },
  );
}

async function get_sub_account_balance() {
  return nomba_request(
    `/v1/accounts/${process.env.NOMBA_SUB_ACCOUNT_ID}/balance`,
    {
      method: "GET",
    },
  );
}

// ---- Card checkout (now the primary payment path) ----

// Creates a hosted checkout order. Redirect the user to the returned
// checkoutLink — Nomba's page handles card entry, OTP, and PCI compliance.
// Pass tokenize_card: true on a user's FIRST payment to save their card for
// future use — this is what lets returning users skip re-entering card
// details.
//
// NOTE: amount here is a DECIMAL STRING IN NAIRA ("10000.00"), unlike
// transfer_to_bank which uses integer kobo — confirmed different conventions
// within the same API.
async function create_checkout_order({
  order_reference,
  amount,
  customer_email,
  callback_url,
  customer_id,
  tokenize_card = false,
}) {
  return nomba_request("/v1/checkout/order", {
    method: "POST",
    body: JSON.stringify({
      order: {
        orderReference: order_reference,
        callbackUrl: callback_url,
        customerEmail: customer_email,
        amount: amount.toFixed(2),
        currency: "NGN",
        customerId: customer_id,
        accountId: process.env.NOMBA_SUB_ACCOUNT_ID,
        allowedPaymentMethods: ["Card", "Transfer"],
      },
      ...(tokenize_card ? { tokenizeCard: "true" } : {}),
    }),
  });
}

// Charges a PREVIOUSLY SAVED card using its tokenKey — no card re-entry, no
// hosted redirect needed. This is the "remember my card" payment path for a
// returning user's second+ booking.
async function charge_tokenized_card({
  order_reference,
  customer_id,
  customer_email,
  callback_url,
  amount,
  token_key,
}) {
  return nomba_request("/v1/checkout/tokenized-card-payment", {
    method: "POST",
    body: JSON.stringify({
      order: {
        orderReference: order_reference,
        customerId: customer_id,
        callbackUrl: callback_url,
        customerEmail: customer_email,
        amount: amount.toFixed(2),
        currency: "NGN",
        accountId: process.env.NOMBA_SUB_ACCOUNT_ID,
      },
      tokenKey: token_key,
    }),
  });
}

// Before you can retrieve a user's saved card(s), Nomba sends them an OTP
// to confirm it's really them. Call this first.
async function request_saved_card_otp({ order_reference }) {
  return nomba_request("/v1/checkout/user-card/saved-card/auth", {
    method: "POST",
    body: JSON.stringify({ orderReference: order_reference }),
  });
}

// Call AFTER the OTP from request_saved_card_otp has been entered/verified.
// Returns the tokenKey(s) you need for charge_tokenized_card.
async function get_user_saved_cards({ order_reference }) {
  const data = await nomba_request(
    `/v1/checkout/user-card/${encodeURIComponent(order_reference)}`,
    { method: "GET" },
  );
  return data.tokenizedCardData; // [{ tokenKey, customerEmail, cardType, cardPan, tokenExpirationDate }]
}

// Confirmed endpoint: GET /v1/checkout/order/{orderReference} — lets you
// actively check payment status instead of only waiting on the webhook.
// Exact success-status field name unconfirmed — handled defensively where used.
async function get_checkout_order_status({ order_reference }) {
  return nomba_request(
    `/v1/checkout/order/${encodeURIComponent(order_reference)}`,
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
  create_checkout_order,
  charge_tokenized_card,
  request_saved_card_otp,
  get_user_saved_cards,
  get_checkout_order_status,
};
