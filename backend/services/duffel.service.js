const { Duffel } = require("@duffel/api");

// duffel_test_... in test mode, duffel_live_... once you go live. Same code
// either way — only the token prefix changes.
const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY,
});

// origin/destination must be IATA airport codes (e.g. "LOS", "ABV"), not
// city names — Gemini generally knows major Nigerian airport codes already,
// but for a more robust version later, Duffel also has an airports lookup
// you could use to resolve city names first.
async function search_flights_duffel({
  origin,
  destination,
  departure_date,
  budget,
}) {
  const offer_request = await duffel.offerRequests.create({
    slices: [{ origin, destination, departure_date }],
    passengers: [{ type: "adult" }],
    cabin_class: "economy",
  });

  const offers_response = await duffel.offers.list({
    offer_request_id: offer_request.data.id,
    sort: "total_amount",
  });

  let offers = offers_response.data;

  if (budget) {
    offers = offers.filter((offer) => Number(offer.total_amount) <= budget);
  }

  // Reshape into the same simple structure the mock tool used to return —
  // this is exactly why swapping this in required no changes to agent.js.
  return offers.map((offer) => ({
    offer_id: offer.id,
    airline: offer.slices[0]?.segments[0]?.operating_carrier?.name,
    origin,
    destination,
    depart_date: departure_date,
    price: Number(offer.total_amount),
    currency: offer.total_currency,
    stops: (offer.slices[0]?.segments.length ?? 1) - 1,
  }));
}

module.exports = { search_flights_duffel };
