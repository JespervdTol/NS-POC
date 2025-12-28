import { ReasoningProvider, Recommendation } from "../../core/types/reasoning";

export class RuleReasoningProvider implements ReasoningProvider {
  name = "RuleReasoningProvider";

  async recommend(params: {
    busyBlocks: { start: Date; end: Date }[];
    disruption: "none" | "cancelled" | "delayed";
    alternatives: { id: string; summary: string; arrivalTime: string; changes: number }[];
    now: Date;
  }): Promise<Recommendation> {
    const { disruption, alternatives, busyBlocks, now } = params;

    const nextEventStart = busyBlocks
      .map((b) => b.start)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const timeCritical = nextEventStart
      ? nextEventStart.getTime() - now.getTime() < 2 * 60 * 60 * 1000
      : false;

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const sorted = [...alternatives].sort((x, y) => toMin(x.arrivalTime) - toMin(y.arrivalTime));
    const chosen = sorted[0];

    let reason = "Based on current information, this is the fastest option.";
    let confidence = 0.75;

    if (disruption === "none") {
      reason = timeCritical
        ? "You have a time-sensitive event later. I’ll monitor your journey and alert you only if something changes."
        : "All looks good. I’ll stay quiet unless something important changes.";
      confidence = 0.9;
    }

    if (disruption === "cancelled") {
      reason = timeCritical
        ? "Your planned train is cancelled and you have a time-sensitive event. This option maximizes on-time arrival."
        : "Your planned train is cancelled. This option gets you there with minimal delay.";
      confidence = 0.8;
    }

    if (disruption === "delayed") {
      reason = timeCritical
        ? "Your train is delayed and you have a time-sensitive event. This option reduces the risk of being late."
        : "Your train is delayed. This option reduces overall delay.";
      confidence = 0.7;
    }

    return { chosen, reason, confidence };
  }
}