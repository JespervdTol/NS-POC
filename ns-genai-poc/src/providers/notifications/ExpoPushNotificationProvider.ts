import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { NotificationProvider } from "../../core/types/notifications";
import { TravelAlert } from "../../core/types/alerts";

type Handler = (a: TravelAlert) => void;

export class ExpoPushNotificationProvider implements NotificationProvider {
  name = "ExpoPushNotificationProvider";

  private handlers: Handler[] = [];
  private responseSub: Notifications.Subscription | null = null;

  constructor() {
    this.init().catch((e) => console.log("[NOTIFS] init error:", String(e?.message || e)));
  }

  onReceive(handler: Handler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  notify(alert: TravelAlert): void {
    this.emit(alert);

    this.scheduleLocal(alert).catch((e) =>
      console.log("[NOTIFS] scheduleLocal error:", String(e?.message || e))
    );
  }

  private emit(alert: TravelAlert) {
    for (const h of this.handlers) h(alert);
  }

  private async init() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });


    if (Platform.OS === "web") return;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[NOTIFS] permission not granted");
      }
    } else {
      console.log("[NOTIFS] must use a physical device for iOS notifications");
    }

    this.responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;

      const alert = data?.alert as TravelAlert | undefined;

      if (alert) {
        console.log("[NOTIFS] tapped notification -> showing card");
        this.emit(alert);
      }
    });
  }

  private async scheduleLocal(alert: TravelAlert) {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.body,
        data: { alert },
      },
      trigger: null,
    });
  }
}