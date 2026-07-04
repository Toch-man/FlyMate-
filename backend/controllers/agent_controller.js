const { flymate_agent } = require("../AI/agent");

// Keeping history as simple {role, content} pairs only (no raw tool-call
// messages echoed back) — much lower risk of a serialization mismatch than
// round-tripping LangChain's internal message objects through JSON, and
// plenty for maintaining conversation context.
async function chat_with_agent(req, res) {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await flymate_agent.invoke({
      messages: [...(history || []), { role: "user", content: message }],
    });

    const last_message = result.messages[result.messages.length - 1];

    // Find the most recent tool result, if the agent searched for flights
    // this turn, so the frontend can render real clickable flight cards
    // instead of just parsing the AI's prose.
    const last_tool_message = [...result.messages]
      .reverse()
      .find((m) => m._getType?.() === "tool");

    let flight_options = null;
    if (last_tool_message) {
      try {
        flight_options = JSON.parse(last_tool_message.content);
      } catch {
        flight_options = null;
      }
    }

    return res.status(200).json({
      reply: last_message.content,
      flight_options,
    });
  } catch (error) {
    console.error("chat_with_agent error:", error);
    return res
      .status(500)
      .json({ error: "The agent could not process that message" });
  }
}

module.exports = { chat_with_agent };
