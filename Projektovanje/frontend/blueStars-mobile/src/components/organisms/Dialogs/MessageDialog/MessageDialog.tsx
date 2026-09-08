import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
// import { Colors } from "@/src/styles/style";
import { useTheme } from "@/src/providers/ThemeProvider";

interface MessageDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  // Primary button (obavezno)
  primaryText: string;
  onPrimary: () => void;
  // Secondary button (opciono)
  secondaryText?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void; // sistemski close
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  visible,
  title,
  description,
  primaryText,
  onPrimary,
  secondaryText,
  onSecondary,
  onRequestClose,
}) => {
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
  
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors.textPrimary,
      textAlign: "center",
    },
  
    description: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: "center",
      marginBottom: 26,
    },
  
    buttonRow: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      gap: 10,
    },
  
    buttonWrapper: {
      flex: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose || onPrimary}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>

          {/* Title */}
          <Text style={[
              styles.title,
              { marginBottom: description ? 10 : 32 }
            ]}>{title}</Text>

          {/* Optional description */}
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          {/* Buttons */}
          <View
            style={[
              styles.buttonRow,
              !secondaryText && { justifyContent: "center" }
            ]}
          >
            {/* Secondary button — samo ako postoji */}
            {secondaryText && (
              <View style={styles.buttonWrapper}>
                <DialogButton
                  title={secondaryText}
                  onPress={onSecondary}
                />
              </View>
            )}

            <View style={styles.buttonWrapper}>
              <DialogButton title={primaryText} onPress={onPrimary} />
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
};

