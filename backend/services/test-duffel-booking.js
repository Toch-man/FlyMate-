// Run with: node scripts/test-duffel-booking.js
// Searches for real flights, then actually books the first result using
// Duffel's test-mode "balance" payment. This is the real test of whether
// search_flights_duffel + book_flight_duffel work end to end.

require("dotenv").config();
const {
  search_flights_duffel,
  book_flight_duffel,
} = require("./duffel.service");

async function run() {
  console.log("1. Searching for flights...");

  // Use a date a few weeks out — test mode can be picky about past or
  // same-day dates. Route doesn't need to be a real Nigerian route for this
  // test — Duffel Airways (their own test airline) responds to most
  // origin/destination pairs specifically so testing is reliable.
  const flights = await search_flights_duffel({
    origin: "LOS",
    destination: "ABV",
    departure_date: "2026-08-15",
  });

  console.log(`   Found ${flights.length} offer(s):`);
  console.log(flights);

  if (flights.length === 0) {
    console.log(
      "\nNo offers returned — check DUFFEL_API_KEY is set, or try a " +
        "different route/date before assuming booking is broken.",
    );
    return;
  }

  const offer_to_book = flights[0];
  console.log("\n2. Booking this offer:", offer_to_book);

  // Fake test passenger — phone_number must be in E.164 format (+ country code).
  const passenger = {
    given_name: "Test",
    family_name: "User",
    born_on: "1990-01-01",
    gender: "m",
    email: "test@example.com",
    phone_number: "+2348000000000",
  };

  const order = await book_flight_duffel({
    offer_id: offer_to_book.offer_id,
    passenger,
  });

  console.log("\n✅ Booking successful!");
  console.log("Order ID:", order.id);
  console.log("Booking reference:", order.booking_reference);
  console.log(order);
}

run().catch((error) => {
  console.error("\n❌ Booking failed:", error.message);
  console.error(error);
});
