import { ReasoningProvider, Recommendation } from "../../core/types/reasoning";
import { BusyBlock } from "../../core/types/calendar";
import { RouteOption, TravelDisruption, AlternativesQuery } from "../../core/types/travel";

type ReasonResponse = { text?: string };

export class OllamaReasoningProvider implements ReasoningProvider {
  name = "OllamaReasoningProvider";

  constructor(private deps: { baseUrl: string }) {}

  async recommend(params: {
    busyBlocks: BusyBlock[];
    disruption: TravelDisruption;
    alternatives: RouteOption[];
    now: Date;

    selectedOption?: RouteOption | null;
    bufferMin?: number | null;
    meetingStartHHMM?: string | null;
    arriveByHHMM?: string | null;
    travelQuery?: AlternativesQuery;
    usedWidenedSearch?: boolean;
  }): Promise<Recommendation | null> {
    const {
      disruption,
      alternatives,
      busyBlocks,
      now,
      selectedOption,
      bufferMin,
      meetingStartHHMM,
      arriveByHHMM,
      travelQuery,
      usedWidenedSearch,
    } = params;

    const nextEvent = busyBlocks
      .map((b) => b.start)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const minutesToNextEvent = nextEvent
      ? Math.round((nextEvent.getTime() - now.getTime()) / 60000)
      : null;

    const validIds = alternatives.map((a) => a.id);

    const basePrompt = `
You are an NS proactive travel assistant.

You must choose exactly ONE route from the alternatives by returning its id.

Task:
1) Decide if the selected train still fits (arrives <= arriveBy).
2) If not, choose the best alternative that DOES arrive before arriveBy.
   - If multiple fit: pick the one that arrives closest before arriveBy.
3) If none fit: choose the earliest arriving option and clearly say it will be late.

Critical constraint:
- You MUST output chosenRouteId that EXACTLY matches one of the provided ids.

Context:
- Disruption: ${disruption}
- Minutes until next calendar event: ${minutesToNextEvent ?? "none"}
- Meeting start (HH:MM): ${meetingStartHHMM ?? "unknown"}
- Arrive-by (HH:MM): ${arriveByHHMM ?? "unknown"}
- Buffer minutes: ${bufferMin ?? "unknown"}
- Used widened search: ${usedWidenedSearch ? "true" : "false"}
- Selected option: ${selectedOption ? JSON.stringify(selectedOption) : "none"}
- Travel query: ${travelQuery ? JSON.stringify(travelQuery) : "none"}

Valid ids:
${JSON.stringify(validIds)}

Alternatives (JSON):
${JSON.stringify(alternatives, null, 2)}

Return ONLY valid JSON:
{
  "chosenRouteId": "string",
  "reason": "string",
  "confidence": number,
  "willArriveOnTime": boolean,
  "selectedStillFits": boolean
}
confidence must be between 0 and 1.
`.trim();

    const attempt = async (prompt: string, label: string) => {
      let r: Response;
      try {
        r = await fetch(`${this.deps.baseUrl}/reason`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
      } catch (e) {
        console.log(`[LLM] ${label} network error`, String(e));
        return null;
      }

      const rawText = await r.text();

      if (!r.ok) {
        console.log(`[LLM] ${label} HTTP ${r.status}`, rawText.slice(0, 180));
        return null;
      }

      let parsedResp: ReasonResponse | null = null;
      try {
        parsedResp = JSON.parse(rawText) as ReasonResponse;
      } catch {
        parsedResp = { text: rawText };
      }

      const text = (parsedResp.text || "").trim();
      const extracted = extractJson(text);

      console.log(`[LLM] ${label} raw:`, text.slice(0, 180));
      console.log(`[LLM] ${label} extracted:`, extracted.slice(0, 180));

      try {
        const parsed = JSON.parse(extracted) as {
          chosenRouteId: string;
          reason: string;
          confidence: number;
          willArriveOnTime?: boolean;
          selectedStillFits?: boolean;
        };

        const chosen = alternatives.find((a) => a.id === parsed.chosenRouteId) ?? null;

        if (!chosen) {
          console.log(
            `[LLM] ${label} INVALID chosenRouteId:`,
            parsed.chosenRouteId,
            "valid:",
            validIds
          );
          return { invalidId: true as const, parsed };
        }

        const rec: Recommendation = {
          chosen,
          reason: String(parsed.reason || "Recommended based on current context."),
          confidence: clamp01(Number(parsed.confidence)),
          meta: {
            meetingStart: meetingStartHHMM ?? undefined,
            arriveBy: arriveByHHMM ?? undefined,
            bufferMin: bufferMin ?? undefined,
            selectedOptionId: selectedOption?.id ?? null,
            willArriveOnTime:
              typeof parsed.willArriveOnTime === "boolean" ? parsed.willArriveOnTime : undefined,
            selectedStillFits:
              typeof parsed.selectedStillFits === "boolean" ? parsed.selectedStillFits : undefined,
            usedWidenedSearch: !!usedWidenedSearch,
            departAfter: travelQuery?.departAfter,
          },
        };

        return { invalidId: false as const, rec };
      } catch (e) {
        console.log(`[LLM] ${label} JSON parse failed`, String(e));
        return null;
      }
    };

    const res1 = await attempt(basePrompt, "attempt1");
    if (res1 && "invalidId" in res1 && res1.invalidId === false) {
      return res1.rec;
    }

    if (res1 && "invalidId" in res1 && res1.invalidId === true) {
      const retryPrompt = `
Your previous answer used an invalid chosenRouteId.

You MUST choose ONE id from this list EXACTLY:
${JSON.stringify(validIds)}

Return ONLY valid JSON in the same schema:
{
  "chosenRouteId": "string",
  "reason": "string",
  "confidence": number,
  "willArriveOnTime": boolean,
  "selectedStillFits": boolean
}

Re-evaluate using these alternatives:
${JSON.stringify(alternatives, null, 2)}
`.trim();

      const res2 = await attempt(retryPrompt, "attempt2");
      if (res2 && "invalidId" in res2 && res2.invalidId === false) {
        return res2.rec;
      }
    }

    console.log("[LLM] strict-mode: returning null (no recommendation)");
    return null;
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