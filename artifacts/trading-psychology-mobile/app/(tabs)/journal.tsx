import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Badge, EmptyState, webTop, webBottom } from "@/components/UI";
import { loadCompletedTrades, CompletedTrade, TradeCheckIn, CheckInState, TradeOutcome } from "@/lib/storage";

const STATE_META: Record<CheckInState, { emoji: string; label: string; color: string }> = {
  CALM:     { emoji: "🙂", label: "Calm",            color: "#22c55e" },
  WATCHING: { emoji: "😐", label: "Watching closely", color: "#f59e0b" },
  URGE:     { emoji: "😬", label: "Urge to act",     color: "#f97316" },
  ANXIOUS:  { emoji: "😰", label: "Anxious",         color: "#ef4444" },
};
const OUTCOME_META: Record<TradeOutcome, { color: string; label: string }> = {
  win:       { color: "#22c55e", label: "WIN" },
  loss:      { color: "#ef4444", label: "LOSS" },
  breakeven: { color: "#71717a", label: "B/E" },
};

/* ── Win-rate-by-worst-state chart ───────────────────────────────────────── */
function WinRateChart({ trades }: { trades: CompletedTrade[] }) {
  const colors = useColors();
  const closed = trades.filter(t => t.outcome);
  if (closed.length === 0) return null;

  const stats: Record<string, { wins: number; total: number }> = {
    CALM: { wins: 0, total: 0 }, WATCHING: { wins: 0, total: 0 },
    URGE: { wins: 0, total: 0 }, ANXIOUS: { wins: 0, total: 0 }, none: { wins: 0, total: 0 },
  };

  for (const t of closed) {
    const key = t.worstStateDuringTrade ?? "none";
    if (!stats[key]) stats[key] = { wins: 0, total: 0 };
    stats[key].total++;
    if (t.outcome === "win") stats[key].wins++;
  }

  const rows = (["CALM", "WATCHING", "URGE", "ANXIOUS"] as CheckInState[])
    .filter(s => stats[s]?.total > 0)
    .map(s => ({ state: s, ...STATE_META[s], ...stats[s], rate: stats[s].wins / stats[s].total }));

  if (rows.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
        Win rate by worst state hit during trade
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 2 }}>
        Your own evidence: does staying calm correlate with winning?
      </Text>
      {rows.map(row => (
        <View key={row.state} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
              <Text style={{ color: row.color, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{row.label}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>
                {row.wins}/{row.total}
              </Text>
            </View>
            <Text style={{ color: row.color, fontSize: 15, fontFamily: "Inter_700Bold" }}>
              {(row.rate * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={{ height: 7, backgroundColor: colors.secondary, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ width: `${row.rate * 100}%` as any, height: "100%", backgroundColor: row.color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── Trade row ───────────────────────────────────────────────────────────── */
function TradeCard({ item }: { item: CompletedTrade }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const outcome = OUTCOME_META[item.outcome];
  const date = new Date(item.startedAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const durationMs = new Date(item.closedAt).getTime() - new Date(item.startedAt).getTime();
  const durationMins = Math.round(durationMs / 60000);
  const durationStr = durationMins < 60 ? `${durationMins}m` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded(e => !e)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Row summary */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
              {item.asset}
            </Text>
            <Badge
              label={item.direction.toUpperCase()}
              color={item.direction === "long" ? "#22c55e" : "#ef4444"}
              bg={item.direction === "long" ? "#22c55e18" : "#ef444418"}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>
              {dateStr} · {timeStr} · {durationStr}
            </Text>
          </View>

          {/* Emotional timeline strip */}
          {item.checkIns.length > 0 ? (
            <View style={{ flexDirection: "row", gap: 2, flexWrap: "wrap" }}>
              {item.checkIns.map(ci => (
                <Text key={ci.id} style={{ fontSize: 17 }}>{STATE_META[ci.state].emoji}</Text>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.mutedForeground + "60", fontSize: 11, fontFamily: "Inter_400Regular" }}>
              No check-ins logged
            </Text>
          )}
        </View>

        <View style={{ gap: 6, alignItems: "flex-end" }}>
          <View style={[styles.outcomeTag, { backgroundColor: `${outcome.color}18`, borderColor: `${outcome.color}40` }]}>
            <Text style={{ color: outcome.color, fontSize: 12, fontFamily: "Inter_700Bold" }}>{outcome.label}</Text>
          </View>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 }}>
          {/* Invalidation */}
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20` }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              Invalidation
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
              {item.invalidationCondition}
            </Text>
          </View>

          {/* Check-in timeline with timestamps */}
          {item.checkIns.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
                Check-in timeline
              </Text>
              {item.checkIns.map(ci => {
                const m = STATE_META[ci.state];
                const t = new Date(ci.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <View key={ci.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                    <Text style={{ color: m.color, fontSize: 12, fontFamily: "Inter_600SemiBold", width: 110 }}>{m.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{t}</Text>
                    {ci.triggeredBy === "manual_sos" && (
                      <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: "#f9731620" }}>
                        <Text style={{ color: "#f97316", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>SOS</Text>
                      </View>
                    )}
                    {ci.breathingCompleted && (
                      <Icon name="wind" size={12} color={colors.mutedForeground} />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* SOS count */}
          {(item.sosTapCount ?? 0) > 0 && (
            <Text style={{ color: "#f97316", fontSize: 12, fontFamily: "Inter_500Medium" }}>
              {item.sosTapCount} SOS tap{item.sosTapCount !== 1 ? "s" : ""} this trade
            </Text>
          )}

          {/* Post-trade note */}
          {item.postTradeNote && (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" }}>
              "{item.postTradeNote}"
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────── */
export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [trades, setTrades] = useState<CompletedTrade[]>([]);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const loadTrades = useCallback(async () => {
    setLoading(true);
    const t = await loadCompletedTrades();
    setTrades(t.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadTrades(); }, [loadTrades]));

  const wins = trades.filter(t => t.outcome === "win").length;
  const losses = trades.filter(t => t.outcome === "loss").length;
  const total = trades.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : "—";

  return (
    <FlatList
      data={trades}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTrades} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
      ListHeaderComponent={() => (
        <View style={{ marginBottom: 20, gap: 16 }}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>Journal</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
              {total} trade{total !== 1 ? "s" : ""} logged
            </Text>
          </View>

          {total > 0 && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { label: "Total", value: String(total), color: colors.foreground },
                  { label: "Win Rate", value: `${winRate}%`, color: "#22c55e" },
                  { label: "Wins", value: String(wins), color: "#22c55e" },
                  { label: "Losses", value: String(losses), color: "#ef4444" },
                ].map(s => (
                  <View key={s.label} style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</Text>
                    <Text style={{ color: s.color, fontSize: 16, fontFamily: "Inter_700Bold" }}>{s.value}</Text>
                  </View>
                ))}
              </View>

              <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <WinRateChart trades={trades} />
              </View>
            </>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <EmptyState
          icon={<Icon name="book-open" size={40} color={colors.border} />}
          title="No trades yet"
          subtitle="Log a trade in the Gate tab, then close it in Monitor. It will appear here with your emotional timeline."
          action={{ label: "Open Gate", onPress: () => router.push("/(tabs)/gate") }}
        />
      )}
      renderItem={({ item }) => <TradeCard item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, borderWidth: 1 },
  outcomeTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  statPill: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 2, alignItems: "center" },
});
