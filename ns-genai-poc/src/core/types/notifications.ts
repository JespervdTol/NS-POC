import { TravelAlert } from "./alerts";

export interface NotificationProvider {
  name: string;

  notify(alert: TravelAlert): void;

  onReceive(listener: (alert: TravelAlert) => void): () => void;
}