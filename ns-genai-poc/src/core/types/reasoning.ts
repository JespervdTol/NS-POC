import { BusyBlock } from "./calendar";
import { RouteOption, TravelDisruption, AlternativesQuery } from "./travel";

export type Recommendation = {
  chosen: RouteOption;
  reason: string;
  confidence: number;

  // Optional extras the UI can show later (trust / transparency)
  meta?: {
    arriveBy?: string; // "HH:MM"
    bufferMin?: number;
    meetingStart?: string; // "HH:MM"
    willArriveOnTime?: boolean;
    selectedOptionId?: string | null;
    selectedStillFits?: boolean;
    usedWidenedSearch?: boolean;
    departAfter?: string | undefined;
  };
};

export interface ReasoningProvider {
  name: string;
  recommend(params: {
    busyBlocks: BusyBlock[];
    disruption: TravelDisruption;
    alternatives: RouteOption[];
    now: Date;

    // NEW (optional) context so the LLM can really decide
    selectedOption?: RouteOption | null;
    bufferMin?: number | null;
    arriveByHHMM?: string | null;
    meetingStartHHMM?: string | null;
    travelQuery?: AlternativesQuery;
  }): Promise<Recommendation>;
}