import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
import { HStack } from "@/src/components/ui/hstack";
import { Modal, ModalBackdrop, ModalContent, ModalFooter, ModalHeader } from "@/src/components/ui/modal";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

interface ConfirmationDialogProps {
	visible: boolean;
	title: string;
	onClose: () => void;
	onConfirm: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
	visible,
	title,
	onClose,
	onConfirm,
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
		textAlign: "center",
	},
	buttonsContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "90%",
		marginTop: 10,
	},
});