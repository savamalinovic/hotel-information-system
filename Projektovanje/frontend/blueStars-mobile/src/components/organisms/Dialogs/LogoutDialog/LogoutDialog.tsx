import React from "react";
import { Modal, View, Text, StyleSheet, Platform } from "react-native";
import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
// import { Colors } from "@/src/styles/style";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

interface LogoutDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutDialog: React.FC<LogoutDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { Colors } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.60)",
      justifyContent: "center",
      alignItems: "center",
    },

    modalContainer: {
      width: "90%",
      backgroundColor: Colors.background,
      borderRadius: 20,
      paddingVertical: 30,
      paddingHorizontal: 20,
      alignItems: "center",
      elevation: 8,
      // shadowColor: Colors.shadowColor,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },

    message: {
      fontSize: 16,
      color: Colors.textSecondary,
      textAlign: "center",
      marginBottom: 28,
      lineHeight: 22,
    },

    buttonsContainer: {
      width: "90%",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>

          {/* Tekst */}
          <Text style={styles.message}>
            {t("dialogs.logout.message")}
          </Text>

          {/* Dugmad */}
          <View style={styles.buttonsContainer}>
            <DialogButton title={t("dialogs.logout.cancelButton")} onPress={onCancel} />
            <DialogButton title={t("dialogs.logout.confirmButton")} onPress={onConfirm} />
          </View>

        </View>
      </View>
    </Modal>
  );
};