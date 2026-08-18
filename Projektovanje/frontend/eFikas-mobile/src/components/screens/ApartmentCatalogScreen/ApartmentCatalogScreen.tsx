import { ApartmentCatalogFilters } from "@/src/api/services/apartmentCatalogService";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useApartmentCatalog, useApartmentTypes } from "@/src/hooks/useApartmentCatalog";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ApartmentDetails, ApartmentOperationalStatus } from "@/src/types/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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
  TextInput,
  View,
} from "react-native";
import { ApartmentImage, ApartmentStatusBadge } from "./ApartmentCatalogUi";
import { filterLoadedApartments, formatPrice, sortApartmentPictures } from "./apartmentCatalogHelpers";

const operationalStatuses: ApartmentOperationalStatus[] = ["READY", "DIRTY", "CLEANING", "MAINTENANCE"];

export default function ApartmentCatalogScreen() {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [apartmentTypeId, setApartmentTypeId] = useState<number>();
  const [status, setStatus] = useState<ApartmentOperationalStatus>();
  const [outOfOrder, setOutOfOrder] = useState(false);

  const filters = useMemo<Omit<ApartmentCatalogFilters, "page">>(
    () => ({
      active: true,
      size: 20,
      sort: "name,asc",
      ...(apartmentTypeId ? { apartmentTypeId } : {}),
      ...(status ? { status } : {}),
      ...(outOfOrder ? { outOfOrder: true } : {}),
    }),
    [apartmentTypeId, outOfOrder, status]
  );
  const catalog = useApartmentCatalog(filters);
  const apartmentTypes = useApartmentTypes();
  const visibleApartments = useMemo(
    () => filterLoadedApartments(catalog.apartments, search),
    [catalog.apartments, search]
  );
  const hasFilters = Boolean(search.trim() || apartmentTypeId || status || outOfOrder);

  const resetFilters = () => {
    setSearch("");
    setApartmentTypeId(undefined);
    setStatus(undefined);
    setOutOfOrder(false);
  };

  const refresh = () => {
    void Promise.all([catalog.refetch(), apartmentTypes.refetch()]);
  };

  const fetchNextPage = () => {
    if (catalog.hasNextPage && !catalog.isFetchingNextPage && !catalog.isFetching) {
      void catalog.fetchNextPage();
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <FlatList
        data={visibleApartments}
        keyExtractor={(apartment) => String(apartment.apartmentId)}
        renderItem={({ item }) => <ApartmentCard apartment={item} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <CatalogFilters
            apartmentTypeId={apartmentTypeId}
            status={status}
            outOfOrder={outOfOrder}
            search={search}
            hasFilters={hasFilters}
            apartmentTypes={apartmentTypes.data?.content ?? []}
            typesLoading={apartmentTypes.isPending}
            typesError={apartmentTypes.isError}
            onSearchChange={setSearch}
            onApartmentTypeChange={setApartmentTypeId}
            onStatusChange={setStatus}
            onOutOfOrderChange={() => setOutOfOrder((current) => !current)}
            onReset={resetFilters}
            onRetryTypes={() => void apartmentTypes.refetch()}
          />
        }
        ListEmptyComponent={
          <CatalogListState
            isLoading={catalog.isPending}
            isError={catalog.isError}
            isFiltered={hasFilters}
            onRetry={() => void catalog.refetch()}
          />
        }
        ListFooterComponent={
          catalog.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary }}>{t("apartmentCatalog.loadingMore")}</Text>
            </View>
          ) : null
        }
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={catalog.isRefetching || apartmentTypes.isRefetching}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function CatalogFilters({
  apartmentTypeId,
  status,
  outOfOrder,
  search,
  hasFilters,
  apartmentTypes,
  typesLoading,
  typesError,
  onSearchChange,
  onApartmentTypeChange,
  onStatusChange,
  onOutOfOrderChange,
  onReset,
  onRetryTypes,
}: {
  apartmentTypeId?: number;
  status?: ApartmentOperationalStatus;
  outOfOrder: boolean;
  search: string;
  hasFilters: boolean;
  apartmentTypes: { apartmentTypeId: number; name: string }[];
  typesLoading: boolean;
  typesError: boolean;
  onSearchChange: (value: string) => void;
  onApartmentTypeChange: (value?: number) => void;
  onStatusChange: (value?: ApartmentOperationalStatus) => void;
  onOutOfOrderChange: () => void;
  onReset: () => void;
  onRetryTypes: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.filters}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("apartmentCatalog.title")}</Text>
          <Text style={[styles.readOnly, { color: Colors.textSecondary }]}>{t("apartmentCatalog.readOnly")}</Text>
        </View>
        {hasFilters && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("apartmentCatalog.resetFilters")}
            onPress={onReset}
            hitSlop={8}
          >
            <Text style={[styles.resetText, { color: Colors.primary }]}>{t("apartmentCatalog.reset")}</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.search, { borderColor: Colors.divider, backgroundColor: Colors.background }]}>
        <Icon name="Search" size={20} color={Colors.textSecondary} />
        <TextInput
          accessibilityLabel={t("apartmentCatalog.searchLabel")}
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("apartmentCatalog.searchPlaceholder")}
          placeholderTextColor={Colors.textSecondary}
          style={[styles.searchInput, { color: Colors.textPrimary }]}
          returnKeyType="search"
        />
      </View>

      <Text style={[styles.filterLabel, { color: Colors.textPrimary }]}>{t("apartmentCatalog.typeFilter")}</Text>
      {typesLoading ? (
        <View style={styles.filterLoading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={{ color: Colors.textSecondary }}>{t("apartmentCatalog.loadingTypes")}</Text>
        </View>
      ) : typesError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("apartmentCatalog.retryTypes")}
          onPress={onRetryTypes}
          style={[styles.inlineError, { borderColor: Colors.divider }]}
        >
          <Icon name="CircleAlert" size={18} color={Colors.deleteColor} />
          <Text style={[styles.inlineErrorText, { color: Colors.textSecondary }]}>{t("apartmentCatalog.typesError")}</Text>
          <Text style={[styles.retryInlineText, { color: Colors.primary }]}>{t("apartmentCatalog.retry")}</Text>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label={t("apartmentCatalog.allTypes")}
            selected={!apartmentTypeId}
            onPress={() => onApartmentTypeChange(undefined)}
          />
          {apartmentTypes.map((type) => (
            <FilterChip
              key={type.apartmentTypeId}
              label={type.name}
              selected={apartmentTypeId === type.apartmentTypeId}
              onPress={() => onApartmentTypeChange(type.apartmentTypeId)}
            />
          ))}
        </ScrollView>
      )}

      <Text style={[styles.filterLabel, { color: Colors.textPrimary }]}>{t("apartmentCatalog.statusFilter")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <FilterChip
          label={t("apartmentCatalog.allStatuses")}
          selected={!status}
          onPress={() => onStatusChange(undefined)}
        />
        {operationalStatuses.map((item) => (
          <FilterChip
            key={item}
            label={t(`apartmentCatalog.status.${item}`)}
            selected={status === item}
            onPress={() => onStatusChange(item)}
          />
        ))}
        <FilterChip
          label={t("apartmentCatalog.outOfOrderFilter")}
          selected={outOfOrder}
          onPress={onOutOfOrderChange}
        />
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: selected ? Colors.primary : Colors.background },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? Colors.textLight : Colors.textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function CatalogListState({
  isLoading,
  isError,
  isFiltered,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  isFiltered: boolean;
  onRetry: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.skeletonList} accessibilityLabel={t("apartmentCatalog.loading")}>
        {[0, 1, 2].map((item) => <View key={item} style={[styles.skeletonCard, { backgroundColor: Colors.secondary }]} />)}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.stateCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
        <Icon name="CircleAlert" size={34} color={Colors.deleteColor} />
        <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{t("apartmentCatalog.error.title")}</Text>
        <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{t("apartmentCatalog.error.description")}</Text>
        <RetryButton onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={[styles.stateCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
      <Icon name={isFiltered ? "SearchX" : "House"} size={34} color={Colors.primary} />
      <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>
        {t(isFiltered ? "apartmentCatalog.emptyFiltered.title" : "apartmentCatalog.empty.title")}
      </Text>
      <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>
        {t(isFiltered ? "apartmentCatalog.emptyFiltered.description" : "apartmentCatalog.empty.description")}
      </Text>
    </View>
  );
}

function ApartmentCard({ apartment }: { apartment: ApartmentDetails }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const firstPicture = sortApartmentPictures(apartment.pictures)[0];
  const statusLabel = t(`apartmentCatalog.status.${apartment.effectiveStatus}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("apartmentCatalog.openDetails", { name: apartment.name, status: statusLabel })}
      onPress={() => router.push({ pathname: "/(home)/apartments/[id]", params: { id: String(apartment.apartmentId) } })}
      style={[styles.apartmentCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}
    >
      <ApartmentImage
        uri={firstPicture?.url}
        accessibilityLabel={t("apartmentCatalog.image", { name: apartment.name })}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCopy}>
            <Text style={[styles.apartmentName, { color: Colors.textPrimary }]} numberOfLines={1}>{apartment.name}</Text>
            <Text style={[styles.address, { color: Colors.textSecondary }]} numberOfLines={2}>{apartment.address}</Text>
          </View>
          <Icon name="ChevronRight" size={22} color={Colors.textSecondary} />
        </View>
        <ApartmentStatusBadge status={apartment.effectiveStatus} />
        <View style={styles.detailGrid}>
          <DetailText label={t("apartmentCatalog.floor")} value={String(apartment.floor)} />
          <DetailText label={t("apartmentCatalog.type")} value={apartment.type.name} />
          <DetailText label={t("apartmentCatalog.capacity")} value={String(apartment.type.capacity)} />
          <DetailText label={t("apartmentCatalog.defaultPrice")} value={formatPrice(apartment.type.defaultNightlyRate, t("apartmentCatalog.currency"))} />
        </View>
      </View>
    </Pressable>
  );
}

function DetailText({ label, value }: { label: string; value: string }) {
  const { Colors } = useTheme();
  return (
    <View style={styles.detailText}>
      <Text style={[styles.detailLabel, { color: Colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.detailValue, { color: Colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("apartmentCatalog.retry")}
      onPress={onPress}
      style={[styles.retryButton, { backgroundColor: Colors.primary }]}
    >
      <Text style={[styles.retryText, { color: Colors.textLight }]}>{t("apartmentCatalog.retry")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12, flexGrow: 1 },
  filters: { gap: 10, paddingBottom: 2 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  titleCopy: { flex: 1, gap: 2 },
  title: { fontSize: 24, fontWeight: "700" },
  readOnly: { fontSize: 13 },
  resetText: { fontSize: 14, fontWeight: "700", paddingVertical: 4 },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 9 },
  filterLabel: { fontSize: 14, fontWeight: "700", marginTop: 3 },
  chipRow: { gap: 8, paddingRight: 16 },
  chip: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderRadius: 22, paddingHorizontal: 13 },
  chipText: { fontSize: 14, fontWeight: "600" },
  filterLoading: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  inlineError: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  inlineErrorText: { flex: 1, fontSize: 13 },
  retryInlineText: { fontSize: 13, fontWeight: "700" },
  skeletonList: { gap: 12, paddingTop: 4 },
  skeletonCard: { height: 190, borderRadius: 14 },
  stateCard: { marginTop: 8, borderWidth: 1, borderRadius: 14, padding: 24, alignItems: "center", gap: 10 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateDescription: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryButton: { minHeight: 44, justifyContent: "center", borderRadius: 10, paddingHorizontal: 18, marginTop: 2 },
  retryText: { fontSize: 14, fontWeight: "700" },
  footerLoading: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, paddingVertical: 12 },
  apartmentCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  cardImage: { height: 164, width: "100%" },
  cardBody: { padding: 14, gap: 11 },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  cardTitleCopy: { flex: 1, gap: 3 },
  apartmentName: { fontSize: 18, fontWeight: "700" },
  address: { fontSize: 14, lineHeight: 19 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailText: { width: "47%", gap: 2 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 14, fontWeight: "600" },
});
