import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api, Trade, SetupGrade, TradeOutcome } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { Badge, EmptyState, webTop, webBottom } from "@/components/UI";

const GRADE_LABELS: Record<SetupGrade, string> = { A_PLUS: "A+", B: "B", C: "C" };
const OUTCOME_META: Record<TradeOutcome, { color: string; label: string }> = {
  WIN: { color: "#22c55e", label: "WIN" },
  LOSS: { color: "#ef4444", label: "LOSS" },
  BREAKEVEN: { color: "#71717a", label: "B/E" },
};

function TradeRow({ item }: { item: Trade }) {
  const colors = useColors();
  const outcomeColor = item.outcome ? OUTCOME_META[item.outcome].color : colors.mutedForeground;
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
            {item.pair}
          </Text>
          <Badge
            label={GRADE_LABELS[item.setupGrade]}
            color={colors.primary}
            bg={`${colors.primary}18`}
          />
          <Badge
            label={item.direction}
            color={item.direction === "LONG" ? "#22c55e" : "#ef4444"}
            bg={item.direction === "LONG" ? "#22c55e18" : "#ef444418"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
            {dateStr} {timeStr}
          </Text>
          {item.followedPlan !== null && item.followedPlan !== undefined && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Feather
                name={item.followedPlan ? "check" : "x"}
                size={11}
                color={item.followedPlan ? "#22c55e" : "#ef4444"}
              />
              <Text style={{ color: item.followedPlan ? "#22c55e" : "#ef4444", fontSize: 11, fontFamily: "Inter_500Medium" }}>
                {item.followedPlan ? "Plan followed" : "Rule break"}
              </Text>
            </View>
          )}
          {item.interfered && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Feather name="alert-triangle" size={11} color="#f59e0b" />
              <Text style={{ color: "#f59e0b", fontSize: 11, fontFamily: "Inter_500Medium" }}>
                {item.interferenceType?.replace("_", " ") ?? "Interfered"}
              </Text>
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 }} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>

      {item.outcome && (
        <View style={[styles.outcomeTag, { backgroundColor: `${outcomeColor}18`, borderColor: `${outcomeColor}40` }]}>
          <Text style={{ color: outcomeColor, fontSize: 12, fontFamily: "Inter_700Bold" }}>
            {OUTCOME_META[item.outcome].label}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: trades = [], isLoading, refetch } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: api.listTrades,
  });

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const wins = trades.filter(t => t.outcome === "WIN").length;
  const losses = trades.filter(t => t.outcome === "LOSS").length;
  const winRate = trades.filter(t => t.outcome).length > 0
    ? ((wins / trades.filter(t => t.outcome).length) * 100).toFixed(0)
    : "—";

  return (
    <FlatList
      data={sortedTrades}
      keyExtractor={item => String(item.id)}
      scrollEnabled={!!sortedTrades.length}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
      ListHeaderComponent={() => (
        <View style={{ marginBottom: 20, gap: 16 }}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>
              Trade Journal
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
              {trades.length} trade{trades.length !== 1 ? "s" : ""} logged
            </Text>
          </View>
          {trades.length > 0 && (
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
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <EmptyState
          icon={<Feather name="book-open" size={40} color={colors.border} />}
          title="No trades yet"
          subtitle="Use the Monitor tab to log trades during your session"
        />
      )}
      renderItem={({ item }) => <TradeRow item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  outcomeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statPill: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    alignItems: "center",
  },
});
