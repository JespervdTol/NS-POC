import { TravelAlert } from "./alerts";

export interface NotificationProvider {
  name: string;

  // Send a notification (real push later)
  notify(alert: TravelAlert): void;

  // Subscribe to notification events (tap, delivery, etc.)
  onReceive(listener: (alert: TravelAlert) => void): () => void;
}