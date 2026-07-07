// Everything here is clearly fictional and labeled as such — this exists so
// the demo always has a bookable option even if live search has no results,
// and to demonstrate the full booking/payment/notification pipeline without
// depending on a live airline API.

function build_demo_flight_offer({ origin, destination, depart_date, budget }) {
  // Priced affordably and usually cheaper than real options, so it's a
  // natural, honest choice to show — not the only choice available.
  const price = budget ? Math.min(200, budget) : 200;
  const flight_number = `FM${Math.floor(100 + Math.random() * 900)}`;

  // Encoding details directly into the offer_id keeps demo bookings
  // self-contained — no need to persist search results separately just to
  // remember what was offered.
  const offer_id = `demo::${origin}::${destination}::${depart_date}::${price}::${flight_number}`;

  return {
    offer_id,
    airline: "FlyMate Demo Airline (test only, not a real flight)",
    origin,
    destination,
    depart_date,
    price,
    currency: "NGN",
    stops: 0,
    is_demo: true,
  };
}

function generate_demo_ticket({ offer_id, passenger }) {
  const parts = offer_id.split("::");
  const [, origin, destination, depart_date, price, flight_number] = parts;

  const pnr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ticket_number = `FM-${Date.now().toString().slice(-8)}`;
  const seat_letter = ["A", "B", "C", "D", "E", "F"][
    Math.floor(Math.random() * 6)
  ];
  const seat = `${Math.floor(1 + Math.random() * 30)}${seat_letter}`;
  const gate = `G${Math.floor(1 + Math.random() * 20)}`;
  const terminal = `T${Math.floor(1 + Math.random() * 3)}`;

  return {
    is_demo: true,
    airline: "FlyMate Demo Airline",
    flight_number,
    booking_reference: pnr,
    ticket_number,
    passenger_name: `${passenger.given_name} ${passenger.family_name}`,
    origin,
    destination,
    depart_date,
    departure_time: "09:40",
    arrival_time: "11:05",
    seat,
    gate,
    terminal,
    cabin_class: "Economy",
    price: Number(price),
    status: "confirmed",
    note: "Demo ticket for demonstration purposes only — not a real, bookable flight.",
  };
}

function is_demo_offer(offer_id) {
  return typeof offer_id === "string" && offer_id.startsWith("demo::");
}

module.exports = {
  build_demo_flight_offer,
  generate_demo_ticket,
  is_demo_offer,
};
