import { BusyBlock } from "./calendar";
import { RouteOption, TravelDisruption, AlternativesQuery } from "./travel";

export type Recommendation = {
  chosen: RouteOption;
  reason: string;
  confidence: number;

  meta?: {
    meetingStart?: string;        // "HH:MM"
    arriveBy?: string;            // "HH:MM"
    bufferMin?: number;
    selectedOptionId?: string | null;
    selectedStillFits?: boolean;
    willArriveOnTime?: boolean;
    usedWidenedSearch?: boolean;
    departAfter?: string;
  };
};

export interface ReasoningProvider {
  name: string;

  // ✅ may return null if LLM fails or refuses
  recommend(params: {
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
  }): Promise<Recommendation | null>;
}