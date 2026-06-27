/**
 * Local scheduled notifications for check-in reminders.
 *
 * IMPORTANT — Expo Go vs Development Build:
 *   Expo Go (SDK 53+) removed Android background notification support.
 *   This module works fully in a **development build** (eas build --profile development).
 *   While running in Expo Go, the functions are no-ops and the in-app countdown
 *   timer in monitor.tsx handles check-ins while the app is foregrounded.
 *
 * To get a dev build:
 *   1. npm install -g eas-cli
 *   2. eas login
 *   3. cd artifacts/trading-psychology-mobile
 *   4. eas build --profile development --platform android
 *   5. Install the resulting .apk on your device — it looks identical to Expo Go
 *      but includes all native modules including background notifications.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { CheckInState, nextCheckInMinutes, CheckInIntervalBase } from "./storage";

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

async function getN() {
  if (Platform.OS === "web") return null;
  if (isExpoGo()) return null; // silently skip — dev build required
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function setupNotificationHandler(): Promise<void> {
  const N = await getN();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Create a dedicated Android notification channel
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("checkins", {
      name: "Trade check-ins",
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#06b6d4",
      sound: "default",
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = await getN();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === "granted") return true;
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
  const N = await getN();
  if (!N) return null;

  try {
    // Cancel any previously scheduled check-in (only one pending at a time)
    await N.cancelAllScheduledNotificationsAsync();

    const minutes = nextCheckInMinutes(state, base);
    const stateLabels: Record<CheckInState, string> = {
      CALM: "🙂 Last check-in: Calm",
      WATCHING: "😐 Last check-in: Watching closely",
      URGE: "😬 Last check-in: Urge to act",
      ANXIOUS: "😰 Last check-in: Anxious",
    };

    const id = await N.scheduleNotificationAsync({
      content: {
        title: "ApexTerm — check in on your trade",
        body: `${stateLabels[state]}  ·  Right now: 🙂 😐 😬 😰`,
        data: { tradeId, type: "checkin" },
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "checkins" }),
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
  const N = await getN();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}
