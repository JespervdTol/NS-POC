import { BusyBlock } from "./calendar";
import { RouteOption, TravelDisruption, AlternativesQuery } from "./travel";

export type Recommendation = {
  chosen: RouteOption;
  reason: string;
  confidence: number;

  meta?: {
    meetingStart?: string;
    arriveBy?: string;
    bufferMin?: number;
    selectedOptionId?: string | null;

    selectedStillFits?: boolean;
    willArriveOnTime?: boolean;

    usedWidenedSearch?: boolean;
    departAfter?: string;

    currentTimeHHMM?: string;
    departAfterEffective?: string | null;
  };
};

export interface ReasoningProvider {
  name: string;

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

    currentTimeHHMM?: string | null;
    departAfterEffective?: string | null;
  }): Promise<Recommendation | null>;
}