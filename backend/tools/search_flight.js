const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { build_demo_flight_offer } = require("../utils/demo_flight.util");

// Duffel removed entirely — only the FlyMate Demo Airline offer now, always
// returned instantly, zero external API dependency.
async function search_flights_handler({
  origin,
  destination,
  depart_date,
  budget,
}) {
  const demo_offer = build_demo_flight_offer({
    origin,
    destination,
    depart_date,
    budget,
  });
  return JSON.stringify([demo_offer]);
}

const search_flights = tool(search_flights_handler, {
  name: "search_flights",
  description:
    "Search for available flights between two airports on a given date, optionally filtered by budget.",
  schema: z.object({
    origin: z
      .string()
      .describe("Departure airport IATA code, e.g. LOS for Lagos"),
    destination: z
      .string()
      .describe("Arrival airport IATA code, e.g. ABV for Abuja"),
    depart_date: z.string().describe("Date of travel in YYYY-MM-DD format"),
    budget: z
      .number()
      .optional()
      .describe("Maximum amount the user wants to spend"),
  }),
});

module.exports = { search_flights };
