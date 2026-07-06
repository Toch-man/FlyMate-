const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { search_flights } = require("./tools/search_flights.js");

// This is the AI "brain" — the actual model that reads messages and decides
// what to say or do. gemini-2.0-flash is fast and cheap, good for an agent
// that might be called a lot during testing.
// gemini-2.0-flash was deprecated March 3, 2026 and no longer gets free-tier
// quota allocated to it (that's what the "limit: 0" error meant — not usage
// exhaustion, just no quota for a sunset model). gemini-2.5-flash is the
// current free-tier-eligible equivalent.
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

// This is the AI's "job description" — plain instructions in English that
// shape how it behaves. Nothing magic here, it's just text the model reads
// before every conversation.
const SYSTEM_PROMPT = `You are FlyMate, an assistant that helps users in Nigeria find flights that fit their budget and preferences.

When a user tells you where they want to fly from, where to, when, and (optionally) their budget, use the search_flights tool to find real options.

Once you get results back, don't just dump raw data — pick the best 1-3 options and explain briefly why each is a good fit (price, number of stops). If nothing fits their budget, say so honestly and suggest the closest alternative.

Keep replies short and conversational, like you're texting a friend, not writing a report.`;

// createReactAgent wires everything together: model + tools + instructions.
// It already knows how to run the loop of "think, decide to call a tool,
// call it, look at the result, decide again" — you don't write that part.
//
// NOTE: the name of this "system prompt" option has changed between
// LangGraph versions (stateModifier / messageModifier / prompt). If you get
// an error mentioning an unknown property here, check `node_modules/@langchain/langgraph/prebuilt`
// or the installed version's docs and rename this key — the rest of the file stays the same.
const flymate_agent = createReactAgent({
  llm: model,
  tools: [search_flights],
  stateModifier: SYSTEM_PROMPT,
});

module.exports = { flymate_agent };
