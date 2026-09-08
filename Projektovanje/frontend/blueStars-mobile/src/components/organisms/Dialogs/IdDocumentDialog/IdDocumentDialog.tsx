import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { Image } from "@/src/components/ui/image";
import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
// import { Colors } from "@/src/styles/style";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

interface IdDocumentDialogProps {
  visible: boolean;
  documentUrl?: string;
  onClose: () => void;
}

export const IdDocumentDialog: React.FC<IdDocumentDialogProps> = ({
  visible,
  documentUrl,
  onClose,
}) => {
    const { t } = useTranslation();
    const { Colors } = useTheme();
    // console.log("DOCUMENT URL:", documentUrl);

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
        documentImage: {
          width: "100%",
          height: 300,
          marginBottom: 20,
          borderRadius: 10,
        },
        noDocumentText: {
          fontSize: 16,
          fontWeight: "400",
          color: Colors.textSecondary,
          textAlign: "center",
          marginBottom: 32,
        },
    });

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {documentUrl ? (
              <Image
                source={{ uri: documentUrl }}
                alt="document"
                style={styles.documentImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.noDocumentText}>
                 {t("dialogs.message.details.message")}
              </Text>
            )}
            <DialogButton 
              title={t("dialogs.message.details.button")}
              onPress={onClose} />
          </View>
        </View>
      </Modal>
    );
};