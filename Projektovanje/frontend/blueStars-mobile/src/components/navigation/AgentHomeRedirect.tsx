import { useTheme } from "@/src/providers/ThemeProvider";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AgentHomeRedirect() {
  const { Colors } = useTheme();

  useEffect(() => {
    router.replace("/(tabs)");
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.screenBackground }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
