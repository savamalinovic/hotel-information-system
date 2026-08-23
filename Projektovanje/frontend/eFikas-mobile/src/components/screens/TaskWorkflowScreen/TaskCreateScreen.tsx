import { CreateTaskRequest } from "@/src/api/services/taskWorkflowService";
import { WorkflowButton, WorkflowCard, WorkflowChip, WorkflowState } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { useApartmentCatalogDetail } from "@/src/hooks/useApartmentCatalog";
import { useCreateTask, useSpecializations } from "@/src/hooks/useTaskWorkflows";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { TaskPriority } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { parsePositiveId } from "@/src/util/idParams";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const priorities: TaskPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default function TaskCreateScreen() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [specializationId, setSpecializationId] = useState<number>();
  const [apartmentIdText, setApartmentIdText] = useState("");
  const [reservationIdText, setReservationIdText] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("NORMAL");
  const [formError, setFormError] = useState("");
  const specializations = useSpecializations();
  const createTask = useCreateTask();
  const apartmentId = parsePositiveId(apartmentIdText) ?? undefined;
  const reservationId = parsePositiveId(reservationIdText) ?? undefined;
  const reservation = useReservationDetail(reservationId);
  const apartment = useApartmentCatalogDetail(apartmentId);
  const effectiveApartmentId = reservation.data?.apartmentId ?? apartmentId;
  const reservationApartmentMismatch = Boolean(reservation.data && apartmentId && reservation.data.apartmentId !== apartmentId);
  const selectedSpecialization = useMemo(() => specializations.data?.find((item) => item.id === specializationId), [specializationId, specializations.data]);

  const submit = () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!specializationId) {
      setFormError(t("taskWorkforce.agent.validation.specialization"));
      return;
    }
    if (!cleanTitle || cleanTitle.length > 120) {
      setFormError(t("taskWorkforce.agent.validation.title"));
      return;
    }
    if (!cleanDescription || cleanDescription.length > 1000) {
      setFormError(t("taskWorkforce.agent.validation.description"));
      return;
    }
    if (reservationApartmentMismatch) {
      setFormError(t("taskWorkforce.agent.validation.reservationApartment"));
      return;
    }
    if (selectedSpecialization?.code === "CLEANING" && !effectiveApartmentId) {
      setFormError(t("taskWorkforce.agent.validation.cleaningApartment"));
      return;
    }
    const request: CreateTaskRequest = {
      specializationId,
      title: cleanTitle,
      description: cleanDescription,
      priority,
      ...(effectiveApartmentId ? { apartmentId: effectiveApartmentId } : {}),
      ...(reservationId ? { reservationId } : {}),
    };
    setFormError("");
    createTask.mutate(request, {
      onSuccess: (task) => router.replace({ pathname: "/(home)/tasks/[id]", params: { id: String(task.taskId) } }),
      onError: (error) => setFormError(getUserFacingErrorMessage(error, t("taskWorkforce.agent.createError"))),
    });
  };

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.screen}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("taskWorkforce.agent.createTitle")}</Text>
    <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.createHint")}</Text>
    {formError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={formError} /> : null}
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.agent.specialization")}</Text>
      {specializations.isPending ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.common.loading")}</Text> : specializations.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.agent.specializationError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void specializations.refetch()} /> : <View style={styles.chips}>{specializations.data?.map((item) => <WorkflowChip key={item.id} label={t(`taskWorkforce.specialization.${item.code}`, { defaultValue: item.name })} selected={item.id === specializationId} onPress={() => setSpecializationId(item.id)} />)}</View>}
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.apartmentOptional")}</Text>
      <TextInput accessibilityLabel={t("taskWorkforce.agent.apartmentOptional")} value={apartmentIdText} onChangeText={setApartmentIdText} keyboardType="number-pad" placeholder={t("taskWorkforce.agent.apartmentIdPlaceholder")} placeholderTextColor={Colors.tertiary} style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} />
      {apartmentId && apartment.data ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.selectedApartment", { name: apartment.data.name, id: apartmentId })}</Text> : null}
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.reservationOptional")}</Text>
      <TextInput accessibilityLabel={t("taskWorkforce.agent.reservationOptional")} value={reservationIdText} onChangeText={setReservationIdText} keyboardType="number-pad" placeholder={t("taskWorkforce.agent.reservationIdPlaceholder")} placeholderTextColor={Colors.tertiary} style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} />
      {reservation.isFetching ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.lookupReservation")}</Text> : null}
      {reservation.data ? <Text style={{ color: reservationApartmentMismatch ? Colors.error : Colors.textSecondary }}>{t("taskWorkforce.agent.selectedReservation", { id: reservation.data.reservationId, apartment: reservation.data.apartmentName })}</Text> : null}
      {reservationApartmentMismatch ? <Text style={{ color: Colors.error }}>{t("taskWorkforce.agent.validation.reservationApartment")}</Text> : null}
      {reservation.data && !apartmentIdText ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.reservationApartmentAutofill", { id: reservation.data.apartmentId })}</Text> : null}
    </WorkflowCard>
    <WorkflowCard>
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.title")}</Text><TextInput accessibilityLabel={t("taskWorkforce.agent.title")} value={title} onChangeText={setTitle} maxLength={120} placeholder={t("taskWorkforce.agent.titlePlaceholder")} placeholderTextColor={Colors.tertiary} style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} /><Text style={{ color: Colors.textSecondary }}>{title.length}/120</Text>
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.description")}</Text><TextInput accessibilityLabel={t("taskWorkforce.agent.description")} value={description} onChangeText={setDescription} maxLength={1000} multiline textAlignVertical="top" placeholder={t("taskWorkforce.agent.descriptionPlaceholder")} placeholderTextColor={Colors.tertiary} style={[styles.input, styles.description, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} /><Text style={{ color: Colors.textSecondary }}>{description.length}/1000</Text>
      <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.priority")}</Text><View style={styles.chips}>{priorities.map((item) => <WorkflowChip key={item} label={t(`taskWorkforce.priority.${item}`)} selected={priority === item} onPress={() => setPriority(item)} />)}</View>
    </WorkflowCard>
    <WorkflowCard><Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.notificationHint")}</Text><WorkflowButton label={t("taskWorkforce.agent.submit")} onPress={submit} loading={createTask.isPending} icon="Plus" /></WorkflowCard>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12 }, title: { fontSize: 24, fontWeight: "800" }, sectionTitle: { fontSize: 16, fontWeight: "800" }, fieldLabel: { fontSize: 13, fontWeight: "800" }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 }, description: { minHeight: 108, paddingTop: 12 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 } });
