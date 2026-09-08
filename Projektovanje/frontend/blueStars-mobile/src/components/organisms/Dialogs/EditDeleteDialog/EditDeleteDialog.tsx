import React from "react";
import { Modal, View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

interface EditDeleteDialogProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDelete?: boolean;
  position?: { top: number; right: number };
  editText?: string;
  deleteText?: string;
}

export function EditDeleteDialog({
  visible,
  onClose,
  onEdit,
  onDelete,
  showDelete = true,
  position,
  editText,
  deleteText,
}: EditDeleteDialogProps) {
  const { t } = useTranslation();
  const { Colors } = useTheme();

  const DEFAULT_TOP_IOS = 100;
  const DEFAULT_TOP_ANDROID = 40;
  const DEFAULT_RIGHT = 8;

  const calculatedDefaultPosition = {
    top: Platform.OS === 'ios' ? DEFAULT_TOP_IOS : DEFAULT_TOP_ANDROID,
    right: DEFAULT_RIGHT,
  };

  const finalPosition = position ? position : calculatedDefaultPosition;

  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.1)",
    },

    dialog: {
      position: "absolute",
      backgroundColor: Colors.background,
      borderRadius: 15,
      paddingVertical: 6,
      width: 220,
      shadowColor: Colors.shadowColor,
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },

    button: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 14,
    },

    text: {
      fontSize: 16,
      color: Colors.textPrimary,
    },

    deleteText: {
      color: Colors.deleteColor,
      fontWeight: "500",
    },

    divider: {
      height: 1,
      backgroundColor: Colors.borderColor,
      marginVertical: 4,
    },
  });

  const handleEditPress = () => {
    onEdit();
  };

  const handleDeletePress = () => {
    onDelete();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.dialog, finalPosition]}>
          {/* Edit */}
          <Pressable style={styles.button} onPress={handleEditPress}>
            <Icon name="Pencil" size={18} color={Colors.textPrimary} />
            <Text style={styles.text}>
              {editText ?? t('dialogs.editDelete.edit')}
            </Text>
          </Pressable>

          {/* Delete */}
          {showDelete && (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.button} onPress={handleDeletePress}>
                <Icon name="Trash" size={18} color={Colors.deleteColor} />
                <Text style={[styles.text, styles.deleteText]}>
                  {deleteText ?? t('dialogs.editDelete.delete')}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}