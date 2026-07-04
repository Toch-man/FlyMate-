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

// Duffel's own docs are explicit: always retrieve the latest version of an
// offer right before booking — search results can go stale, prices can
// change, and you're not guaranteed the offer is still bookable.
async function get_offer_duffel({ offer_id }) {
  const response = await duffel.offers.get(offer_id);
  return response.data;
}

// Books the flight for real, using Duffel's TEST-MODE BALANCE — an
// unlimited fake balance that exists specifically so you can complete real
// bookings without needing actual funds. This is completely separate from
// whatever the user paid FlyMate through Nomba: this is FlyMate paying
// Duffel for the ticket, using Duffel's own play money, not the user's.
//
// UNCONFIRMED: the exact "balance" payment shape below is the standard
// pattern from Duffel's docs, but hasn't been fired for real yet — test
// this before relying on it.
async function book_flight_duffel({ offer_id, passenger }) {
  const offer = await get_offer_duffel({ offer_id });
  const offer_passenger_id = offer.passengers?.[0]?.id;

  const order = await duffel.orders.create({
    type: "instant",
    selected_offers: [offer_id],
    passengers: [
      {
        id: offer_passenger_id,
        given_name: passenger.given_name,
        family_name: passenger.family_name,
        born_on: passenger.born_on,
        gender: passenger.gender,
        title: passenger.gender === "m" ? "mr" : "ms",
        email: passenger.email,
        phone_number: passenger.phone_number,
      },
    ],
    payments: [
      {
        type: "balance",
        currency: offer.total_currency,
        amount: offer.total_amount,
      },
    ],
  });

  return order.data;
}

module.exports = {
  search_flights_duffel,
  get_offer_duffel,
  book_flight_duffel,
};
