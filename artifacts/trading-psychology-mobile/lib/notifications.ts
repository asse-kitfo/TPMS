import { Platform } from "react-native";
import { CheckInState, nextCheckInMinutes, CheckInIntervalBase } from "./storage";

// Lazy-load expo-notifications only on native to avoid web crashes
let Notifications: typeof import("expo-notifications") | null = null;

async function getNotifications() {
  if (Platform.OS === "web") return null;
  if (!Notifications) {
    Notifications = await import("expo-notifications");
  }
  return Notifications;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;
  try {
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleCheckInNotification(
  tradeId: string,
  state: CheckInState,
  base: CheckInIntervalBase = 5,
): Promise<string | null> {
  const N = await getNotifications();
  if (!N) return null;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    const minutes = nextCheckInMinutes(state, base);
    const id = await N.scheduleNotificationAsync({
      content: {
        title: "Check in on your trade",
        body: "Right now: 🙂 Calm  😐 Watching  😬 Urge  😰 Anxious",
        data: { tradeId },
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
        repeats: false,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelAllCheckInNotifications(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export function setupNotificationHandler(): void {
  if (Platform.OS === "web") return;
  import("expo-notifications").then(N => {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }).catch(() => {});
}
