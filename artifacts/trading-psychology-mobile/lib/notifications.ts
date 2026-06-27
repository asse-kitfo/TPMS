/**
 * Local scheduled notifications for check-in reminders + stale-trade nudges.
 *
 * IMPORTANT — Expo Go vs Development Build:
 *   Expo Go (SDK 53+) removed Android background notification support.
 *   This module works fully in a **development build** (eas build --profile development).
 *   While running in Expo Go, these functions are no-ops; the in-app countdown
 *   timer and stale-trade banner in monitor.tsx cover the foregrounded case.
 *
 * To get a dev build:
 *   1. npm install -g eas-cli
 *   2. eas login
 *   3. cd artifacts/trading-psychology-mobile
 *   4. eas build --profile development --platform android
 *   5. Install the resulting .apk — scan the same QR code as Expo Go.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { CheckInState, nextCheckInMinutes, CheckInIntervalBase } from "./storage";

export const STALE_TRADE_HOURS = 4;

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

async function getN() {
  if (Platform.OS === "web") return null;
  if (isExpoGo()) return null;
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
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("checkins", {
      name: "Trade check-ins",
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#06b6d4",
      sound: "default",
    });
    await N.setNotificationChannelAsync("reminders", {
      name: "Trade reminders",
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: "#f59e0b",
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

/**
 * Schedule the next check-in notification AND the stale-trade nudge together.
 * Cancels all previously scheduled notifications first so there is never
 * more than one of each pending at a time.
 *
 * @param lastActivityIso  ISO timestamp of last check-in (or trade start).
 *                         Used to compute when the 4-hour stale window fires.
 */
export async function scheduleTradeNotifications(
  tradeId: string,
  state: CheckInState,
  base: CheckInIntervalBase = 5,
  lastActivityIso: string,
): Promise<void> {
  const N = await getN();
  if (!N) return;

  try {
    await N.cancelAllScheduledNotificationsAsync();

    const stateLabels: Record<CheckInState, string> = {
      CALM:     "🙂 Last check-in: Calm",
      WATCHING: "😐 Last check-in: Watching closely",
      URGE:     "😬 Last check-in: Urge to act",
      ANXIOUS:  "😰 Last check-in: Anxious",
    };

    // 1 — next check-in
    const checkInSeconds = nextCheckInMinutes(state, base) * 60;
    await N.scheduleNotificationAsync({
      content: {
        title: "ApexTerm — check in on your trade",
        body: `${stateLabels[state]}  ·  Right now: 🙂 😐 😬 😰`,
        data: { tradeId, type: "checkin" },
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "checkins" }),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: checkInSeconds,
        repeats: false,
      },
    });

    // 2 — stale-trade nudge (4 hours after last activity)
    const lastActivityMs = new Date(lastActivityIso).getTime();
    const staleFireMs = lastActivityMs + STALE_TRADE_HOURS * 60 * 60 * 1000;
    const staleSecondsFromNow = Math.floor((staleFireMs - Date.now()) / 1000);

    if (staleSecondsFromNow > checkInSeconds) {
      // Only schedule the stale nudge if it fires AFTER the next check-in
      // (avoids redundancy if the check-in fires first)
      await N.scheduleNotificationAsync({
        content: {
          title: "Still in a trade?",
          body: `Your ${tradeId ? "trade" : "position"} has been open for ${STALE_TRADE_HOURS}+ hours. Don't forget to close it in ApexTerm — stale trades skew your Journal data.`,
          data: { tradeId, type: "stale" },
          sound: "default",
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: staleSecondsFromNow,
          repeats: false,
        },
      });
    }
  } catch {}
}

/** Legacy alias used elsewhere — schedules check-in only (no stale nudge). */
export async function scheduleCheckInNotification(
  tradeId: string,
  state: CheckInState,
  base: CheckInIntervalBase = 5,
): Promise<string | null> {
  await scheduleTradeNotifications(tradeId, state, base, new Date().toISOString());
  return null;
}

export async function cancelAllCheckInNotifications(): Promise<void> {
  const N = await getN();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}
