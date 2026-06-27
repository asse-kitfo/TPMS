import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Card, Button, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";
import {
  loadLocalSession, startLocalSession, endLocalSession,
  loadMaxLosses, saveMaxLosses, loadActiveTrade,
  LocalSession, ActiveTrade,
} from "@/lib/storage";

function formatElapsed(startIso: string) {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function HubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<LocalSession | null>(null);
  const [maxLosses, setMaxLosses] = useState(2);
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [tradeElapsed, setTradeElapsed] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const reload = useCallback(async () => {
    const [s, ml, at] = await Promise.all([
      loadLocalSession(),
      loadMaxLosses(),
      loadActiveTrade(),
    ]);
    setSession(s);
    setMaxLosses(ml);
    setActiveTrade(at);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Session elapsed ticker
  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(formatElapsed(session.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  // Trade elapsed ticker
  useEffect(() => {
    if (!activeTrade) return;
    const tick = () => setTradeElapsed(formatElapsed(activeTrade.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTrade?.startedAt]);

  async function handleStart() {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const s = await startLocalSession(maxLosses);
    setSession(s);
    setLoading(false);
  }

  async function handleEnd() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await endLocalSession();
    setSession(null);
  }

  const isActive = !!session;
  const lossCount = session?.lossCount ?? 0;
  const lossRatio = maxLosses > 0 ? lossCount / maxLosses : 0;
  const lossColor = lossRatio === 0 ? colors.success : lossRatio < 1 ? colors.warning : colors.destructive;
  const hitLimit = lossCount >= maxLosses;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>ApexTerm</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
            {isActive ? `Session active · ${elapsed}` : "No session — start to begin"}
          </Text>
        </View>
        {isActive && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: `${lossColor}18`, borderWidth: 1, borderColor: `${lossColor}40` }}>
            <Text style={{ color: lossColor, fontSize: 13, fontFamily: "Inter_700Bold" }}>
              {lossCount}/{maxLosses} losses
            </Text>
          </View>
        )}
      </View>

      {/* Circuit breaker */}
      {isActive && hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: "#ef444418", borderColor: "#ef4444" }]}>
          <Icon name="alert-octagon" size={16} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            CIRCUIT BREAKER — Loss limit reached. End this session.
          </Text>
        </View>
      )}

      {/* In Trade card */}
      {isActive && activeTrade && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/monitor")}
          style={[styles.inTradeBanner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 }}>
              In Trade — {activeTrade.pair} {activeTrade.direction}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
          <View style={{ flexDirection: "row", gap: 14, marginBottom: 8 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              ⏱ {tradeElapsed}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              {activeTrade.checkIns.length} check-in{activeTrade.checkIns.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {activeTrade.invalidation ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" }} numberOfLines={2}>
              Invalidation: {activeTrade.invalidation}
            </Text>
          ) : null}
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${colors.primary}20` }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
              Tap to open In Trade screen →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Start / active session card */}
      {!isActive ? (
        <Card style={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_700Bold" }}>Start Session</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
            Begin a trading session to enable check-ins, track losses, and log trades.
          </Text>

          <View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Daily Loss Limit
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => { setMaxLosses(n); saveMaxLosses(n); Haptics.selectionAsync(); }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: maxLosses === n ? colors.primary : colors.border, backgroundColor: maxLosses === n ? `${colors.primary}18` : colors.secondary }}
                >
                  <Text style={{ color: maxLosses === n ? colors.primary : colors.mutedForeground, fontSize: 16, fontFamily: "Inter_700Bold" }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            label="Start Session"
            onPress={handleStart}
            loading={loading}
            fullWidth
            icon={<Icon name="play" size={14} color={colors.primaryForeground} />}
          />
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          {!activeTrade && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/gate")}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}10` }}
            >
              <Icon name="edit-2" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Log a Trade Plan</Text>
            </TouchableOpacity>
          )}

          <Button
            label="End Session"
            variant="ghost"
            onPress={handleEnd}
            icon={<Icon name="power" size={14} color={colors.destructive} />}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  inTradeBanner: { padding: 16, borderRadius: 14, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
