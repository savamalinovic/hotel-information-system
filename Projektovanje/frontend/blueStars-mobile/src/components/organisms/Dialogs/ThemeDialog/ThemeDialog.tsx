import { Box } from "@/src/components/ui/box";
import { HStack } from "@/src/components/ui/hstack";
import { Pressable } from "@/src/components/ui/pressable";
import { Text } from "@/src/components/ui/text";
import { VStack } from "@/src/components/ui/vstack";
import { useTheme } from "@/src/providers/ThemeProvider";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, View } from "react-native";
import { SettingsDialog } from "../SettingsDialog/SettingsDialog";

interface ThemeDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (themeId: string) => void;
  selectedTheme?: string;
}

export const ThemeDialog: React.FC<ThemeDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  selectedTheme,
}) => {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [selected, setSelected] = useState(selectedTheme);

  const themeOptions = [
    { id: "light", label: t("dialogs.theme.lightTheme"), image: require("@/assets/images/theme_light.png") },
    { id: "dark", label: t("dialogs.theme.darkTheme"), image: require("@/assets/images/theme_dark.png") },
  ];

  return (
    <SettingsDialog
      visible={visible}
      title={t("dialogs.theme.title")}
      onClose={onClose}
      onConfirm={() => onConfirm(selected)}
    >
      <HStack style={styles.optionsContainer}>
        {themeOptions.map((opt) => (
          <Pressable key={opt.id} onPress={() => setSelected(opt.id)} style={styles.option}>
            <VStack style={{ alignItems: "center", width: "100%" }}>
              <View style={{ marginBottom: 16 }}>
                <Image source={opt.image} style={{ width: 51, height: 105, borderRadius: 5 }} />
              </View>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>{opt.label}</Text>
              <Box
                style={[
                  styles.radioOuter,
                  { borderColor: selected === opt.id ? Colors.primary : Colors.tertiary },
                ]}
              >
                {selected === opt.id && <Box style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
              </Box>
            </VStack>
          </Pressable>
        ))}
      </HStack>
    </SettingsDialog>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  option: {
    alignItems: "center",
    width: "40%",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
});