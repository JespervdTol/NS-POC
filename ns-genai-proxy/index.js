import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const NS_BASE = process.env.NS_BASE_URL || "https://gateway.apiportal.ns.nl";
const NS_KEY = process.env.NS_SUBSCRIPTION_KEY;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/ns/ping", (req, res) => {
  if (!NS_KEY) {
    return res.status(500).json({ ok: false, error: "Missing NS key" });
  }
  res.json({ ok: true, message: "NS key loaded (not exposed)" });
});

app.post("/reason", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const r = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.1",
        prompt,
        stream: false,
      }),
    });

    const data = await r.json();
    res.json({ text: data.response ?? "" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`NS proxy running on http://localhost:${port}`);
});