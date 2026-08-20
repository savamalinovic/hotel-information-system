import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Label } from "@/src/components/atoms/Label/Label";
import ToggleItem from "@/src/components/molecules/ToggleItem/ToggleItem";
import DateTimePicker from "@/src/components/organisms/DateTimePicker/DateTimePicker";
import AddReservationTemplate from "@/src/components/templates/AddReservationTemplate/AddReservationTemplate";
import { HStack } from "@/src/components/ui/hstack";
import { useApartments } from "@/src/hooks/useApartments";
import {
	useCreateReservation,
	useUpdateReservation,
} from "@/src/hooks/useReservation";
import { useTheme } from "@/src/providers/ThemeProvider";
import {
	CreateReservationPayload,
	DomesticGuest,
	ForeignGuest,
	LegacyReservationGuest,
	LucideIconName,
	Reservation,
	UpdateReservationPayload,
} from "@/src/types/types";
import { GuestValidation } from "@/src/util/validationSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Path, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	Alert,
	Image,
	Keyboard,
	Modal,
	Platform,
	Pressable,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import CustomRadioGroup from "../../atoms/CustomRadio/CustomRadioGroup";
import { IconButton } from "../../atoms/IconButton/IconButton";
import FormField from "../../molecules/FormField/FormField";
import NoteBox from "../../molecules/NoteBox/NoteBox";
import ApartmentSelectDropdown from "../../organisms/ApartmentSelectDropdown/ApartmentSelectDropdown";
import { ApartmentOption } from "../../organisms/ApartmentSelectOverlay/ApartmentSelectOverlay";
import { Spinner } from "../../ui/spinner";
import { createStyles } from "./index.styles";
import { toastService } from "@/src/services/toastService";
import { dateService } from "@/src/services/dateService";

type GuestType = "DOMESTIC" | "FOREIGN";
type Gender = "Male" | "Female";
type ActiveDateField =
  | "ARRIVAL"
  | "DEPARTURE"
  | "BIRTH_DATE"
  | "PASSPORT_ISSUED"
  | "ENTRY_DATE"
  | "PERMITTED_RESIDENCE"
  | null;

const dayjs: any = require("dayjs");

const formatDateTimeLabel = (date: Date | null) => {
  if (!date) return "";
  return dayjs(date).format("DD. MM. YYYY. HH:mm");
};

const formatDateLabel = (date: Date | null) => {
  if (!date) return "";
  return dayjs(date).format("DD. MM. YYYY.");
};

const clampGuests = (n: number) => Math.max(1, Math.min(20, n));

function AddReservationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  // Odlucivanje da li smo u edit modu
  const isEditMode = route.params?.mode === "edit";
  const reservationId = route.params?.reservationId;
  const existingReservation: Reservation | null = route.params?.reservationData
    ? JSON.parse(route.params.reservationData)
    : null;

  const {
    data: apartmentsData,
    isLoading: apartmentsLoading,
    error: apartmentsError,
  } = useApartments();

  const apartments = useMemo<ApartmentOption[]>(() => {
    if (!apartmentsData) return [];

    return apartmentsData.map((apt) => ({
      id: String(apt.apartmentId),
      name: apt.name,
      address: apt.address,
      imageUrl: apt.pictures && apt.pictures.length > 0 ? apt.pictures[0] : "",
    }));
  }, [apartmentsData]);

  const [selectedApartment, setSelectedApartment] =
    useState<ApartmentOption | null>(null);
  const [guestType, setGuestType] = useState<GuestType>("DOMESTIC");
  const [dailyStay, setDailyStay] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Guest form
  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors: errors1, isSubmitting: isSubmitting1 },
  } = useForm<GuestValidation.FormValues>({
    resolver: zodResolver(GuestValidation.schema),
    mode: "onBlur",
    defaultValues: {
      //guestType: "DOMESTIC",
      price: 0,
      gender: "Male",
      dateTimeOfArrival: null,
      dateTimeOfDeparture: null,
      //guestsCount: 1,
      //dailyStay: false,
    },
  });
  const isLocalWatcher = watch("isLocal");

  // Guest fields
  const [guestId, setGuestId] = useState<number | null>(null);

  // Additional fields

  const [guestsCount, setGuestsCount] = useState(1);
  const [documentUri, setDocumentUri] = useState<string | null>(null);

  const [dateDialogVisible, setDateDialogVisible] = useState(false);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);

  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [submitPressed, setSubmitPressed] = useState(false);

  const selectedApartmentIdNum = Number(selectedApartment?.id ?? 0);
  const createReservationMutation = useCreateReservation(
    selectedApartmentIdNum,
  );
  const updateReservationMutation = useUpdateReservation(
    reservationId,
    selectedApartmentIdNum,
  );

  useEffect(() => {
    if (!isEditMode) {
      setIsInitializing(false);
      return;
    }

    const initializeForm = async () => {
      if (!isEditMode || !existingReservation) return;

      const guest: LegacyReservationGuest = existingReservation.guest;

	  console.log("GUEST: ", guest);

      // 1 Apartment
      const aptOption = apartments.find(
        (apt) => apt.id === String(existingReservation.apartment.apartmentId),
      );
      if (aptOption) setSelectedApartment(aptOption);

      // 2 Reservation-level state (still useState)
      setDailyStay(existingReservation.reservationType === "Dnevni boravak");
      setGuestsCount(existingReservation.guestQuantity || 1);
      setDocumentUri(guest.personalDocumentURL || null);
      setGuestId(guest.id);
      setGuestType(guest.isLocal ? "DOMESTIC" : "FOREIGN");

      // 3 RHF form values
      reset({
        isLocal: guest.isLocal,
        name: guest.name ?? "",
        surname: guest.surname ?? "",
        gender: guest.gender ?? "Male",
        phoneNumber: guest.phoneNumber ?? "",
        birthDate: guest.birthDate ? dateService.parseBackendDate(guest.birthDate) : dateService.getCurrentDate(),
        birthPlace: guest.birthPlace ?? "",
        birthCountry: guest.birthCountry ?? "",
        address: guest.address ?? "",
        dateTimeOfArrival: guest.dateTimeOfArrival
          ? dateService.parseBackendDate(guest.dateTimeOfArrival)
          : dateService.getCurrentDate(),
        dateTimeOfDeparture: guest.dateTimeOfDeparture
          ? dateService.parseBackendDate(guest.dateTimeOfDeparture)
          : dateService.getCurrentDate(),
        accommodationUnitNumber: guest.accommodationUnitNumber ?? 1,
        accommodationUnitFloor: guest.accommodationUnitFloor ?? 1,
        issuedInvoiceNumber: guest.issuedInvoiceNumber ?? "",

        price: existingReservation.price ?? 0,

        // Domestic
        jmbg: guest.citizenId ?? "",
        birthMunicipality: guest.isLocal
          ? ((guest as DomesticGuest).birthMunicipality ?? "")
          : undefined,

        // Foreign
        citizenship: !guest.isLocal
          ? ((guest as ForeignGuest).citizenship ?? "")
          : undefined,
        passportNumber: !guest.isLocal
          ? ((guest as ForeignGuest).passportNumber ?? "")
          : undefined,
        passportIssuedDate:
          !guest.isLocal && (guest as ForeignGuest).passportIssuedDate
            ? dateService.parseBackendDate((guest as ForeignGuest).passportIssuedDate)
            : dateService.getCurrentDate(),
        entryDate:
          !guest.isLocal && (guest as ForeignGuest).entryDate
            ? dateService.parseBackendDate((guest as ForeignGuest).entryDate)
            : dateService.getCurrentDate(),
        entryPlace: !guest.isLocal
          ? ((guest as ForeignGuest).entryPlace ?? "")
          : undefined,
        visaType: !guest.isLocal
          ? ((guest as ForeignGuest).visaType ?? "")
          : undefined,
        visaNumber: !guest.isLocal
          ? ((guest as ForeignGuest).visaNumber ?? "")
          : undefined,
        permittedResidenceDate:
          !guest.isLocal && (guest as ForeignGuest).permittedResidenceDate
            ? dateService.parseBackendDate((guest as ForeignGuest).permittedResidenceDate)
            : dateService.getCurrentDate(),
      });

      setIsInitializing(false);
    };

    initializeForm();
  }, [isEditMode, reset]);

  // podesavanje default-nog apartmana u create mode
  useEffect(() => {
    if (!isEditMode && apartments.length > 0 && !selectedApartment) {
      setSelectedApartment(apartments[0]);
    }
  }, [isEditMode, apartments, selectedApartment]);

  // podesavanje header naslova u zavisnosti od mode-a
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode
        ? t("reservations.navigationTitle.editTitle")
        : t("reservations.navigationTitle.addTitle"),
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e: any) => {
        const h = e?.endCoordinates?.height ?? 0;
        setKeyboardOffset(-h * 0.7);
      },
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOffset(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isScreenLoading = apartmentsLoading;
  const isFormHydrating = isEditMode && isInitializing;

  const openDateDialog = (field: ActiveDateField) => {
    if (field === "DEPARTURE" && dailyStay) return;
    setActiveDateField((prev) => prev = field);
    setDateDialogVisible(true);
  };

  const closeDateDialog = () => {
    setDateDialogVisible(false);
    setActiveDateField(null);
  };

  const confirmDateDialog = (value: Date) => {
    console.log("RESERVATION DATE DIALOG VALUE: ", value);

    switch (activeDateField) {
      case "ARRIVAL":
        setValue("dateTimeOfArrival", value);
        break;
      case "DEPARTURE":
        setValue("dateTimeOfDeparture", value);
        break;
      case "BIRTH_DATE":
        setValue("birthDate", value);
        break;
      case "PASSPORT_ISSUED":
        setValue("passportIssuedDate", value);
        break;
      case "ENTRY_DATE":
        setValue("entryDate", value);
        break;
      case "PERMITTED_RESIDENCE":
        setValue("permittedResidenceDate", value);
        break;
    }
    closeDateDialog();
  };

  const handleDailyStayToggle = (value: boolean) => {
    setDailyStay(value);
    if (value) setValue("dateTimeOfDeparture", null);
  };

  const openImagePicker = () => {
    Alert.alert(
      t("reservations.alerts.pickDocument.title"),
      t("reservations.alerts.pickDocument.message"),
      [
        {
          text: t("reservations.alerts.pickDocument.camera"),
          onPress: openCamera,
        },
        {
          text: t("reservations.alerts.pickDocument.gallery"),
          onPress: pickFromGallery,
        },
        {
          text: t("reservations.alerts.pickDocument.cancel"),
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("reservations.alerts.permissionDenied.title"),
        t("reservations.alerts.permissionDenied.camera"),
      );
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      quality: 0.8,
      allowsEditing: true,
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (uri) setDocumentUri(uri);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("reservations.alerts.permissionDenied.title"),
        t("reservations.alerts.permissionDenied.gallery"),
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      allowsMultipleSelection: false,
    });

    if (res.canceled) return;
    const uri = res.assets?.[0]?.uri;
    if (uri) setDocumentUri(uri);
  };

  const resetForm = () => {
    reset();
  };

  const formatLocalDate = (date: Date | null): string | null =>
    date ? dayjs(date).format("YYYY-MM-DD") : null;

  function isForeignGuest(
    data: GuestValidation.FormValues,
  ): data is Extract<GuestValidation.FormValues, { isLocal: false }> {
    return data.isLocal === false;
  }

  const buildGuestPayload = (data: GuestValidation.FormValues): LegacyReservationGuest => {
    const common = {
      id: guestId,
      name: data.name.trim(),
      surname: data.surname.trim(),
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      birthDate: data.birthDate,
      birthPlace: data.birthPlace,
      address: data.address,
      accommodationUnitNumber: data.accommodationUnitNumber,
      accommodationUnitFloor: data.accommodationUnitFloor,
      dateTimeOfArrival: data.dateTimeOfArrival,
      dateTimeOfDeparture: dailyStay ? null : data.dateTimeOfDeparture,
      personalDocumentURL: documentUri,
    };

    if (data.isLocal) {
      return {
        ...common,
        isLocal: true,
        citizenId: data.jmbg,
        birthMunicipality: data.birthMunicipality,
        birthCountry: data.birthCountry,
      };
    } else if (isForeignGuest(data)) {
      return {
        ...common,
        isLocal: false,
        citizenId: data.passportNumber,
        citizenship: data.citizenship,
        passportNumber: data.passportNumber,
        passportIssuedDate: data.passportIssuedDate,
        entryDate: data.entryDate,
        entryPlace: data.entryPlace,
        visaType: data.visaType,
        visaNumber: data.visaNumber,
        permittedResidenceDate: data.permittedResidenceDate,
        birthCountry: data.birthCountry,
      };
    }
  };

  const buildReservationPayload = (
    data: GuestValidation.FormValues,
  ): CreateReservationPayload => {
    return {
      guest: buildGuestPayload(data),
      guestQuantity: guestsCount,
      price: data.price ? data.price : null,
      note: data.remarks || null,
      reservationType: dailyStay ? "Dnevni boravak" : "Nocenje",
    };
  };

  const buildUpdatePayload = (
    data: GuestValidation.FormValues,
  ): UpdateReservationPayload => {
    return {
      apartmentId: selectedApartmentIdNum,
      guest: buildGuestPayload(data),
      guestQuantity: guestsCount,
      price: data.price ? data.price : null,
      note: data.remarks || null,
      reservationType: dailyStay ? "Dnevni boravak" : "Nocenje",
    };
  };

  const onSubmit = (data: GuestValidation.FormValues) => {
    if (!selectedApartment || !selectedApartment.id) {
      Alert.alert(
        t("reservations.alerts.selectApartment.title"),
        t("reservations.alerts.selectApartment.message"),
      );
      return;
    }

    if (isEditMode) {
      //console.log(`FORM DATA: ${JSON.stringify(data)}`);

      const payload = buildUpdatePayload(data);
    //   console.log("=== UPDATE PAYLOAD ===");
    //   console.log(JSON.stringify(payload, null, 2));

      updateReservationMutation.mutate(
        {
          payload,
          documentPicture:
            documentUri && !documentUri.startsWith("http")
              ? {
                  uri: documentUri,
                  type: "image/jpeg",
                  name: `document_${Date.now()}.jpg`,
                }
              : undefined,
        },
        {
          onSuccess: (data) => {
            //console.log("=== UPDATE SUCCESS ===", data);
            resetForm();
            navigation.goBack();
          },
          onError: (error: any) => {
            // console.log("=== UPDATE ERROR ===");
            // console.log("Error message:", error.message);
            // console.log("Error response:", error.response?.data);
            // console.log("Error status:", error.response?.status);
          },
        },
      );
    } else {
      const payload = buildReservationPayload(data);
      //console.log("=== CREATE PAYLOAD ===");
      //console.log(JSON.stringify(payload, null, 2));

      createReservationMutation.mutate({
      	payload,
      	documentPicture:
      		documentUri && !documentUri.startsWith("http")
      			? {
      				uri: documentUri,
      				type: "image/jpeg",
      				name: `document_${Date.now()}.jpg`,
      			}
      			: undefined,
      },
      {
      	onSuccess: (data) => {
      		//console.log("=== CREATE SUCCESS ===", data);
      		resetForm();
      		navigation.goBack();
      	},
      	onError: (error: any) => {
      		// console.log("=== CREATE ERROR ===");
      		// console.log("Error message:", error.message);
      		// console.log("Error response:", error.response?.data);
      		// console.log("Error status:", error.response?.status);
			
      	},
      });
    }
  };

  const documentRow = (
    <View>
      <View style={styles.inlineRow}>
        <Label text={t("reservations.form.fields.document")} size="lg" />
        <Pressable style={styles.cameraBtn} onPress={openImagePicker}>
          <Icon name="Camera" size={24} color={Colors.textLight} />
        </Pressable>
      </View>

      {documentUri && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: Colors.background,
            padding: 8,
            borderRadius: 16,
            position: "relative",
            alignSelf: "flex-start",
          }}
        >
          <Pressable onPress={() => setPreviewVisible(true)}>
            <Image
              source={{ uri: documentUri }}
              style={{ width: 80, height: 80, borderRadius: 12 }}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              setDocumentUri(null);
              setPreviewVisible(false);
            }}
            hitSlop={10}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: Colors.background,
              borderWidth: 1,
              borderColor: Colors.borderColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="X" size={14} color={Colors.textPrimary} />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (isScreenLoading) {
    return (
      <View style={styles.screen}>
        {isFormHydrating && (
          <View>
            <Spinner size="large" />
            <Text>{t("reservations.load.preparingForm")}</Text>
          </View>
        )}

        {/* Rest of UI always renders */}
      </View>
    );
  }

  // if (apartmentsLoading) {
  // 	return (
  // 		<View
  // 			style={[
  // 				styles.screen,
  // 				{ justifyContent: "center", alignItems: "center" },
  // 			]}
  // 		>
  // 			<ActivityIndicator size="large" color={Colors.primary} />
  // 			<Text style={{ marginTop: 16, color: Colors.textLight }}>
  // 				{t("reservations.load.message")}
  // 			</Text>
  // 		</View>
  // 	);
  // }

  // if (apartmentsError || apartments.length === 0) {
  // 	return (
  // 		<View
  // 			style={[
  // 				styles.screen,
  // 				{ justifyContent: "center", alignItems: "center", padding: 20 },
  // 			]}
  // 		>
  // 			<Icon name="AlertCircle" size={48} color={Colors.primary} />
  // 			<Text
  // 				style={{
  // 					marginTop: 16,
  // 					color: Colors.textPrimary,
  // 					fontSize: 16,
  // 					textAlign: "center",
  // 				}}
  // 			>
  // 				{apartmentsError
  // 					? t("reservations.alerts.noApartments.title")
  // 					: t("reservations.alerts.noApartments.message")}
  // 			</Text>
  // 		</View>
  // 	);
  // }

  if (!selectedApartment) {
    return null;
  }

  const getDateDialogInitialValue = () => {
    switch (activeDateField) {
      case "ARRIVAL":
        return watch("dateTimeOfArrival");
      case "DEPARTURE":
        return watch("dateTimeOfDeparture");
      case "BIRTH_DATE":
        return watch("birthDate");
      case "PASSPORT_ISSUED":
        return watch("passportIssuedDate");
      case "ENTRY_DATE":
        return watch("entryDate");
      case "PERMITTED_RESIDENCE":
        return watch("permittedResidenceDate");
      default:
        return null;
    }
  };

  const isSubmitting =
    createReservationMutation.isPending || updateReservationMutation.isPending;

  const renderFormField = (
    label: string,
    name: Path<GuestValidation.FormValues>,
	required: boolean,
    placeholder: string,
    helperText: string,
    type: "text" | "password",
    iconName: LucideIconName,
    rightElement?: React.ReactNode,
    disabled?: boolean,
    formatValue?: (value: any) => string,
    inputProps?: any,
  ) => {
    return (
      <FormField
        control={control}
        name={name}
        label={label}
		required={required}
        placeholder={t(placeholder)}
        helperText={helperText}
        type={type}
        iconName={iconName}
        isInvalid={false}
        rightElement={rightElement}
        size="xl"
        labelSize="lg"
        disabled={disabled}
        formatValue={formatValue}
        inputProps={inputProps}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, transform: [{ translateY: keyboardOffset }] }}>
        <AddReservationTemplate
          apartmentCard={
            <ApartmentSelectDropdown
              value={selectedApartment}
              options={apartments}
              onChange={setSelectedApartment}
            />
          }
          dailyStayToggleRow={
            <View style={styles.toggleRow}>
              <Label text={t("reservations.form.dailyStay")} size="lg" />
              <ToggleItem
                title=""
                initialValue={dailyStay}
                onValueChange={handleDailyStayToggle}
              />
            </View>
          }
          arrivalField={renderFormField(
            t("reservations.form.arrivalDateTime"),
            "dateTimeOfArrival",
			true,
            undefined,
            undefined,
            "text",
            undefined,
            <IconButton
              iconName="CalendarPlus"
              onPress={() => openDateDialog("ARRIVAL")}
              color="gray"
            />,
            false,
            formatDateTimeLabel,
          )}
          departureField={renderFormField(
            t("reservations.form.departureDateTime"),
            "dateTimeOfDeparture",
			true,
            undefined,
            undefined,
            "text",
            undefined,
            <IconButton
              iconName="CalendarPlus"
              onPress={() => openDateDialog("DEPARTURE")}
              color="gray"
            />,
            dailyStay,
            formatDateTimeLabel,
          )}
          guestTypeRow={
            <View style={styles.radioRow}>
              <CustomRadioGroup
                control={control}
                name={"isLocal"}
                options={[
                  {
                    label: t("reservations.form.guestType.domestic"),
                    value: true,
                    disabled: isEditMode,
                  },
                  {
                    label: t("reservations.form.guestType.foreign"),
                    value: false,
                    disabled: isEditMode,
                  },
                ]}
              />
            </View>
          }
          guestNameField={renderFormField(
            t("reservations.form.fields.firstName"),
            "name",
			true,
            "Marko",
            undefined,
            "text",
            "User",
          )}
          guestSurnameField={renderFormField(
            t("reservations.form.fields.lastName"),
            "surname",
			true,
            "Marković",
            undefined,
            "text",
            "User",
          )}
          genderField={
            <View style={styles.radioRow}>
              <CustomRadioGroup
                control={control}
                label={t("reservations.form.gender.label")}
                name={"gender"}
                options={[
                  {
                    label: t("reservations.form.gender.male"),
                    value: "Male",
                  },
                  {
                    label: t("reservations.form.gender.female"),
                    value: "Female",
                  },
                ]}
              />
            </View>
          }
          phoneField={renderFormField(
            t("reservations.form.fields.phone"),
            "phoneNumber",
			true,
            "065/123-456",
            undefined,
            "text",
            "Phone",
          )}
          birthDateField={renderFormField(
            t("reservations.form.fields.birthDate"),
            "birthDate",
			true,
            undefined,
            undefined,
            "text",
            undefined,
            <IconButton
              iconName="CalendarPlus"
              onPress={() => openDateDialog("BIRTH_DATE")}
              color="gray"
            />,
            undefined,
            formatDateLabel,
          )}
          birthPlaceField={renderFormField(
            t("reservations.form.fields.birthPlace"),
            "birthPlace",
			true,
            "Banja Luka",
            undefined,
            "text",
            "MapPinned",
          )}
          birthCountryField={renderFormField(
            t("reservations.form.fields.birthCountry"),
            "birthCountry",
			true,
            "BiH",
            undefined,
            "text",
            "MapPinned",
          )}
          domesticFields={
            isLocalWatcher
              ? {
                  birthMunicipalityField: renderFormField(
                    t("reservations.form.fields.birthMunicipality"),
                    "birthMunicipality",
					true,
                    "Banja Luka",
                    undefined,
                    "text",
                    "MapPin",
                  ),
                  citizenIdField: renderFormField(
                    t("reservations.form.fields.citizenId"),
                    "jmbg",
					true,
                    "1234567891234",
                    undefined,
                    "text",
                    "Key",
                    undefined,
                    undefined,
                    undefined,
                    { keyboardType: "numeric" },
                  ),
                }
              : undefined
          }
          foreignFields={
            !isLocalWatcher
              ? {
                  citizenshipField: renderFormField(
                    t("reservations.form.fields.citizenship"),
                    "citizenship",
					true,
                    "Srbija",
                    undefined,
                    "text",
                    "Flag",
                  ),
                  passportNumberField: renderFormField(
                    t("reservations.form.fields.passportNumber"),
                    "passportNumber",
					true,
                    "W0000208",
                    undefined,
                    "text",
                    "IdCard",
                  ),
                  passportIssuedDateField: renderFormField(
                    t("reservations.form.fields.passportIssuedDate"),
                    "passportIssuedDate",
					true,
                    undefined,
                    undefined,
                    "text",
                    undefined,
                    <IconButton
                      iconName="CalendarPlus"
                      onPress={() => openDateDialog("PASSPORT_ISSUED")}
                      color="gray"
                    />,
                    undefined,
                    formatDateLabel,
                  ),
                  entryDateField: renderFormField(
                    t("reservations.form.fields.entryDate"),
                    "entryDate",
					true,
                    undefined,
                    undefined,
                    "text",
                    undefined,
                    <IconButton
                      iconName="CalendarPlus"
                      onPress={() => openDateDialog("ENTRY_DATE")}
                      color="gray"
                    />,
                    undefined,
                    formatDateLabel,
                  ),
                  entryPlaceField: renderFormField(
                    t("reservations.form.fields.entryPlace"),
                    "entryPlace",
					true,
                    "BiH",
                    undefined,
                    "text",
                    "MapPinned",
                  ),
                  visaTypeField: renderFormField(
                    t("reservations.form.fields.visaType"),
                    "visaType",
					true,
                    "Type C",
                    undefined,
                    "text",
                    "Stamp",
                  ),
                  visaNumberField: renderFormField(
                    t("reservations.form.fields.visaNumber"),
                    "visaNumber",
					true,
                    "D12345678",
                    undefined,
                    "text",
                    "Hash",
                  ),
                  permittedResidenceDateField: renderFormField(
                    t("reservations.form.fields.permittedResidenceUntil"),
                    "permittedResidenceDate",
					true,
                    undefined,
                    undefined,
                    "text",
                    undefined,
                    <IconButton
                      iconName="CalendarPlus"
                      onPress={() => openDateDialog("PERMITTED_RESIDENCE")}
                      color="gray"
                    />,
                    undefined,
                    formatDateLabel,
                  ),
                }
              : undefined
          }
          addressField={renderFormField(
            t("reservations.form.fields.address"),
            "address",
			true,
            "Ulica 123",
            undefined,
            "text",
            "House",
          )}
          accommodationUnitNumberField={renderFormField(
            t("reservations.form.fields.unitNumber"),
            "accommodationUnitNumber",
			true,
            "13",
            undefined,
            "text",
            "Hash",
			undefined,
			undefined,
			undefined,
			{ keyboardType: "numeric" },
          )}
          accommodationUnitFloorField={renderFormField(
            t("reservations.form.fields.unitFloor"),
            "accommodationUnitFloor",
			true,
            "4",
            undefined,
            "text",
            "Hash",
			undefined,
			undefined,
			undefined,
			{ keyboardType: "numeric" },
          )}
          guestsCounterRow={
            <View style={styles.inlineRow}>
              <Label
                text={t("reservations.form.fields.guestsCount")}
                size="lg"
              />
              <HStack space="md">
                <Pressable
                  onPress={() => setGuestsCount((p) => clampGuests(p - 1))}
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterSymbol}>–</Text>
                </Pressable>
                <View style={styles.counterMid}>
                  <Text style={styles.counterValue}>{guestsCount}</Text>
                </View>
                <Pressable
                  onPress={() => setGuestsCount((p) => clampGuests(p + 1))}
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterSymbol}>+</Text>
                </Pressable>
              </HStack>
            </View>
          }
          priceField={renderFormField(
            t("reservations.form.fields.price") + " (BAM)",
            "price",
			true,
            "50.00",
            undefined,
            "text",
            "DollarSign",
            undefined,
            false,
            undefined,
            { keyboardType: "numeric" },
          )}
          invoiceNumberField={renderFormField(
            t("reservations.form.fields.invoiceNumber"),
            "issuedInvoiceNumber",
			false,
            "65413211",
            undefined,
            "text",
            "Receipt",
          )}
          noteField={
            <View style={styles.noteWrap}>
              <Label text={t("reservations.form.fields.note")} size="lg" />
              <NoteBox
                value={getValues("remarks")}
                onChangeText={(value) => setValue("remarks", value)}
              />
            </View>
          }
          documentRow={documentRow}
          submitButton={
            <TouchableOpacity
              activeOpacity={0.85}
              onPressIn={() => setSubmitPressed(true)}
              onPressOut={() => setSubmitPressed(false)}
              onPress={handleSubmit(onSubmit, (e) => {
                console.log("ERROR: ", e);
				toastService.error(
					t("reservations.toastMessages.createErrorTitle"),
					t("reservations.toastMessages.createErrorMessage")
				);
              })}
              disabled={isSubmitting}
              style={[
                styles.submitBtn,
                submitPressed && styles.submitBtnPressed,
                isSubmitting && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting
                  ? t("reservations.form.buttons.saving")
                  : isEditMode
                    ? t("reservations.form.buttons.update")
                    : t("reservations.form.buttons.save")}
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      <DateTimePicker
        visible={dateDialogVisible}
        initialValue={getDateDialogInitialValue()}
        timePicker={
          activeDateField === "ARRIVAL" || activeDateField === "DEPARTURE"
        }
        onClose={closeDateDialog}
        onConfirm={confirmDateDialog}
      />

      {documentUri && (
        <Modal
          visible={previewVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => setPreviewVisible(false)}
          >
            <Image
              source={{ uri: documentUri }}
              style={{
                width: "90%",
                height: "80%",
                resizeMode: "contain",
                borderRadius: 12,
              }}
            />
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

export default AddReservationScreen;
