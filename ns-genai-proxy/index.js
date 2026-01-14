import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const NS_BASE = process.env.NS_BASE_URL || "https://gateway.apiportal.ns.nl/reisinformatie-api";
const NS_KEY = process.env.NS_SUBSCRIPTION_KEY;

if (!NS_KEY) {
  console.warn("⚠️  NS_SUBSCRIPTION_KEY missing in .env");
}

app.get("/", (_, res) => {
  res.send("NS GenAI Proxy running. Try /health or /ns/reisinformatie/arrivals?station=UT");
});

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.all("/ns/reisinformatie/:endpoint", async (req, res) => {
  try {
    if (!NS_KEY) {
      return res.status(500).json({ error: "Missing NS subscription key" });
    }

    const { endpoint } = req.params;

    const version = req.query.v || "2";
    delete req.query.v;

    const url = new URL(`${NS_BASE}/api/v${version}/${endpoint}`);

    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, String(value));
    }

    console.log("Proxying to NS:", url.toString());

    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        "Ocp-Apim-Subscription-Key": NS_KEY,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    res.status(response.status);
    res.set("Content-Type", response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err) {
    console.error("NS proxy error:", err);
    res.status(500).json({ error: "NS proxy failed" });
  }
});

app.post("/reason", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.1",
        prompt,
        stream: false,

        format: "json",

        options: { temperature: 0.2 },
      }),
    });

    if (!ollamaResponse.ok) {
      const t = await ollamaResponse.text();
      return res.status(500).json({
        error: `Ollama HTTP ${ollamaResponse.status}: ${t.slice(0, 200)}`,
      });
    }

    const data = await ollamaResponse.json();
    const text = String(data?.response ?? "").trim();

    if (!text) {
      return res.status(500).json({ error: "Ollama returned empty response" });
    }

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: "LLM reasoning failed" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`🚆 NS proxy running on http://localhost:${port}`);
});