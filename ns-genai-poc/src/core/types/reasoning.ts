import { BusyBlock } from "./calendar";
import { RouteOption, TravelDisruption } from "./travel";

export type Recommendation = {
  chosen: RouteOption;
  reason: string;
  confidence: number; // 0..1
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