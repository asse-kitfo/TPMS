/**
 * Notification scheduling is disabled in Expo Go (SDK 53+ removed Android push
 * support from Expo Go). The in-app countdown timer in monitor.tsx handles
 * check-in triggers while the app is foregrounded. Background notifications
 * require a development build — stub everything out here so Expo Go doesn't crash.
 */
import { CheckInState, CheckInIntervalBase } from "./storage";

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function scheduleCheckInNotification(
  _tradeId: string,
  _state: CheckInState,
  _base?: CheckInIntervalBase,
): Promise<string | null> {
  return null;
}

export async function cancelAllCheckInNotifications(): Promise<void> {}

export function setupNotificationHandler(): void {}
