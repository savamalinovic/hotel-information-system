import { Icon } from "@/src/components/atoms/Icon/Icon";
import {
  useApartmentCatalogDetail,
  useApartmentStatusHistory,
  useApartmentUnavailability,
} from "@/src/hooks/useApartmentCatalog";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ApartmentPicture, ApartmentStatusHistory, ApartmentUnavailability } from "@/src/types/types";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ApartmentImage, ApartmentStatusBadge } from "./ApartmentCatalogUi";
import {
  formatDate,
  formatDateTime,
  formatPrice,
  getRelevantUnavailability,
  isCurrentUnavailability,
  sortApartmentPictures,
} from "./apartmentCatalogHelpers";

export default function ApartmentCatalogDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const apartmentId = parsePositiveId(id);
  const detail = useApartmentCatalogDetail(apartmentId);
  const history = useApartmentStatusHistory(apartmentId);
  const unavailability = useApartmentUnavailability(apartmentId);
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  const refresh = () => {
    void Promise.all([detail.refetch(), history.refetch(), unavailability.refetch()]);
  };

  if (apartmentId === null) {
    return <InvalidRouteState fallbackHref="/(home)/apartments" />;
  }

  if (detail.isPending) {
    return (
      <SafeAreaView edges={["bottom"]} style={[styles.centered, { backgroundColor: Colors.screenBackground }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{t("apartmentCatalog.loadingDetail")}</Text>
      </SafeAreaView>
    );
  }

  if (detail.isError || !detail.data) {
    return <DetailError title={t("apartmentCatalog.detailError.title")} description={t("apartmentCatalog.detailError.description")} onRetry={refresh} />;
  }

  const apartment = detail.data;
  const statusHistory = [...(history.data ?? [])]
    .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());
  const relevantPeriods = getRelevantUnavailability(unavailability.data ?? []);
  const refreshing = detail.isRefetching || history.isRefetching || unavailability.isRefetching;

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: Colors.screenBackground }}>
      <ScrollView
        style={{ backgroundColor: Colors.screenBackground }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
      <Stack.Screen options={{ title: apartment.name }} />
      <ApartmentGallery apartmentName={apartment.name} pictures={sortApartmentPictures(apartment.pictures)} />

      <View style={[styles.titleSection, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
        <Text style={[styles.name, { color: Colors.textPrimary }]}>{apartment.name}</Text>
        <Text style={[styles.address, { color: Colors.textSecondary }]}>{apartment.address}</Text>
        <Text style={[styles.readOnly, { color: Colors.textSecondary }]}>{t("apartmentCatalog.readOnly")}</Text>
      </View>

      <Section title={t("apartmentCatalog.statuses")}>
        <View style={styles.statusRows}>
          <StatusRow label={t("apartmentCatalog.operationalStatus")} status={apartment.operationalStatus} />
          <StatusRow label={t("apartmentCatalog.effectiveStatus")} status={apartment.effectiveStatus} />
        </View>
      </Section>

      <Section title={t("apartmentCatalog.details")}>
        <View style={styles.detailsGrid}>
          <Field label={t("apartmentCatalog.floor")} value={String(apartment.floor)} />
          <Field label={t("apartmentCatalog.type")} value={apartment.type.name} />
          <Field label={t("apartmentCatalog.capacity")} value={String(apartment.type.capacity)} />
          <Field
            label={t("apartmentCatalog.defaultPrice")}
            value={formatPrice(apartment.type.defaultNightlyRate, t("apartmentCatalog.currency"))}
          />
          <Field
            label={t("apartmentCatalog.active")}
            value={t(apartment.active ? "apartmentCatalog.activeYes" : "apartmentCatalog.activeNo")}
          />
        </View>
        {apartment.type.description && (
          <View style={styles.descriptionBlock}>
            <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("apartmentCatalog.typeDescription")}</Text>
            <Text style={[styles.descriptionText, { color: Colors.textPrimary }]}>{apartment.type.description}</Text>
          </View>
        )}
      </Section>

      <Section title={t("apartmentCatalog.unavailability")}>
        <AsyncSection
          isLoading={unavailability.isPending}
          isError={unavailability.isError}
          empty={relevantPeriods.length === 0}
          emptyText={t("apartmentCatalog.noUnavailability")}
          onRetry={() => void unavailability.refetch()}
        >
          {relevantPeriods.map((period) => (
            <UnavailabilityRow key={period.apartmentUnavailabilityId} period={period} language={i18n.language} />
          ))}
        </AsyncSection>
      </Section>

      <Section title={t("apartmentCatalog.statusHistory")}>
        <AsyncSection
          isLoading={history.isPending}
          isError={history.isError}
          empty={statusHistory.length === 0}
          emptyText={t("apartmentCatalog.noStatusHistory")}
          onRetry={() => void history.refetch()}
        >
          {statusHistory.map((entry) => (
            <StatusHistoryRow key={entry.apartmentStatusHistoryId} entry={entry} language={i18n.language} />
          ))}
        </AsyncSection>
      </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function ApartmentGallery({ apartmentName, pictures }: { apartmentName: string; pictures: ApartmentPicture[] }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  if (pictures.length === 0) {
    return (
      <ApartmentImage
        accessibilityLabel={t("apartmentCatalog.image", { name: apartmentName })}
        style={styles.heroImage}
      />
    );
  }

  return (
    <View style={styles.gallery}>
      <FlatList
        data={pictures}
        keyExtractor={(picture) => String(picture.pictureId)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ApartmentImage
            uri={item.url}
            accessibilityLabel={t("apartmentCatalog.imageOf", { name: apartmentName, index: index + 1, total: pictures.length })}
            style={[styles.heroImage, { width: width - 32 }]}
          />
        )}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
          setActiveIndex(nextIndex);
        }}
      />
      {pictures.length > 1 && (
        <View accessibilityRole="text" accessibilityLabel={t("apartmentCatalog.galleryPosition", { current: activeIndex + 1, total: pictures.length })} style={styles.galleryIndicator}>
          {pictures.map((picture, index) => (
            <View key={picture.pictureId} style={[styles.indicatorDot, { backgroundColor: index === activeIndex ? Colors.primary : Colors.divider }]} />
          ))}
        </View>
      )}
    </View>
  );
}

