const { create_flymate_agent } = require("../AI/agent");

async function chat_with_agent(req, res) {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // A fresh agent per request, bound to whoever is actually logged in —
    // this is what makes check_wallet_balance/book_flight safe to trust.
    const agent = create_flymate_agent(req.user.id);

    const result = await agent.invoke({
      messages: [...(history || []), { role: "user", content: message }],
    });

    const last_message = result.messages[result.messages.length - 1];

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
