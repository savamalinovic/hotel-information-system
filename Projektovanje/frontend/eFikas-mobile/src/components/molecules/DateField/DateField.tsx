import { Icon } from "@/src/components/atoms/Icon/Icon";
import DateTimePicker from "@/src/components/organisms/DateTimePicker/DateTimePicker";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

const parseDateKey = (value?: string): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function DateField({
  label,
  value,
  onChange,
  required = false,
  clearable = false,
  minimumDate,
  maximumDate,
  containerStyle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const parsed = parseDateKey(value);
  const displayValue = parsed
    ? new Intl.DateTimeFormat(
        i18n.language.startsWith("sr") ? "sr-Latn-BA" : "en-GB",
        { dateStyle: "medium" },
      ).format(parsed)
    : t("datePicker.chooseDate");

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: Colors.textPrimary }]}>
        {label}
        {required ? " *" : ""}
      </Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => setVisible(true)}
          style={[
            styles.field,
            {
              borderColor: Colors.divider,
              backgroundColor: Colors.screenBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.value,
              { color: parsed ? Colors.textPrimary : Colors.textSecondary },
            ]}
          >
            {displayValue}
          </Text>
          <Icon name="CalendarDays" size={20} color={Colors.primary} />
        </Pressable>
        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("datePicker.clear")}
            onPress={() => onChange("")}
            style={[styles.clear, { borderColor: Colors.divider }]}
          >
            <Icon name="X" size={19} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <DateTimePicker
        visible={visible}
        initialValue={parsed}
        timePicker={false}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onClose={() => setVisible(false)}
        onConfirm={(date) => onChange(toDateKey(date))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  field: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  value: { flex: 1, fontSize: 15 },
  clear: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
