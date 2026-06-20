import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { loadRules, saveRules, generateId, Rule, RuleCategory } from "@/lib/storage";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Badge, SectionLabel, EmptyState, webTop, webBottom } from "@/components/UI";

const CATEGORIES: { key: RuleCategory; label: string; color: string }[] = [
  { key: "ENTRY",      label: "Entry",      color: "#3b82f6" },
  { key: "EXIT",       label: "Exit",       color: "#22c55e" },
  { key: "RISK",       label: "Risk",       color: "#f59e0b" },
  { key: "PSYCHOLOGY", label: "Psychology", color: "#22d3ee" },
  { key: "GENERAL",    label: "General",    color: "#71717a" },
];

function getCatMeta(cat: RuleCategory) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

function ReviewModal({ visible, rules, onClose }: { visible: boolean; rules: Rule[]; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setIndex(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    if (visible) { setIndex(0); fadeAnim.setValue(1); }
  }, [visible]);

  const done = index >= rules.length;
  const rule = rules[index];
  const meta = rule ? getCatMeta(rule.category) : null;
  const progress = rules.length > 0 ? (index / rules.length) * 100 : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.reviewModal, { backgroundColor: colors.background }]}>
        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: colors.secondary }}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>

        {/* Header */}
        <View style={[styles.reviewHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>
            {done ? "Complete" : `${index + 1} of ${rules.length}`}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
          {done ? (
            <View style={{ alignItems: "center", gap: 16 }}>
              <View style={[styles.doneCircle, { borderColor: `${colors.success}60`, backgroundColor: `${colors.success}18` }]}>
                <Icon name="check" size={32} color={colors.success} />
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>
                Review Complete
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" }}>
                All {rules.length} rules committed.
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                Your cortex has been briefed. Now let it work.
              </Text>
            </View>
          ) : (
            <Animated.View style={[{ gap: 20, alignItems: "center" }, { opacity: fadeAnim }]}>
              {meta && (
                <Badge label={meta.label} color={meta.color} bg={`${meta.color}18`} size="md" />
              )}
              <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 34 }}>
                {rule?.title}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 }}>
                {rule?.body}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Nav dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 16 }}>
          {rules.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={{
                width: i === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? colors.primary : colors.border,
              }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation */}
        <View style={[styles.reviewNav, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            style={{ opacity: index === 0 ? 0.3 : 1 }}
          >
            <View style={[styles.navBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Icon name="chevron-left" size={20} color={colors.foreground} />
            </View>
          </TouchableOpacity>

          {done ? (
            <Button label="Done" onPress={onClose} />
          ) : (
            <Button
              label={index === rules.length - 1 ? "Complete" : "Next"}
              onPress={() => { Haptics.selectionAsync(); goTo(index + 1); }}
              icon={index < rules.length - 1 ? <Icon name="chevron-right" size={14} color={colors.primaryForeground} /> : undefined}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function RuleFormModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial?: Rule;
  onSave: (data: { title: string; body: string; category: RuleCategory }) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState<RuleCategory>(initial?.category ?? "GENERAL");

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setBody(initial?.body ?? "");
      setCategory(initial?.category ?? "GENERAL");
    }
  }, [visible, initial]);

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.formModal, { backgroundColor: colors.background }]}>
        <View style={[styles.formHeader, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 15, fontFamily: "Inter_500Medium" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>
            {initial ? "Edit Rule" : "New Rule"}
          </Text>
          <TouchableOpacity onPress={() => canSave && onSave({ title: title.trim(), body: body.trim(), category })} disabled={!canSave}>
            <Text style={{ color: canSave ? colors.primary : colors.border, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View>
            <SectionLabel text="Title" />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Rule title — be direct"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, fontSize: 16, fontFamily: "Inter_600SemiBold" }]}
            />
          </View>

          <View>
            <SectionLabel text="Rule body" />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write the full rule. Be explicit. Vague rules are ignored."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary, minHeight: 120, textAlignVertical: "top", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 }]}
            />
          </View>

          <View>
            <SectionLabel text="Category" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: isSelected ? cat.color : colors.border,
                      backgroundColor: isSelected ? `${cat.color}18` : colors.secondary,
                    }}
                  >
                    <Text style={{ color: isSelected ? cat.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function RulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [rules, setRules] = useState<Rule[]>([]);
  const [filterCat, setFilterCat] = useState<RuleCategory | "ALL">("ALL");
  const [reviewVisible, setReviewVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadRules().then(setRules);
  }, []);

  const persist = (newRules: Rule[]) => {
    setRules(newRules);
    saveRules(newRules);
  };

  const handleSave = (data: { title: string; body: string; category: RuleCategory }) => {
    if (editingRule) {
      persist(rules.map(r => r.id === editingRule.id ? { ...r, ...data } : r));
    } else {
      persist([...rules, { id: generateId(), ...data, sortOrder: rules.length, createdAt: new Date().toISOString() }]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFormVisible(false);
    setEditingRule(undefined);
  };

  const handleDelete = (id: string) => {
    persist(rules.filter(r => r.id !== id));
    setDeletingId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const filtered = filterCat === "ALL" ? rules : rules.filter(r => r.category === filterCat);

  const topPad = Platform.OS === "web" ? webTop : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottom : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ReviewModal
        visible={reviewVisible}
        rules={filtered}
        onClose={() => setReviewVisible(false)}
      />
      <RuleFormModal
        visible={formVisible}
        initial={editingRule}
        onSave={handleSave}
        onClose={() => { setFormVisible(false); setEditingRule(undefined); }}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingHorizontal: 16, paddingBottom: bottomPad }}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: 16, gap: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: colors.foreground, fontSize: 26, fontFamily: "Inter_700Bold" }}>
                  My Rules
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                  {rules.length} rule{rules.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setReviewVisible(true)}
                  disabled={filtered.length === 0}
                  style={[styles.iconBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: filtered.length === 0 ? 0.4 : 1 }]}
                >
                  <Icon name="eye" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setEditingRule(undefined); setFormVisible(true); }}
                  style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                >
                  <Icon name="plus" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Context banner */}
            <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Icon name="info" size={13} color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 }}>
                Read your rules before every session using{" "}
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Review Mode</Text>
                {" "}— when emotions take over, reading beats remembering.
              </Text>
            </View>

            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }} contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}>
              <TouchableOpacity
                onPress={() => setFilterCat("ALL")}
                style={[styles.filterChip, {
                  borderColor: filterCat === "ALL" ? colors.primary : colors.border,
                  backgroundColor: filterCat === "ALL" ? `${colors.primary}18` : colors.secondary,
                }]}
              >
                <Text style={{ color: filterCat === "ALL" ? colors.primary : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                  All {rules.length}
                </Text>
              </TouchableOpacity>
              {CATEGORIES.filter(c => rules.some(r => r.category === c.key)).map(cat => {
                const count = rules.filter(r => r.category === cat.key).length;
                const isSelected = filterCat === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setFilterCat(cat.key)}
                    style={[styles.filterChip, {
                      borderColor: isSelected ? cat.color : colors.border,
                      backgroundColor: isSelected ? `${cat.color}18` : colors.secondary,
                    }]}
                  >
                    <Text style={{ color: isSelected ? cat.color : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {cat.label} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon={<Icon name="bookmark" size={40} color={colors.border} />}
            title="No rules yet"
            subtitle="Add your first trading rule — written rules beat remembered ones"
          />
        )}
        renderItem={({ item, index }) => {
          const meta = getCatMeta(item.category);
          const isDeleting = deletingId === item.id;
          return (
            <View style={[styles.ruleRow, {
              backgroundColor: colors.card,
              borderColor: isDeleting ? colors.destructive : colors.border,
              marginBottom: 8,
            }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium", width: 20, paddingTop: 2 }}>
                  {index + 1}
                </Text>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Badge label={meta.label} color={meta.color} bg={`${meta.color}18`} />
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 }}>
                    {item.body}
                  </Text>
                </View>
                <View style={{ gap: 4 }}>
                  {isDeleting ? (
                    <View style={{ gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={[styles.smallBtn, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}
                      >
                        <Icon name="trash-2" size={12} color={colors.destructive} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDeletingId(null)}
                        style={[styles.smallBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Icon name="x" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => { setEditingRule(item); setFormVisible(true); }}
                        style={[styles.smallBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Icon name="edit-2" size={12} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDeletingId(item.id)}
                        style={[styles.smallBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <Icon name="trash-2" size={12} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  ruleRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  smallBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  reviewModal: { flex: 1 },
  progressBar: { height: "100%" as any },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  reviewNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  formModal: { flex: 1 },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
});
