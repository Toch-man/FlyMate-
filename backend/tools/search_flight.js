const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

// This is PLACEHOLDER data. It exists so we can test that the AI correctly
// decides to search, and correctly reads the results back — without needing
// Travu wired up yet. Swap the inside of this function for a real Travu API
// call later; nothing else in the agent needs to change when you do.
async function search_flights_handler({
  origin,
  destination,
  depart_date,
  budget,
}) {
  const fake_flights = [
    {
      offer_id: "fake_offer_1",
      airline: "Green Africa",
      origin,
      destination,
      depart_date,
      price: 45000,
      stops: 0,
    },
    {
      offer_id: "fake_offer_2",
      airline: "Air Peace",
      origin,
      destination,
      depart_date,
      price: 38000,
      stops: 0,
    },
    {
      offer_id: "fake_offer_3",
      airline: "Ibom Air",
      origin,
      destination,
      depart_date,
      price: 52000,
      stops: 1,
    },
  ];

  // If the user gave a budget, only show flights within it — the same
  // filtering the real version will do once Travu is connected.
  const filtered = budget
    ? fake_flights.filter((flight) => flight.price <= budget)
    : fake_flights;

  // Tools must return a string (or something that can become one) — the AI
  // reads this text back and uses it to write its reply to the user.
  return JSON.stringify(filtered);
}

// This is the part the AI actually "sees." The description and schema are
// how it decides: (1) should I use this right now, and (2) what values do
// I need to fill in to call it.
const search_flights = tool(search_flights_handler, {
  name: "search_flights",
  description:
    "Search for available local Nigerian flights between two cities on a given date, optionally filtered by budget.",
  schema: z.object({
    origin: z.string().describe("Departure city, e.g. Lagos"),
    destination: z.string().describe("Arrival city, e.g. Abuja"),
    depart_date: z.string().describe("Date of travel, e.g. 2026-07-10"),
    budget: z
      .number()
      .optional()
      .describe("Maximum amount in Naira the user wants to spend"),
  }),
});

module.exports = { search_flights };
