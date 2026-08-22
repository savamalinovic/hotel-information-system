import DescriptionBox from "@/src/components/atoms/DescriptionBox/DescriptionBox";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Label } from "@/src/components/atoms/Label/Label";
import ApartmentFeatureCard from "@/src/components/molecules/ApartmentFeatureCard/ApartmentFeatureCard";
import ApartmentCard from "@/src/components/organisms/ApartmentCard/ApartmentCard";
import { EditDeleteDialog } from "@/src/components/organisms/Dialogs/EditDeleteDialog/EditDeleteDialog";
import { IdDocumentDialog } from "@/src/components/organisms/Dialogs/IdDocumentDialog/IdDocumentDialog";
import { MessageDialog } from "@/src/components/organisms/Dialogs/MessageDialog/MessageDialog";
import ReservationDetailsTemplate from "@/src/components/templates/ReservationDetailsTemplate/ReservationDetailsTemplate";
import { useRouter } from "expo-router";
import { useDeleteReservation } from "@/src/hooks/useReservation";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";
import { dateService } from "@/src/services/dateService";
import { Reservation } from "@/src/types/types";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useMemo, useState } from "react";
import { Pressable } from "react-native";

dayjs.extend(utc);
dayjs.extend(timezone);

interface Props {
	reservation: Reservation;
}

const ReservationDetailsScreen = ({ reservation }: Props) => {
	const { t } = useTranslation();
	const { Colors } = useTheme();
	const navigation = useNavigation();
	const router = useRouter();

	// -------------------- Dialog state --------------------
	const [dialogs, setDialogs] = useState({
		idDocument: false,
		editDelete: false,
		deleteConfirm: false,
	});

	const toggleDialog = (dialogName: keyof typeof dialogs, value: boolean) => {
		setDialogs((prev) => ({ ...prev, [dialogName]: value }));
	};

	const deleteMutation = useDeleteReservation(
		reservation.reservationId,
		reservation.apartment.apartmentId
	);

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync();
			toggleDialog("deleteConfirm", false);
			toggleDialog("editDelete", false);
			router.back();
		} catch (err) {
			console.log("Greška pri brisanju:", err);
		}
	};

	const handleEdit = () => {
		toggleDialog("editDelete", false);

		router.replace({
			pathname: "/(home)/reservations/addReservation",
			params: {
				mode: "edit",
				reservationId: reservation.reservationId,
				reservationData: JSON.stringify(reservation),
			},
		});
	};

	// header - tri tackice
	useEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<Pressable
					onPress={() => toggleDialog("editDelete", true)}
					style={{ paddingHorizontal: 8 }}
				>
					<Icon name="Ellipsis" size={24} color={Colors.textPrimary} />
				</Pressable>
			),
		});
	}, [navigation, Colors.textPrimary]);

	// Memoizacija INFO_ITEMS
	const INFO_ITEMS = useMemo(
		() => [
			{
				key: "guest",
				label: `${reservation.guest.name} ${reservation.guest.surname}`,
				icon: "User" as const,
			},
			{
				key: "phone",
				label: reservation.guest.phoneNumber,
				icon: "Phone" as const,
			},
			{
				key: "people",
				label: t("reservations.details.peopleCount", {
					count: reservation.guestQuantity,
				}),
				icon: "Users" as const,
			},
			{
				key: "document",
				label: t("reservations.details.document"),
				icon: "IdCard" as const,
				rightElement: (
					<Icon name="ChevronRight" size={22} color={Colors.iconMenu} />
				),
				onPress: () => toggleDialog("idDocument", true),
			},
			{
				key: "arrival",
				label: dateService.formatLocalDateTime(reservation.guest.dateTimeOfArrival),
				icon: "CalendarArrowDown" as const,
			},
			{
				key: "departure",
				label: dateService.formatLocalDateTime(reservation.guest.dateTimeOfDeparture),
				icon: "CalendarArrowUp" as const,
			},
		],
		[
			reservation.guest.name,
			reservation.guest.surname,
			reservation.guest.phoneNumber,
			reservation.guestQuantity,
			reservation.guest.dateTimeOfArrival,
			reservation.guest.dateTimeOfDeparture,
			Colors.iconMenu,
			t,
		]
	);

	// wrap-ovano sa useMemo
	const infoItems = useMemo(
		() =>
			INFO_ITEMS.map((item) => (
				<ApartmentFeatureCard
					key={item.key}
					label={item.label}
					icon={<Icon name={item.icon} size={22} color={Colors.primary} />}
					rightElement={item.rightElement}
					onPress={item.onPress}
				/>
			)),
		[INFO_ITEMS, Colors.primary]
	);

	// wrap-ovano sa useMemo
	const dialogConfigs = useMemo(
		() => ({
			idDocument: {
				visible: dialogs.idDocument,
				onClose: () => toggleDialog("idDocument", false),
				documentUrl: reservation.guest.personalDocumentURL,
			},
			editDelete: {
				visible: dialogs.editDelete,
				onClose: () => toggleDialog("editDelete", false),
				onEdit: handleEdit,
				onDelete: () => {
					toggleDialog("editDelete", false);
					toggleDialog("deleteConfirm", true);
				},
				showDelete: true,
				deleteText: t("reservations.details.deleteText"),
			},
			deleteConfirm: {
				visible: dialogs.deleteConfirm,
				title: t("reservations.details.deleteConfirm.title"),
				description: t("reservations.details.deleteConfirm.description"),
				primaryText: t("reservations.details.deleteConfirm.confirm"),
				secondaryText: t("reservations.details.deleteConfirm.cancel"),
				onPrimary: handleDelete,
				onSecondary: () => toggleDialog("deleteConfirm", false),
				onRequestClose: () => toggleDialog("deleteConfirm", false),
			},
		}),
		[
			dialogs,
			reservation.guest.personalDocumentURL,
			t,
			handleDelete,
			handleEdit,
		]
	);

	return (
		<>
			<ReservationDetailsTemplate
				headerCard={
					<ApartmentCard
						name={reservation.apartment.name}
						address={reservation.apartment.address}
						imageUrl={reservation.apartment.pictures?.[0] ?? undefined}
						onPress={() => console.log("...")}
						showArrow={false}
            			showStatus={false}
					/>
				}
				infoItems={infoItems}
				noteHeader={
					<Label
						text={t("reservations.details.note")}
						align="left"
						size="xl"
						color={Colors.textPrimary}
					/>
				}
				noteBody={
					<DescriptionBox
						size="lg"
						placeholder={reservation.note ?? ""}
						isReadOnly
					/>
				}
			/>

			{/* Svi dialozi na ekranu */}
			<IdDocumentDialog {...dialogConfigs.idDocument} />

			<EditDeleteDialog {...dialogConfigs.editDelete} />

			<MessageDialog {...dialogConfigs.deleteConfirm} />
		</>
	);
};

export default ReservationDetailsScreen;
