// Pappi Suds & Scents — Facebook Messenger AI Agent
// -----------------------------------------------------------------
// Receives messages sent to your Facebook Page, asks Claude to draft
// a reply grounded in knowledge.md, then sends the reply back.
// -----------------------------------------------------------------

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ---- Config (set these as environment variables — see .env.example) ----
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;       // you make this up, used to verify the webhook
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN; // from Meta for Developers
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;    // from console.anthropic.com
const PORT = process.env.PORT || 3000;

// Simple in-memory store of recent conversation per user (resets on restart).
// For production, swap this for a real database (e.g. SQLite, Postgres, Redis).
const conversations = new Map();
const MAX_TURNS_REMEMBERED = 6;

// Load the business knowledge that grounds every reply.
const KNOWLEDGE = fs.readFileSync(path.join(__dirname, "knowledge.md"), "utf8");

const SYSTEM_PROMPT = `You are the Facebook Messenger assistant for Pappi Suds & Scents,
a fragrance/soap business. Answer customer questions warmly and concisely,
like a helpful shop owner replying on Messenger — not a formal support bot.

Rules:
- Only state prices, products, or policies that appear in the KNOWLEDGE section below.
  If you don't know something, say you'll have the owner follow up — never guess or invent details.
- Keep replies short (2-4 sentences), friendly, and conversational — this is Messenger, not email.
- If someone wants to place an order, direct them to ${"pappiscents.shop"} or Shopee (bilyotoy),
  or say the owner will confirm details with them directly.
- If a message is abusive, spammy, or clearly not about the business, reply briefly and politely
  and do not escalate.

KNOWLEDGE:
${KNOWLEDGE}`;

// ---------------------------------------------------------------
// 1. Webhook verification (Meta calls this once when you set up the webhook)
// ---------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ---------------------------------------------------------------
// 2. Incoming messages
// ---------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  // Acknowledge immediately; Meta expects a fast 200.
  res.status(200).send("EVENT_RECEIVED");

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;

      if (!senderId || !text || event.message?.is_echo) continue;

      try {
        const reply = await getClaudeReply(senderId, text);
        await sendMessage(senderId, reply);
      } catch (err) {
        console.error("Error handling message:", err);
      }
    }
  }
});

// ---------------------------------------------------------------
// Ask Claude for a reply, using per-user recent history for context
// ---------------------------------------------------------------
async function getClaudeReply(userId, userText) {
  const history = conversations.get(userId) || [];
  history.push({ role: "user", content: userText });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: history,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Anthropic API error:", data);
    return "Sorry, I'm having trouble replying right now — the owner will get back to you shortly!";
  }

  const replyText = data.content?.find((b) => b.type === "text")?.text?.trim()
    || "Thanks for your message! The owner will follow up with you shortly.";

  history.push({ role: "assistant", content: replyText });
  conversations.set(userId, history.slice(-MAX_TURNS_REMEMBERED * 2));

  return replyText;
}

// ---------------------------------------------------------------
// Send a reply back through the Messenger Send API
// ---------------------------------------------------------------
async function sendMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to send message:", err);
  }
}

app.get("/", (req, res) => res.send("Pappi Suds & Scents Messenger agent is running."));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
