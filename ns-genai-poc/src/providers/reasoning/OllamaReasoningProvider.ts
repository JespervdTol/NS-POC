import { ReasoningProvider, Recommendation } from "../../core/types/reasoning";
import { BusyBlock } from "../../core/types/calendar";
import { RouteOption, TravelDisruption } from "../../core/types/travel";

type ReasonResponse = { text?: string };

export class OllamaReasoningProvider implements ReasoningProvider {
  name = "OllamaReasoningProvider";

  constructor(private deps: { baseUrl: string }) {}

  async recommend(params: {
    busyBlocks: BusyBlock[];
    disruption: TravelDisruption;
    alternatives: RouteOption[];
    now: Date;
  }): Promise<Recommendation> {
    const { disruption, alternatives, busyBlocks, now } = params;

    const nextEvent = busyBlocks
      .map((b) => b.start)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const minutesToNextEvent = nextEvent
      ? Math.round((nextEvent.getTime() - now.getTime()) / 60000)
      : null;

    const prompt = `
You are an NS travel assistant. Choose ONE best option from the alternatives.
Goal: reduce stress and maximize on-time arrival, especially if time-critical.

Context:
- Disruption: ${disruption}
- Minutes until next calendar event: ${minutesToNextEvent ?? "none"}

Alternatives (JSON):
${JSON.stringify(alternatives, null, 2)}

Return ONLY valid JSON in this schema:
{
  "chosenRouteId": "string",
  "reason": "string",
  "confidence": number
}
confidence must be between 0 and 1.
`;

    const r = await fetch(`${this.deps.baseUrl}/reason`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!r.ok) {
      const t = await r.text();
      return {
        chosen: alternatives[0],
        reason: `LLM unavailable (HTTP ${r.status}). Falling back to first option.`,
        confidence: 0.5,
      };
    }

    const data = (await r.json()) as ReasonResponse;
    const text = (data.text || "").trim();

    const extracted = extractJson(text);

    try {
      const parsed = JSON.parse(extracted) as {
        chosenRouteId: string;
        reason: string;
        confidence: number;
      };

      const chosen = alternatives.find((a) => a.id === parsed.chosenRouteId) ?? alternatives[0];
      const confidence = clamp01(Number(parsed.confidence));

      return {
        chosen,
        reason: String(parsed.reason || "Recommended based on current context."),
        confidence: Number.isFinite(confidence) ? confidence : 0.7,
      };
    } catch {
      return {
        chosen: alternatives[0],
        reason: "Recommended based on current context.",
        confidence: 0.65,
      };
    }
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.7;
  return Math.max(0, Math.min(1, n));
}

function extractJson(s: string) {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}