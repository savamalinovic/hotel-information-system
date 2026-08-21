import { DemoReceiptPdfDownloadError, demoReceiptService } from "@/src/api/services/demoReceiptService";
import DemoReceiptPdfViewer from "@/src/components/screens/DemoReceiptScreen/DemoReceiptPdfViewer";
import { EmptyOrErrorState, PrimaryButton } from "@/src/components/screens/ReservationWorkflowScreen/ReservationWorkflowUi";
import { useDemoReceipt } from "@/src/hooks/useDemoReceipt";
import { useTheme } from "@/src/providers/ThemeProvider";
import { persistDemoReceiptPdf, releaseDemoReceiptPdf } from "@/src/services/demoReceiptFileService";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { isAxiosError } from "axios";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const parseReservationId = (id: string | undefined) => {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export default function DemoReceiptPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = parseReservationId(id);
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const receipt = useDemoReceipt(reservationId ?? 0);
  const attemptedReceiptId = useRef<number | undefined>(undefined);
  const downloadingRef = useRef(false);
  const [localUri, setLocalUri] = useState<string>();
  const [pageCount, setPageCount] = useState<number>();
  const [downloadError, setDownloadError] = useState("");
  const [rendererError, setRendererError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharingMessage, setSharingMessage] = useState("");

  const clearLocalPdf = useCallback((uri: string | undefined) => {
    releaseDemoReceiptPdf(uri);
    setLocalUri((current) => current === uri ? undefined : current);
  }, []);

  useEffect(() => () => releaseDemoReceiptPdf(localUri), [localUri]);

  const downloadPdf = useCallback(async () => {
    if (!reservationId || !receipt.data || downloadingRef.current) {
      return;
    }

    downloadingRef.current = true;
    setIsDownloading(true);
    setDownloadError("");
    setRendererError(false);
    setPageCount(undefined);
    clearLocalPdf(localUri);

    try {
      const pdf = await demoReceiptService.downloadPdf(reservationId, receipt.data.receiptNumber);
      const localFile = persistDemoReceiptPdf(pdf.content, pdf.filename);
      setLocalUri(localFile.uri);
    } catch (error) {
      const fallback = getPdfDownloadErrorMessage(error, t);
      setDownloadError(getUserFacingErrorMessage(error, fallback));
    } finally {
      downloadingRef.current = false;
      setIsDownloading(false);
    }
  }, [clearLocalPdf, localUri, receipt.data, reservationId, t]);

  useEffect(() => {
    if (!receipt.data || attemptedReceiptId.current === receipt.data.demoReceiptId) {
      return;
    }

    attemptedReceiptId.current = receipt.data.demoReceiptId;
    void downloadPdf();
  }, [downloadPdf, receipt.data]);

  const sharePdf = async () => {
    if (!localUri || isSharing) {
      return;
    }

    setSharingMessage("");
    setIsSharing(true);
    try {
      if (!await Sharing.isAvailableAsync()) {
        setSharingMessage(t("demoReceipt.pdf.sharingUnavailable"));
        return;
      }

      await Sharing.shareAsync(localUri, {
        dialogTitle: t("demoReceipt.pdf.shareDialogTitle"),
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch {
      setSharingMessage(t("demoReceipt.pdf.sharingFailed"));
    } finally {
      setIsSharing(false);
    }
  };

  const retryDownload = () => {
    attemptedReceiptId.current = undefined;
    void downloadPdf();
  };

  const handleRendererError = () => {
    clearLocalPdf(localUri);
    setRendererError(true);
  };

  if (!reservationId) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.errors.invalidTitle")} description={t("demoReceipt.errors.invalidDescription")} retryLabel={t("demoReceipt.common.back")} onRetry={() => router.back()} /></SafeAreaView>;
  }

  if (receipt.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.common.loading")}</Text></View></SafeAreaView>;
  }

  if (receipt.isError) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.errors.metadataTitle")} description={t("demoReceipt.errors.metadataDescription")} retryLabel={t("demoReceipt.common.retry")} onRetry={() => void receipt.refetch()} /></SafeAreaView>;
  }

  if (!receipt.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><EmptyOrErrorState icon="SearchX" title={t("demoReceipt.absent.title")} description={t("demoReceipt.absent.description")} retryLabel={t("demoReceipt.common.back")} onRetry={() => router.back()} /></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("demoReceipt.pdf.title")}</Text>
          <Text style={[styles.demoLabel, { color: Colors.error }]}>{t("demoReceipt.label")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{receipt.data.receiptNumber}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("demoReceipt.common.back")} onPress={() => router.back()} style={[styles.backButton, { borderColor: Colors.divider }]}>
          <Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{t("demoReceipt.common.back")}</Text>
        </Pressable>
      </View>
      {isDownloading ? <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.pdf.downloading")}</Text></View> : downloadError ? <View style={styles.centered}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.pdf.downloadErrorTitle")} description={downloadError} retryLabel={t("demoReceipt.pdf.retryDownload")} onRetry={retryDownload} /></View> : rendererError ? <View style={styles.centered}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.pdf.rendererErrorTitle")} description={t("demoReceipt.pdf.rendererErrorDescription")} retryLabel={t("demoReceipt.pdf.retryDownload")} onRetry={retryDownload} /></View> : localUri ? <View style={styles.viewerArea}><DemoReceiptPdfViewer uri={localUri} onLoadComplete={setPageCount} onError={handleRendererError} /><View style={[styles.viewerFooter, { borderColor: Colors.divider, backgroundColor: Colors.background }]}><Text style={{ color: Colors.textSecondary }}>{pageCount === undefined ? t("demoReceipt.pdf.rendering") : pageCount > 0 ? t("demoReceipt.pdf.pages", { count: pageCount }) : t("demoReceipt.pdf.webOpened")}</Text><PrimaryButton label={isSharing ? t("demoReceipt.pdf.sharing") : t("demoReceipt.pdf.share")} onPress={() => void sharePdf()} loading={isSharing} /></View>{sharingMessage ? <Text style={[styles.sharingMessage, { color: Colors.textSecondary }]}>{sharingMessage}</Text> : null}</View> : <View style={styles.centered}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.pdf.downloadErrorTitle")} description={t("demoReceipt.pdf.downloadFailed")} retryLabel={t("demoReceipt.pdf.retryDownload")} onRetry={retryDownload} /></View>}
    </SafeAreaView>
  );
}

function getPdfDownloadErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof DemoReceiptPdfDownloadError) {
    return t(`demoReceipt.pdf.${error.failure}`);
  }

  if (isAxiosError(error)) {
    if (error.response?.status === 403) {
      return t("demoReceipt.errors.forbiddenPdf");
    }
    if (error.response?.status === 404) {
      return t("demoReceipt.errors.pdfNotFound");
    }
  }

  return t("demoReceipt.pdf.downloadFailed");
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 12 },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontSize: 22, fontWeight: "700" },
  demoLabel: { fontWeight: "800", fontSize: 12 },
  backButton: { minHeight: 40, justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, gap: 12 },
  viewerArea: { flex: 1, padding: 12, gap: 10 },
  viewerFooter: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  sharingMessage: { paddingHorizontal: 4, textAlign: "center" },
});
