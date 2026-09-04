import * as DocumentPicker from "expo-document-picker";
import { WorkflowButton } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { formatFileSize } from "@/src/components/screens/ExpenseWorkflowScreen/expenseWorkflowHelpers";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export type PendingAttachment = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
  file?: Blob;
};

export function PendingAttachmentField({
  value,
  onChange,
}: {
  value: PendingAttachment | null;
  onChange: (value: PendingAttachment | null) => void;
}) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [error, setError] = useState("");

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (
        !file ||
        (file.size !== undefined &&
          (file.size < 1 || file.size > MAX_ATTACHMENT_SIZE_BYTES))
      ) {
        setError(t("attachmentPicker.sizeError"));
        return;
      }
      setError("");
      onChange({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        ...(file.file ? { file: file.file } : {}),
      });
    } catch {
      setError(t("attachmentPicker.pickError"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: Colors.textPrimary }]}>
        {t("attachmentPicker.title")}
      </Text>
      <Text style={{ color: Colors.textSecondary }}>
        {t("attachmentPicker.limit")}
      </Text>
      {error ? <Text style={{ color: Colors.error }}>{error}</Text> : null}
      {value ? (
        <View
          style={[
            styles.selected,
            {
              borderColor: Colors.divider,
              backgroundColor: Colors.screenBackground,
            },
          ]}
        >
          <View style={styles.copy}>
            <Text
              style={[styles.name, { color: Colors.textPrimary }]}
              numberOfLines={2}
            >
              {value.name}
            </Text>
            <Text style={{ color: Colors.textSecondary }}>
              {value.size === undefined
                ? t("attachmentPicker.unknownSize")
                : formatFileSize(value.size)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("attachmentPicker.remove")}
            onPress={() => onChange(null)}
          >
            <Text style={{ color: Colors.deleteColor, fontWeight: "800" }}>
              {t("attachmentPicker.remove")}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <WorkflowButton
        label={
          value ? t("attachmentPicker.replace") : t("attachmentPicker.choose")
        }
        onPress={() => void pick()}
        variant="secondary"
        icon="Upload"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  title: { fontSize: 16, fontWeight: "800" },
  selected: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: { flex: 1, gap: 3 },
  name: { fontWeight: "800" },
});
