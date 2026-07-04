const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { search_flights_duffel } = require("../../services/duffel.service");

// Same interface as the mock version — the agent doesn't know or care that
// this is now hitting a real API instead of returning a fake array.
async function search_flights_handler({
  origin,
  destination,
  depart_date,
  budget,
}) {
  const flights = await search_flights_duffel({
    origin,
    destination,
    departure_date: depart_date,
    budget,
  });

  return JSON.stringify(flights);
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
