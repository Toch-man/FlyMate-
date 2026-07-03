const { flymate_agent } = require("../ai/agent");

// "history" is how the AI remembers earlier parts of the conversation. We're
// not saving it to the database yet — the frontend sends back whatever
// messages came in the previous response, and we send them along again.
// Simple, works fine for now, can move to the database later if needed.
async function chat_with_agent(req, res) {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await flymate_agent.invoke({
      messages: [...(history || []), { role: "user", content: message }],
    });

    // The agent may have gone through several internal steps (deciding to
    // search, reading results, etc). We only care about its final reply.
    const last_message = result.messages[result.messages.length - 1];

    return res.status(200).json({
      reply: last_message.content,
      history: result.messages,
    });
  } catch (error) {
    console.error("chat_with_agent error:", error);
    return res
      .status(500)
      .json({ error: "The agent could not process that message" });
  }
}

module.exports = { chat_with_agent };
