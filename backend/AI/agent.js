const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { search_flights } = require("../tools/search_flight");
const User = require("../model/user");
const Booking = require("../model/booking_model");
const Transaction = require("../model/transaction_model");
const { create_notification } = require("../utils/notify.util");
const { generate_demo_ticket } = require("../utils/demo_flight.util");

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `You are FlyMate, an assistant that helps users in Nigeria find flights that fit their budget and preferences, and books them.

When a user tells you where they want to fly from, where to, when, and (optionally) their budget, use the search_flights tool to find options.

Once you get results back, present them clearly with price and route.

When the user confirms which flight they want to book, use check_wallet_balance to see if they can afford it. If their balance is too low, tell them honestly and suggest topping up. If they can afford it, you'll need their passenger details before calling book_flight — ask for full name, date of birth (YYYY-MM-DD), gender, email, and phone number if you don't already have them from earlier in the conversation. Never call book_flight without explicit confirmation from the user on which exact flight to book.

Keep replies short and conversational, like you're texting a friend, not writing a report.`;

function create_flymate_agent(user_id) {
  const check_wallet_balance = tool(
    async () => {
      const user = await User.findById(user_id);
      return JSON.stringify({ wallet_balance: user.wallet_balance });
    },
    {
      name: "check_wallet_balance",
      description: "Check the current user's FlyMate wallet balance in Naira.",
      schema: z.object({}),
    },
  );

  const book_flight = tool(
    async ({
      offer_id,
      given_name,
      family_name,
      born_on,
      gender,
      email,
      phone_number,
    }) => {
      const user = await User.findById(user_id);
      const passenger = {
        given_name,
        family_name,
        born_on,
        gender,
        email,
        phone_number,
      };

      const parts = offer_id.split("::");
      const price = Number(parts[4]);
      const origin = parts[1];
      const destination = parts[2];
      const depart_date = parts[3];

      if (user.wallet_balance < price) {
        return JSON.stringify({
          success: false,
          reason: "INSUFFICIENT_FUNDS",
          wallet_balance: user.wallet_balance,
          required: price,
        });
      }

      user.wallet_balance -= price;
      await user.save();

      const demo_ticket = generate_demo_ticket({ offer_id, passenger });

      const booking = await Booking.create({
        user_id: user._id,
        offer_id,
        status: "confirmed",
        payment_method: "wallet",
        passenger,
        origin,
        destination,
        depart_date,
        price,
        is_demo: true,
        demo_ticket,
      });

      await Transaction.create({
        user_id: user._id,
        type: "flight_payment",
        amount: price,
        status: "success",
        booking_id: booking._id,
        merchant_tx_ref: `booking_${booking._id}`,
        narration: `Wallet payment for flight ${origin} to ${destination}`,
      });

      await create_notification({
        user_id: user._id,
        type: "booking_confirmed",
        title: "Flight booked!",
        message: `Your flight from ${origin} to ${destination} is confirmed.`,
        metadata: { booking_id: booking._id.toString(), price },
      });

      return JSON.stringify({
        success: true,
        booking_id: booking._id.toString(),
        demo_ticket,
        wallet_balance: user.wallet_balance,
      });
    },
    {
      name: "book_flight",
      description:
        "Book a specific flight offer using the user's FlyMate wallet balance. Only call this after the user has explicitly confirmed which exact flight they want AND you have all passenger details (full name, date of birth, gender, email, phone number) — ask for anything missing before calling this.",
      schema: z.object({
        offer_id: z
          .string()
          .describe("The offer_id of the flight the user picked"),
        given_name: z.string().describe("Passenger's first name"),
        family_name: z.string().describe("Passenger's last name"),
        born_on: z.string().describe("Passenger's date of birth, YYYY-MM-DD"),
        gender: z.enum(["m", "f"]).describe("Passenger's gender, m or f"),
        email: z.string().describe("Passenger's email"),
        phone_number: z
          .string()
          .describe(
            "Passenger's phone number, international format e.g. +2348012345678",
          ),
      }),
    },
  );

  return createReactAgent({
    llm: model,
    tools: [search_flights, check_wallet_balance, book_flight],
    stateModifier: SYSTEM_PROMPT,
  });
}

module.exports = { create_flymate_agent };
