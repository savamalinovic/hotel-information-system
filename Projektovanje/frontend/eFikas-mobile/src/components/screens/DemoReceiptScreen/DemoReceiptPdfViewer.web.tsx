import { useTheme } from "@/src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function DemoReceiptPdfViewer({
  uri,
  onLoadComplete,
  onError,
}: {
  uri: string;
  onLoadComplete: (pages: number) => void;
  onError: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  const openInBrowser = () => {
    try {
      window.open(uri, "_blank", "noopener,noreferrer");
      onLoadComplete(0);
    } catch {
      onError();
    }
  };

  const downloadInBrowser = () => {
    try {
      const link = document.createElement("a");
      link.href = uri;
      link.download = "demo-receipt.pdf";
      link.click();
      onLoadComplete(0);
    } catch {
      onError();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
      <Text style={[styles.message, { color: Colors.textSecondary }]}>{t("demoReceipt.pdf.webFallback")}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t("demoReceipt.pdf.openInBrowser")} onPress={openInBrowser} style={[styles.button, { backgroundColor: Colors.primary }]}>
        <Text style={{ color: Colors.textLight, fontWeight: "700" }}>{t("demoReceipt.pdf.openInBrowser")}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("demoReceipt.pdf.downloadInBrowser")} onPress={downloadInBrowser} style={[styles.secondaryButton, { borderColor: Colors.divider }]}>
        <Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{t("demoReceipt.pdf.downloadInBrowser")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  message: { textAlign: "center", lineHeight: 20 },
  button: { minHeight: 46, minWidth: 210, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingHorizontal: 16 },
  secondaryButton: { minHeight: 46, minWidth: 210, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 16 },
});
