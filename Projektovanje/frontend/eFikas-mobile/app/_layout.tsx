import { SafeAreaProvider } from "react-native-safe-area-context";
import App from "./App";
import { ThemeProvider } from "@/src/providers/ThemeProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
