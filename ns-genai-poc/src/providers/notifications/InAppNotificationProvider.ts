import { NotificationProvider } from "../../core/types/notifications";
import { TravelAlert } from "../../core/types/alerts";
import { NotificationBus } from "../../core/notifications/NotificationBus";

export class InAppNotificationProvider implements NotificationProvider {
  name = "InAppNotificationProvider";

  private bus = new NotificationBus<TravelAlert>();

  notify(alert: TravelAlert) {
    // For POC: emit immediately. Later: use expo-notifications push.
    this.bus.emit(alert);
  }

  onReceive(listener: (alert: TravelAlert) => void) {
    return this.bus.subscribe(listener);
  }
}