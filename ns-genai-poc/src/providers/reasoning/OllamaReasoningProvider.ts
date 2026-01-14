import { ReasoningProvider, Recommendation } from "../../core/types/reasoning";
import { BusyBlock } from "../../core/types/calendar";
import { RouteOption, TravelDisruption, AlternativesQuery } from "../../core/types/travel";

type ReasonResponse = { text?: string };

function parseHHMM(s: string | undefined | null): number | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
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

function safeStr(x: any) {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

function containsHardCertainty(s: string) {
  const t = s.toLowerCase();
  // Disallow strong certainty
  const hard = [" will ", " definitely", " guarantee", " certainly", "100%", " for sure"];
  return hard.some((w) => t.includes(w));
}

function hasSoftLanguage(s: string) {
  const t = s.toLowerCase();
  const soft = ["should", "likely", "looks like", "i suggest", "i’d suggest", "might", "probably"];
  return soft.some((w) => t.includes(w));
}

function looksTooGenericReason(s: string) {
  const t = s.trim().toLowerCase();
  if (!t) return true;

  // Reject common regressions like “earliest arriving option”
  const banned = [
    "earliest arriving option",
    "earliest option",
    "best option",
    "closest arrival before arriveby",
    "closest arrival before arrivebyhhmm",
    "closest arrival",
  ];
  if (banned.some((b) => t === b || t.includes(b))) return true;

  // Too short => not demo-quality
  if (t.length < 90) return true;

  // Bullet-ish patterns (we want a short paragraph)
  if (t.includes("\n-") || t.includes("\n•") || t.includes("•")) return true;

  return false;
}

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

    currentTimeHHMM?: string | null;
    departAfterEffective?: string | null;
  }): Promise<Recommendation | null> {
    const {
      disruption,
      alternatives,
      selectedOption,
      bufferMin,
      meetingStartHHMM,
      arriveByHHMM,
      travelQuery,
      usedWidenedSearch,
      currentTimeHHMM,
      departAfterEffective,
    } = params;

    const validIds = alternatives.map((a) => a.id);

    const arriveByMin = parseHHMM(arriveByHHMM ?? null);
    const nowMin = parseHHMM(currentTimeHHMM ?? null);
    const departAfterMin = parseHHMM(
      departAfterEffective ??
        (typeof travelQuery?.departAfter === "string" ? travelQuery.departAfter : null)
    );

    const canGuard = arriveByMin !== null && nowMin !== null;

    const optDepMin = (opt: RouteOption) => parseHHMM((opt as any).departureTime ?? null);
    const optArrMin = (opt: RouteOption) => parseHHMM(opt.arrivalTime ?? null);

    const isOptDepartOk = (opt: RouteOption) => {
      const dep = optDepMin(opt);
      if (dep === null) return true;
      if (nowMin !== null && dep < nowMin) return false;
      if (departAfterMin !== null && dep < departAfterMin) return false;
      return true;
    };

    const isOptArriveOnTime = (opt: RouteOption) => {
      if (arriveByMin === null) return true;
      const arr = optArrMin(opt);
      if (arr === null) return true;
      return arr <= arriveByMin;
    };

    const eligibleOnTimeIds =
      canGuard
        ? alternatives.filter((o) => isOptDepartOk(o) && isOptArriveOnTime(o)).map((o) => o.id)
        : [];

    const basePrompt = `
You are an NS proactive travel assistant.

You must choose exactly ONE route id from the alternatives.

HARD RULES (must follow):
1) Never choose a route that departs before currentTimeHHMM.
2) Never choose a route that departs before departAfterEffective.
3) If arriveByHHMM is provided: prefer routes that arrive <= arriveByHHMM.
4) chosenRouteId MUST exactly match one of the provided ids.

Decision logic:
A) If selectedOption exists and arrives <= arriveByHHMM, keep it.
B) Otherwise pick the best option that arrives <= arriveByHHMM:
   - if multiple fit: pick the one that arrives closest BEFORE arriveByHHMM.
C) If none fit: pick the earliest arriving option and say gently that timing may be tight.

Tone + explanation requirements (VERY IMPORTANT):
- Output the reason as a SHORT paragraph of exactly 2 sentences (no bullet points, no line breaks).
- Calm and reassuring.
- Never use certainty words like "will", "definitely", "guarantee", "100%".
- Use soft language like "should", "likely", "looks like", "I suggest".
- Mention: schedule changed + arrive-by/buffer + why this option.

Context:
- Disruption: ${disruption}
- Meeting start (HH:MM): ${meetingStartHHMM ?? "unknown"}
- Arrive-by (HH:MM): ${arriveByHHMM ?? "unknown"}
- Inferred bufferMin (user preference): ${bufferMin ?? "unknown"}
- currentTimeHHMM: ${currentTimeHHMM ?? "unknown"}
- departAfterEffective: ${
      departAfterEffective ??
      (typeof travelQuery?.departAfter === "string" ? travelQuery.departAfter : "unknown")
    }
- Used widened search: ${usedWidenedSearch ? "true" : "false"}

Selected option:
${selectedOption ? JSON.stringify(selectedOption, null, 2) : "none"}

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

      let parsedResp: ReasonResponse;
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
          console.log(`[LLM] ${label} INVALID chosenRouteId`, parsed.chosenRouteId);
          return { kind: "invalidId" as const };
        }

        // Guardrail: reject choices that violate time constraints if we can check them
        if (canGuard) {
          const violatesDepart = !isOptDepartOk(chosen);
          const violatesArrive = !isOptArriveOnTime(chosen);
          if (violatesDepart || violatesArrive) {
            console.log(
              `[LLM] ${label} VIOLATION`,
              JSON.stringify({
                chosen: chosen.id,
                violatesDepart,
                violatesArrive,
                currentTimeHHMM,
                departAfterEffective,
                arriveByHHMM,
              })
            );
            return { kind: "violatesRules" as const };
          }
        }

        const reason = safeStr(parsed.reason).replace(/\s+/g, " ").trim();

        // Enforce the tone/quality we want for the demo
        if (
          looksTooGenericReason(reason) ||
          containsHardCertainty(reason) ||
          !hasSoftLanguage(reason)
        ) {
          console.log(
            `[LLM] ${label} BAD_REASON`,
            JSON.stringify({
              tooGeneric: looksTooGenericReason(reason),
              hardCertainty: containsHardCertainty(reason),
              missingSoft: !hasSoftLanguage(reason),
              reasonPreview: reason.slice(0, 140),
            })
          );
          return { kind: "badReason" as const };
        }

        const rec: Recommendation = {
          chosen,
          reason,
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
            departAfter: typeof travelQuery?.departAfter === "string" ? travelQuery.departAfter : undefined,
            currentTimeHHMM: currentTimeHHMM ?? undefined,
            departAfterEffective: departAfterEffective ?? undefined,
          } as any,
        };

        return { kind: "ok" as const, rec };
      } catch (e) {
        console.log(`[LLM] ${label} JSON parse failed`, String(e));
        return null;
      }
    };

    const res1 = await attempt(basePrompt, "attempt1");
    if (res1?.kind === "ok") return res1.rec;

    if (res1?.kind === "invalidId" || res1?.kind === "violatesRules" || res1?.kind === "badReason") {
      const constraint =
        canGuard && eligibleOnTimeIds.length > 0
          ? `You MUST choose an id from this ON-TIME eligible list:\n${JSON.stringify(eligibleOnTimeIds)}`
          : `You MUST choose an id from the valid list:\n${JSON.stringify(validIds)}`;

      const retryPrompt = `
Your previous answer was not acceptable (${res1.kind}).

${constraint}

Rewrite your answer. Requirements:
- reason must be EXACTLY 2 sentences, one paragraph, no bullets, no line breaks.
- calm and reassuring tone.
- never use certainty words ("will", "definitely", "guarantee", "100%").
- use soft language ("should", "likely", "looks like", "I suggest").
- mention schedule change + arrive-by/buffer + why this option.

Return ONLY valid JSON:
{
  "chosenRouteId": "string",
  "reason": "string",
  "confidence": number,
  "willArriveOnTime": boolean,
  "selectedStillFits": boolean
}

Alternatives (JSON):
${JSON.stringify(alternatives, null, 2)}
`.trim();

      const res2 = await attempt(retryPrompt, "attempt2");
      if (res2?.kind === "ok") return res2.rec;
    }

    console.log("[LLM] strict-mode: returning null (no recommendation)");
    return null;
  }
}