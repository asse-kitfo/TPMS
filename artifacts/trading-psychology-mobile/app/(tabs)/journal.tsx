import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Badge, EmptyState, webTop, webBottom } from "@/components/UI";
import { loadCompletedTrades, CompletedTrade, TradeCheckIn, CheckInState, TradeOutcomeLocal } from "@/lib/storage";

const CHECK_IN_META: Record<CheckInState, { emoji: string; label: string; color: string }> = {
  CALM: { emoji: "🙂", label: "Calm", color: "#22c55e" },
  WATCHING: { emoji: "😐", label: "Watching", color: "#f59e0b" },
  URGE: { emoji: "😬", label: "Urge", color: "#f97316" },
  ANXIOUS: { emoji: "😰", label: "Anxious", color: "#ef4444" },
};

const OUTCOME_META: Record<TradeOutcomeLocal, { color: string; label: string }> = {
  WIN: { color: "#22c55e", label: "WIN" },
  LOSS: { color: "#ef4444", label: "LOSS" },
  BE: { color: "#71717a", label: "B/E" },
};

function worstState(checkIns: TradeCheckIn[]): CheckInState | null {
  if (checkIns.length === 0) return null;
  const order: CheckInState[] = ["ANXIOUS", "URGE", "WATCHING", "CALM"];
  for (const s of order) {
    if (checkIns.some(c => c.state === s)) return s;
  }
  return "CALM";
}

/* ── Win Rate by Worst State chart ──────────────────────────────────────── */
function WinRateChart({ trades }: { trades: CompletedTrade[] }) {
  const colors = useColors();
  const closedTrades = trades.filter(t => t.outcome);

  if (closedTrades.length === 0) return null;

  const statsByState: Record<CheckInState, { wins: number; total: number }> = {
    CALM: { wins: 0, total: 0 },
    WATCHING: { wins: 0, total: 0 },
    URGE: { wins: 0, total: 0 },
    ANXIOUS: { wins: 0, total: 0 },
  };
  const noCheckIn = { wins: 0, total: 0 };

  for (const t of closedTrades) {
    const worst = worstState(t.checkIns);
    if (!worst) {
      noCheckIn.total++;
      if (t.outcome === "WIN") noCheckIn.wins++;
    } else {
      statsByState[worst].total++;
      if (t.outcome === "WIN") statsByState[worst].wins++;
    }
  }

  const rows = (Object.keys(CHECK_IN_META) as CheckInState[])
    .filter(s => statsByState[s].total > 0)
    .map(s => ({
      state: s,
      ...CHECK_IN_META[s],
      ...statsByState[s],
      rate: statsByState[s].total > 0 ? statsByState[s].wins / statsByState[s].total : 0,
    }));

  if (rows.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" }}>
        Win rate by worst emotional state
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginBottom: 4 }}>
        Your evidence that staying calm mid-trade correlates with winning.
      </Text>
      <View style={{ gap: 10 }}>
        {rows.map(row => (
          <View key={row.state} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{row.emoji}</Text>
                <Text style={{ color: row.color, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{row.label}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>
                  {row.wins}/{row.total} trades
                </Text>
              </View>
              <Text style={{ color: row.color, fontSize: 14, fontFamily: "Inter_700Bold" }}>
                {(row.rate * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${row.rate * 100}%` as any, height: "100%", backgroundColor: row.color, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Trade card ──────────────────────────────────────────────────────────── */
function TradeCard({ item }: { item: CompletedTrade }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const outcome = OUTCOME_META[item.outcome];
  const worst = worstState(item.checkIns);
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
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
              {item.pair}
            </Text>
            <Badge
              label={item.direction}
              color={item.direction === "LONG" ? "#22c55e" : "#ef4444"}
              bg={item.direction === "LONG" ? "#22c55e18" : "#ef444418"}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              {dateStr} {timeStr} · {durationStr}
            </Text>
          </View>

          {/* Emotional timeline strip */}
          {item.checkIns.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
              {item.checkIns.map(ci => (
                <Text key={ci.id} style={{ fontSize: 16 }}>{CHECK_IN_META[ci.state].emoji}</Text>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.mutedForeground + "60", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 }}>
              No check-ins
            </Text>
          )}
        </View>

        <View style={[styles.outcomeTag, { backgroundColor: `${outcome.color}18`, borderColor: `${outcome.color}40` }]}>
          <Text style={{ color: outcome.color, fontSize: 12, fontFamily: "Inter_700Bold" }}>{outcome.label}</Text>
        </View>
      </View>

      {expanded && (
        <View style={{ marginTop: 12, gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ padding: 10, borderRadius: 8, backgroundColor: `${colors.primary}08`, borderWidth: 1, borderColor: `${colors.primary}20` }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
              Invalidation
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }}>
              {item.invalidation}
            </Text>
          </View>

          {worst && (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>Worst state:</Text>
              <Text style={{ fontSize: 16 }}>{CHECK_IN_META[worst].emoji}</Text>
              <Text style={{ color: CHECK_IN_META[worst].color, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{CHECK_IN_META[worst].label}</Text>
            </View>
          )}

          {item.checkIns.length > 0 && (
            <View style={{ gap: 4 }}>
              {item.checkIns.map((ci, i) => {
                const meta = CHECK_IN_META[ci.state];
                const t = new Date(ci.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <View key={ci.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
                    <Text style={{ color: meta.color, fontSize: 12, fontFamily: "Inter_600SemiBold", width: 80 }}>{meta.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>{t}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {item.note && (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" }}>
              "{item.note}"
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

  const wins = trades.filter(t => t.outcome === "WIN").length;
  const losses = trades.filter(t => t.outcome === "LOSS").length;
  const total = trades.filter(t => t.outcome).length;
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
              {trades.length} trade{trades.length !== 1 ? "s" : ""} logged
            </Text>
          </View>

          {trades.length > 0 && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { label: "Total", value: String(trades.length), color: colors.foreground },
                  { label: "Win Rate", value: `${winRate}%`, color: "#22c55e" },
                  { label: "Wins", value: String(wins), color: "#22c55e" },
                  { label: "Losses", value: String(losses), color: "#ef4444" },
                ].map(stat => (
                  <View key={stat.label} style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 }}>
                      {stat.label}
                    </Text>
                    <Text style={{ color: stat.color, fontSize: 16, fontFamily: "Inter_700Bold" }}>
                      {stat.value}
                    </Text>
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
          icon={<Icon name="list" size={40} color={colors.border} />}
          title="No trades yet"
          subtitle="Close a trade in the In Trade tab to see it here"
        />
      )}
      renderItem={({ item }) => <TradeCard item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, borderWidth: 1 },
  outcomeTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  statPill: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 2, alignItems: "center" },
});
