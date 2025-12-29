import { BusyBlock } from "./calendar";
import { RouteOption, TravelDisruption } from "./travel";

export type Recommendation = {
  chosen: RouteOption;
  reason: string;
  confidence: number;
};

export interface ReasoningProvider {
  name: string;
  recommend(params: {
    busyBlocks: BusyBlock[];
    disruption: TravelDisruption;
    alternatives: RouteOption[];
    now: Date;
  }): Promise<Recommendation>;
}