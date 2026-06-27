import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { api, Session } from "@/lib/api";
import { loadMaxLosses, saveMaxLosses, loadActiveTrade, ActiveTrade } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { Card, Button, webTop, webBottom } from "@/components/UI";
import { Icon } from "@/components/Icon";

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
  const qc = useQueryClient();

  const [maxLosses, setMaxLosses] = useState(2);
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [elapsed, setElapsed] = useState("");

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: async () => { try { return await api.getCurrentSession(); } catch { return null; } },
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: api.getStatsSummary,
  });

  const { data: streak } = useQuery({
    queryKey: ["discipline-streak"],
    queryFn: api.getDisciplineStreak,
  });

  const startMutation = useMutation({
    mutationFn: () => api.createSession({ mode: "LIVE", maxLosses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No session");
      return api.endSession(session.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  useFocusEffect(useCallback(() => {
    loadMaxLosses().then(setMaxLosses);
    loadActiveTrade().then(setActiveTrade);
  }, []));

  useEffect(() => {
    if (!activeTrade) return;
    const interval = setInterval(() => setElapsed(formatElapsed(activeTrade.startedAt)), 1000);
    setElapsed(formatElapsed(activeTrade.startedAt));
    return () => clearInterval(interval);
  }, [activeTrade?.startedAt]);

  const isSessionActive = session && !session.endedAt;
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
      <View>
        <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>ApexTerm</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
          {isSessionActive ? "Session active" : "No session — start to begin"}
        </Text>
      </View>

      {/* Circuit breaker warning */}
      {isSessionActive && hitLimit && (
        <View style={[styles.alertBanner, { backgroundColor: "#ef444418", borderColor: "#ef4444" }]}>
          <Icon name="alert-octagon" size={16} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 }}>
            CIRCUIT BREAKER — Loss limit reached. End this session.
          </Text>
        </View>
      )}

      {/* In Trade card — shown when a trade is open */}
      {isSessionActive && activeTrade && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/monitor")}
          style={[styles.inTradeBanner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 }}>
              In Trade — {activeTrade.pair} {activeTrade.direction}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              ⏱ {elapsed}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              {activeTrade.checkIns.length} check-in{activeTrade.checkIns.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" }} numberOfLines={2}>
            Invalidation: {activeTrade.invalidation || "—"}
          </Text>
          <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${colors.primary}20` }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" }}>
              Tap to open In Trade screen →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Main session button */}
      {!isSessionActive ? (
        <Card style={{ gap: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: "Inter_700Bold" }}>Start Session</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 }}>
            Begin a trading session to enable check-ins, track losses, and log trades.
          </Text>

          {/* Loss limit selector */}
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
            onPress={() => startMutation.mutate()}
            loading={startMutation.isPending}
            fullWidth
            icon={<Icon name="play" size={14} color={colors.primaryForeground} />}
          />
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Session Active</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${lossColor}18`, borderWidth: 1, borderColor: `${lossColor}40` }}>
                <Text style={{ color: lossColor, fontSize: 12, fontFamily: "Inter_700Bold" }}>
                  {lossCount}/{maxLosses} losses
                </Text>
              </View>
            </View>
          </View>

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
            onPress={() => endMutation.mutate()}
            loading={endMutation.isPending}
            icon={<Icon name="power" size={14} color={colors.destructive} />}
          />
        </Card>
      )}

      {/* Stats */}
      {(stats || streak) && (
        <View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            All-time
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Trades", value: String(stats?.totalTrades ?? 0), color: colors.foreground },
              { label: "Win Rate", value: stats ? `${(stats.winRate * 100).toFixed(0)}%` : "—", color: colors.success },
              { label: "Streak", value: String(streak?.currentStreak ?? 0), color: colors.primary },
            ].map(item => (
              <View key={item.label} style={[styles.statBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1 }]}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</Text>
                <Text style={{ color: item.color, fontSize: 22, fontFamily: "Inter_700Bold" }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  inTradeBanner: { padding: 16, borderRadius: 14, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statBox: { padding: 12, borderRadius: 12, gap: 4, alignItems: "center" },
});
