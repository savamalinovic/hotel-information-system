import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
import { HStack } from "@/src/components/ui/hstack";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/src/components/ui/modal";
import { Text } from "@/src/components/ui/text";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

interface SettingsDialogProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    onConfirm: () => void;
    children: React.ReactNode; // the modal body
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
    visible,
    title,
    onClose,
    onConfirm,
    children,
}) => {
    const { Colors } = useTheme();
	const { t } = useTranslation();

    return (
        <Modal isOpen={visible} onClose={onClose}>
            <ModalBackdrop />
            <ModalContent
                style={[
                    styles.modalContainer,
                    { backgroundColor: Colors.background, shadowColor: Colors.shadowColor },
                ]}
            >
                <ModalHeader>
                    <Text style={[styles.sectionTitle, { color: Colors.tertiary }]}>{title}</Text>
                </ModalHeader>

                <ModalBody style={styles.modalBody}>{children}</ModalBody>

                <ModalFooter style={styles.buttonsContainer}>
                    <HStack style={{ justifyContent: "space-between", width: "100%" }}>
                        <DialogButton title={t('dialogs.language.cancelButton')} onPress={onClose} />
                        <DialogButton title={t('dialogs.language.confirmButton')} onPress={() => {onConfirm(); onClose();}} />
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        width: "90%",
        borderRadius: 20,
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignItems: "center",
        elevation: 8,
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    modalBody: {
        width: '100%',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 24,
        textAlign: "left",
    },
    buttonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "90%",
        marginTop: 10,
    },
});