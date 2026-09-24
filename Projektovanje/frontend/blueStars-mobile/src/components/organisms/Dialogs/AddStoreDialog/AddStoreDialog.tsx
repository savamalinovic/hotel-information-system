import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
import FormField from "@/src/components/molecules/FormField/FormField";
import { HStack } from "@/src/components/ui/hstack";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/src/components/ui/modal";
import { VStack } from "@/src/components/ui/vstack";
import { Colors } from "@/src/styles/style";
import { LucideIconName } from "@/src/types/types";
import { StoreValidation } from "@/src/util/validationSchemas";
import { Path, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";

interface Props {
    visible: boolean;
    title: string;
    onClose: () => void;
    onConfirm: (data: StoreValidation.FormValues) => void;
}

export default function AddStoreDialog({
    visible,
    title,
    onClose,
    onConfirm,
}: Props) {
	const { t } = useTranslation();

	const { control, handleSubmit, reset, formState: { errors } } = useForm<StoreValidation.FormValues>({
        resolver: zodResolver(StoreValidation.schema),
        defaultValues: {
          name: "",
          address: "",
          activity: "",
          activityCode: "",
          jib: "",
        },
    });

	const renderStoreField = (labelTranslationString: string, name: Path<StoreValidation.FormValues>, placeholder: string, iconName: LucideIconName, inputProps?: any,) => {
		return(
			<FormField
				control={control}
				required
				name={name}
				label={t(labelTranslationString)}
				placeholder={t(placeholder)}
				type="text"
				iconName={iconName}
				isInvalid={false}
				inputProps={inputProps}
			/>
		);
	}

	const onSubmit = (data: StoreValidation.FormValues) => {
        onConfirm(data);
        reset();
        onClose();
    };

	return (
		<Modal isOpen={visible} onClose={onClose}>
			<ModalBackdrop />
			{/* <ModalContent
                style={[
                    styles.modalContainer,
                    { backgroundColor: Colors.background, shadowColor: Colors.shadowColor },
                ]}
            >
                <ModalHeader>
                    <Text style={[styles.sectionTitle, { color: Colors.tertiary }]}>{title}</Text>
                </ModalHeader>

                <ModalBody style={styles.modalBody}>
					<VStack style={styles.addStoreContainer}>
						{renderStoreField('profile.store.labels.name', 'name', 'profile.store.placeholders.name', 'Store')}
						{renderStoreField('profile.store.labels.address', 'address', 'profile.store.placeholders.address', 'MapPinHouse')}
						{renderStoreField('profile.store.labels.activity', 'activity', 'profile.store.placeholders.activity', 'Briefcase')}
						{renderStoreField('profile.store.labels.activityCode', 'activityCode', 'profile.store.placeholders.activityCode', 'Hash', { keyboardType: "numeric" })}
						{renderStoreField('profile.store.labels.jib', 'jib', 'profile.store.placeholders.jib', 'IdCard', { keyboardType: "numeric" })}
					</VStack>
				</ModalBody>

                <ModalFooter style={styles.buttonsContainer}>
                    <HStack style={{ justifyContent: "space-between", width: "100%" }}>
                        <DialogButton title={t("dialogs.store.cancel")} onPress={onClose} />
                        <DialogButton title={t("dialogs.store.add")} onPress={() => handleSubmit(onSubmit)()} />
                    </HStack>
                </ModalFooter>
            </ModalContent> */}

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ width: '90%', justifyContent: 'center', alignItems: 'center' }}
			>
				<ModalContent
					style={[
						styles.modalContainer,
						{ backgroundColor: Colors.background, shadowColor: Colors.shadowColor },
					]}
				>
					<ModalHeader>
						<Text style={[styles.sectionTitle, { color: Colors.tertiary }]}>{title}</Text>
					</ModalHeader>

					<ModalBody style={styles.modalBody}>
						{/* Add ScrollView so the form is reachable when keyboard is up */}
						<ScrollView 
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ flexGrow: 1 }}
						>
							<VStack style={styles.addStoreContainer}>
								{renderStoreField('profile.store.labels.name', 'name', 'profile.store.placeholders.name', 'Store')}
								{renderStoreField('profile.store.labels.address', 'address', 'profile.store.placeholders.address', 'MapPinHouse')}
								{renderStoreField('profile.store.labels.activity', 'activity', 'profile.store.placeholders.activity', 'Briefcase')}
								{renderStoreField('profile.store.labels.activityCode', 'activityCode', 'profile.store.placeholders.activityCode', 'Hash', { keyboardType: "numeric" })}
								{renderStoreField('profile.store.labels.jib', 'jib', 'profile.store.placeholders.jib', 'IdCard', { keyboardType: "numeric" })}
							</VStack>
						</ScrollView>
					</ModalBody>

					<ModalFooter style={styles.buttonsContainer}>
						<HStack style={{ justifyContent: "space-between", width: "100%" }}>
							<DialogButton title={t("dialogs.store.cancel")} onPress={onClose} />
							<DialogButton title={t("dialogs.store.add")} onPress={handleSubmit(onSubmit)} />
						</HStack>
					</ModalFooter>
				</ModalContent>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
    modalContainer: {
        width: "95%",
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
		maxHeight: '80%'
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
        marginTop: 10,
    },
	addStoreContainer: {
		height: 'auto',
		gap: 10,
		flexGrow: 1
	}
});