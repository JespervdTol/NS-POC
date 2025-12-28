import { Recommendation } from "./reasoning";

export type AlertType = "disruption" | "calendar_change";

export type TravelAlert = {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  createdAt: number;
  recommendation?: Recommendation; // shown on home card after tap
};