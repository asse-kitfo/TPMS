import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Modal, Platform, View, Text, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { hasAcceptedDisclaimer, acceptDisclaimer } from "@/lib/storage";
import { setupNotificationHandler } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const DISCLAIMER_TEXT = `ApexTerm is a psychological awareness tool for traders. It does not provide financial advice, trade signals, market analysis, or execution control. All trading decisions and execution are performed solely by the trader on their own trading platform. ApexTerm only logs and reflects the trader's self-reported emotional state.`;

function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#0f0f13", borderRadius: 18, borderWidth: 1, borderColor: "#27272a", padding: 24, gap: 20, maxWidth: 400, width: "100%" }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#06b6d4", fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 }}>ApexTerm</Text>
            <Text style={{ color: "#71717a", fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" }}>
              Before you begin
            </Text>
          </View>

          <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#ffffff08", borderWidth: 1, borderColor: "#27272a" }}>
            <Text style={{ color: "#a1a1aa", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 }}>
              {DISCLAIMER_TEXT}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAccept}
            style={{ backgroundColor: "#06b6d4", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#000000", fontSize: 15, fontFamily: "Inter_700Bold" }}>I understand — continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [disclaimerNeeded, setDisclaimerNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      hasAcceptedDisclaimer().then(accepted => setDisclaimerNeeded(!accepted));
    }
  }, [fontsLoaded, fontError]);

  async function handleAccept() {
    await acceptDisclaimer();
    setDisclaimerNeeded(false);
  }

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView
            style={[{ flex: 1 }, Platform.OS === "web" && { height: "100vh" as any, overflow: "hidden" as any }]}
          >
            <RootLayoutNav />
            {disclaimerNeeded === true && <DisclaimerModal onAccept={handleAccept} />}
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
