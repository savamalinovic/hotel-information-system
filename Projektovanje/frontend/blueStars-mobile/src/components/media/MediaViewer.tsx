import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { sessionStore } from "@/src/session/sessionStore";
import { MediaResource, resolveMedia } from "@/src/media/resolveMedia";
import { validateMediaPdf } from "@/src/media/mediaPolicy";
import { persistDemoReceiptPdf, releaseDemoReceiptPdf } from "@/src/services/demoReceiptFileService";
import DemoReceiptPdfViewer from "@/src/components/screens/DemoReceiptScreen/DemoReceiptPdfViewer";

type ResolvedMedia = Awaited<ReturnType<typeof resolveMedia>>;

export function MediaViewer({ resource, onClose, onPrevious, onNext }: {
  resource: MediaResource | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { session, status } = useSession();
  if (!resource || status !== "authenticated" || !session || session.role === "MANAGER") return null;
  return <Viewer key={JSON.stringify(resource)} resource={resource} token={session.token} onClose={onClose} onPrevious={onPrevious} onNext={onNext} />;
}

function Viewer({ resource, token, onClose, onPrevious, onNext }: {
  resource: MediaResource; token: string; onClose: () => void; onPrevious?: () => void; onNext?: () => void;
}) {
  const { Colors, theme } = useTheme();
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [media, setMedia] = useState<(ResolvedMedia & { token: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const active = useRef(false);

  useEffect(() => {
    let current = true;
    active.current = true;
    let localPdf: string | undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    setMedia(null);
    setLoading(true);
    setFailed(false);
    const isCurrent = () => current && sessionStore.getToken() === token;
    void (async () => {
      try {
        const resolved = await resolveMedia(resource);
        if (!isCurrent()) return;
        if (resolved.kind === "pdf") {
          // Fetch only the signed storage URL: never forward the API bearer token to R2.
          const response = await fetch(resolved.uri, { signal: controller.signal, cache: "no-store", credentials: "omit" });
          if (!response.ok || Number(response.headers.get("content-length")) > 10 * 1024 * 1024) throw new Error("Media unavailable.");
          const bytes = await response.arrayBuffer();
          validateMediaPdf(bytes);
          if (!isCurrent()) return;
          localPdf = persistDemoReceiptPdf(bytes, `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`).uri;
          setMedia({ ...resolved, uri: localPdf, token });
          if (Platform.OS === "web") setLoading(false);
        } else {
          setMedia({ ...resolved, token });
          if (resolved.kind === "external") setLoading(false);
        }
      } catch {
        if (isCurrent()) { setFailed(true); setLoading(false); }
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      current = false;
      active.current = false;
      controller.abort();
      clearTimeout(timeout);
      try { releaseDemoReceiptPdf(localPdf); } catch { /* Private cache cleanup is best effort. */ }
    };
  }, [attempt, resource, token]);

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => { setFailed(true); setLoading(false); }, 30_000);
    return () => clearTimeout(timeout);
  }, [loading, attempt]);

  const onMediaError = () => {
    if (!active.current || sessionStore.getToken() !== token) return;
    if (attempt === 0) setAttempt(1);
    else { setFailed(true); setLoading(false); }
  };
  const openExternal = async () => {
    if (!media || opening) return;
    setOpening(true);
    try {
      // The explicit fallback action rechecks ownership and obtains a fresh URL.
      const fresh = await resolveMedia(resource);
      if (active.current && sessionStore.getToken() === token) await WebBrowser.openBrowserAsync(fresh.uri);
    } catch { if (active.current) setFailed(true); }
    finally { if (active.current) setOpening(false); }
  };
  const ready = media?.token === token ? media : null;

  return <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor={Colors.screenBackground} />
      <View style={[styles.header, { borderColor: Colors.divider }]}>
        <Text numberOfLines={2} style={[styles.title, { color: Colors.textPrimary }]}>{resource.title}</Text>
        <Action label={t("mediaViewer.close")} onPress={onClose} />
      </View>
      <View style={styles.body}>
        {!failed && ready?.kind === "image" && <Image key={`${attempt}-${ready.uri}`} source={{ uri: ready.uri }} cachePolicy="none" contentFit="contain" accessibilityLabel={resource.title} style={StyleSheet.absoluteFillObject} onLoad={() => setLoading(false)} onError={onMediaError} />}
        {!failed && ready?.kind === "pdf" && <DemoReceiptPdfViewer uri={ready.uri} onLoadComplete={() => setLoading(false)} onError={onMediaError} />}
        {!failed && ready?.kind === "external" && <View style={styles.state}>
          <Text style={[styles.message, { color: Colors.textSecondary }]}>{t("mediaViewer.unsupported")}</Text>
          <Action label={t("mediaViewer.openExternal")} onPress={() => void openExternal()} disabled={opening} />
        </View>}
        {loading && !failed && <View pointerEvents="none" style={styles.overlay}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("mediaViewer.loading")}</Text></View>}
        {failed && <View style={styles.state}><Text accessibilityRole="alert" style={[styles.message, { color: Colors.textPrimary }]}>{t("mediaViewer.error")}</Text><Action label={t("mediaViewer.retry")} onPress={() => setAttempt((value) => value + 1)} /></View>}
      </View>
      {(onPrevious || onNext) && <View style={styles.navigation}><Action label={t("mediaViewer.previous")} onPress={() => onPrevious?.()} disabled={!onPrevious} /><Action label={t("mediaViewer.next")} onPress={() => onNext?.()} disabled={!onNext} /></View>}
    </SafeAreaView>
  </Modal>;
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.button, { borderColor: Colors.divider, opacity: disabled ? 0.4 : 1 }]}><Text style={{ color: Colors.primary, fontWeight: "700" }}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, fontSize: 17, fontWeight: "700" }, body: { flex: 1 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 18 },
  message: { textAlign: "center", fontSize: 16, lineHeight: 24 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 12 },
  button: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderWidth: 1, borderRadius: 10 },
  navigation: { flexDirection: "row", justifyContent: "space-between", padding: 12, gap: 12 },
});
