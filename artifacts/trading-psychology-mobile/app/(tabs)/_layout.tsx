import { Tabs } from "expo-router";
import { Icon } from "@/components/Icon";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: isWeb
          ? {
              position: "fixed" as any,
              bottom: 0,
              left: 0,
              right: 0,
              height: 84,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              elevation: 0,
              zIndex: 100,
            }
          : {
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              elevation: 0,
              height: 84,
            },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hub",
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gate"
        options={{
          title: "Gate",
          tabBarIcon: ({ color, size }) => (
            <Icon name="check-circle" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: "Monitor",
          tabBarIcon: ({ color, size }) => (
            <Icon name="bar-chart-2" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="thought"
        options={{
          title: "Thought",
          tabBarIcon: ({ color, size }) => (
            <Icon name="zap" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => (
            <Icon name="list" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: "Rules",
          tabBarIcon: ({ color, size }) => (
            <Icon name="sliders" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