function DetailError({ title, description, onRetry }: { title: string; description?: string; onRetry: () => void }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.centered, { backgroundColor: Colors.screenBackground }]}>
      <Icon name="CircleAlert" size={38} color={Colors.deleteColor} />
      <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{title}</Text>
      {description && <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{description}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("apartmentCatalog.retry")}
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: Colors.primary }]}
      >
        <Text style={[styles.retryText, { color: Colors.textLight }]}>{t("apartmentCatalog.retry")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>{children}</View>
    </View>
  );
}

function StatusRow({ label, status }: { label: string; status: "READY" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER" }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{label}</Text>
      <ApartmentStatusBadge status={status} />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.fieldValue, { color: Colors.textPrimary }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function AsyncSection({
  isLoading,
  isError,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  if (isLoading) {
    return <View style={styles.sectionLoading}><ActivityIndicator color={Colors.primary} /></View>;
  }

  if (isError) {
    return (
      <View style={styles.partialError}>
        <Text style={[styles.partialErrorText, { color: Colors.textSecondary }]}>{t("apartmentCatalog.partialError")}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("apartmentCatalog.retry")} onPress={onRetry}>
          <Text style={[styles.partialRetry, { color: Colors.primary }]}>{t("apartmentCatalog.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  if (empty) {
    return <Text style={[styles.emptySectionText, { color: Colors.textSecondary }]}>{emptyText}</Text>;
  }

  return <View style={styles.rows}>{children}</View>;
}

function UnavailabilityRow({ period, language }: { period: ApartmentUnavailability; language: string }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const isCurrent = isCurrentUnavailability(period);
  return (
    <View style={[styles.timelineRow, { borderBottomColor: Colors.divider }]}>
      <View style={styles.timelineCopy}>
        <Text style={[styles.timelineTitle, { color: Colors.textPrimary }]}>{period.reason}</Text>
        <Text style={[styles.timelineDate, { color: Colors.textSecondary }]}>
          {formatDate(period.startDate, language)} — {formatDate(period.endDate, language)}
        </Text>
      </View>
      <Text style={[styles.periodKind, { color: isCurrent ? Colors.deleteColor : Colors.primary }]}>
        {t(isCurrent ? "apartmentCatalog.current" : "apartmentCatalog.upcoming")}
      </Text>
    </View>
  );
}

function StatusHistoryRow({ entry, language }: { entry: ApartmentStatusHistory; language: string }) {
  const { Colors } = useTheme();
  return (
    <View style={[styles.timelineRow, { borderBottomColor: Colors.divider }]}>
      <View style={styles.timelineCopy}>
        <ApartmentStatusBadge status={entry.status} />
        <Text style={[styles.timelineDate, { color: Colors.textSecondary }]}>{formatDateTime(entry.changedAt, language)}</Text>
        <Text style={[styles.reason, { color: Colors.textPrimary }]}>{entry.reason}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  stateTitle: { fontSize: 19, fontWeight: "700", textAlign: "center" },
  stateDescription: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 18, borderRadius: 10, marginTop: 2 },
  retryText: { fontSize: 14, fontWeight: "700" },
  gallery: { gap: 10 },
  heroImage: { height: 230, width: "100%", borderRadius: 14 },
  galleryIndicator: { flexDirection: "row", justifyContent: "center", gap: 6 },
  indicatorDot: { width: 7, height: 7, borderRadius: 4 },
  titleSection: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 5 },
  name: { fontSize: 24, fontWeight: "700" },
  address: { fontSize: 15, lineHeight: 21 },
  readOnly: { fontSize: 13, marginTop: 3 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  statusRows: { gap: 14 },
  statusRow: { gap: 6 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  field: { width: "46%", gap: 3 },
  fieldLabel: { fontSize: 12 },
  fieldValue: { fontSize: 15, fontWeight: "600" },
  descriptionBlock: { gap: 4, marginTop: 16 },
  descriptionText: { fontSize: 15, lineHeight: 21 },
  sectionLoading: { minHeight: 54, alignItems: "center", justifyContent: "center" },
  partialError: { gap: 8 },
  partialErrorText: { fontSize: 14 },
  partialRetry: { fontSize: 14, fontWeight: "700" },
  emptySectionText: { fontSize: 14, lineHeight: 20 },
  rows: { marginHorizontal: -14, marginVertical: -14 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  timelineCopy: { flex: 1, gap: 5 },
  timelineTitle: { fontSize: 15, fontWeight: "600" },
  timelineDate: { fontSize: 13, lineHeight: 18 },
  periodKind: { fontSize: 12, fontWeight: "700", textAlign: "right", maxWidth: 92 },
  reason: { fontSize: 14, lineHeight: 20 },
});
