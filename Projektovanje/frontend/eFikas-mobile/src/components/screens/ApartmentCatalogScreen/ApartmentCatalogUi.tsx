import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ApartmentEffectiveStatus } from "@/src/types/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

const statusColors: Record<ApartmentEffectiveStatus, "success" | "accent" | "primary" | "deleteColor"> = {
  READY: "success",
  DIRTY: "accent",
  CLEANING: "primary",
  MAINTENANCE: "deleteColor",
  OUT_OF_ORDER: "deleteColor",
};

export function ApartmentStatusBadge({ status }: { status: ApartmentEffectiveStatus }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const color = Colors[statusColors[status]];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t("apartmentCatalog.statusLabel", { status: t(`apartmentCatalog.status.${status}`) })}
      style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}
    >
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
        {t(`apartmentCatalog.status.${status}`)}
      </Text>
    </View>
  );
}

export function ApartmentImage({
  uri,
  accessibilityLabel,
  style,
}: {
  uri?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(Boolean(uri));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoading(Boolean(uri));
  }, [uri]);

  const hasImage = Boolean(uri) && !hasError;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.imageFrame, { backgroundColor: Colors.secondary }, style]}
    >
      {hasImage ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <View style={styles.imageFallback}>
          <Icon name="ImageOff" size={28} color={Colors.textSecondary} />
          <Text style={[styles.imageFallbackText, { color: Colors.textSecondary }]}>
            {t("apartmentCatalog.noImages")}
          </Text>
        </View>
      )}
      {hasImage && isLoading && (
        <View style={styles.imageLoading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  imageFrame: { overflow: "hidden", justifyContent: "center", alignItems: "center" },
  imageFallback: { alignItems: "center", gap: 6, padding: 12 },
  imageFallbackText: { fontSize: 12, textAlign: "center" },
  imageLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
