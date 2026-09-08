import { SafeAreaProvider } from "react-native-safe-area-context";
import App from "./App";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import i18n from "@/src/i18n";
import { I18nextProvider } from "react-i18next";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
