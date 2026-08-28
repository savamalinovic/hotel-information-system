import { useExpenseCategories, useCreateExpense } from "@/src/hooks/useExpenses";
import { useTheme } from "@/src/providers/ThemeProvider";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowButton, WorkflowCard, WorkflowState } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { DateField } from "@/src/components/molecules/DateField/DateField";
import { formatDate, formatMoney, isExpenseDateValid, isPositiveMoney, normalizeMoneyInput } from "./expenseWorkflowHelpers";

export default function ExpenseCreateScreen() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const categories = useExpenseCategories();
  const create = useCreateExpense();
  const [categoryId, setCategoryId] = useState<number>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [validationError, setValidationError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selectedCategory = useMemo(
    () => categories.data?.content.find((category) => category.expenseCategoryId === categoryId),
    [categories.data, categoryId]
  );

  const prepareConfirmation = () => {
    const cleanedName = name.trim();
    const cleanedDescription = description.trim();
    const cleanedAmount = normalizeMoneyInput(amount);
    const cleanedDate = expenseDate.trim();
    if (!categoryId) {
      setValidationError(t("expenseWorkflow.validation.category"));
    } else if (!cleanedName || cleanedName.length > 120) {
      setValidationError(t("expenseWorkflow.validation.name"));
    } else if (cleanedDescription.length > 1000) {
      setValidationError(t("expenseWorkflow.validation.description"));
    } else if (!isPositiveMoney(cleanedAmount)) {
      setValidationError(t("expenseWorkflow.validation.amount"));
    } else if (!isExpenseDateValid(cleanedDate)) {
      setValidationError(t("expenseWorkflow.validation.date"));
    } else {
      setValidationError("");
      setRequestError("");
      setConfirming(true);
    }
  };

  const submit = () => {
    if (!categoryId) {
      return;
    }
    create.mutate({
      categoryId,
      name: name.trim(),
      description: description.trim() || null,
      amount: normalizeMoneyInput(amount),
      expenseDate: expenseDate.trim(),
    }, {
      onSuccess: (expense) => {
        setConfirming(false);
        router.replace({ pathname: "/(home)/expenses/[id]", params: { id: String(expense.operationalExpenseId) } });
      },
      onError: (error) => setRequestError(getUserFacingErrorMessage(error, t("expenseWorkflow.create.submitError"))),
    });
  };

  if (categories.isPending) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="LoaderCircle" title={t("expenseWorkflow.common.loading")} description={t("expenseWorkflow.create.loadingCategories")} /></SafeAreaView>;
  }
  if (categories.isError) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="CircleAlert" title={t("expenseWorkflow.common.errorTitle")} description={t("expenseWorkflow.create.categoriesError")} actionLabel={t("expenseWorkflow.common.retry")} onAction={() => void categories.refetch()} /></SafeAreaView>;
  }

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("expenseWorkflow.create.title")}</Text>
    <Text style={{ color: Colors.textSecondary }}>{t("expenseWorkflow.create.hint")}</Text>
    <WorkflowCard>
      <Text style={[styles.label, { color: Colors.textPrimary }]}>{t("expenseWorkflow.create.category")}</Text>
      {categories.data?.content.length ? <View style={styles.categoryList}>{categories.data.content.map((category) => <Pressable key={category.expenseCategoryId} accessibilityRole="radio" accessibilityLabel={category.name} accessibilityState={{ selected: categoryId === category.expenseCategoryId }} onPress={() => setCategoryId(category.expenseCategoryId)} style={[styles.category, { borderColor: categoryId === category.expenseCategoryId ? Colors.primary : Colors.divider, backgroundColor: categoryId === category.expenseCategoryId ? `${Colors.primary}16` : Colors.background }]}><Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{category.name}</Text>{category.description ? <Text style={{ color: Colors.textSecondary }}>{category.description}</Text> : null}</Pressable>)}</View> : <Text style={{ color: Colors.textSecondary }}>{t("expenseWorkflow.create.noCategories")}</Text>}
      <Field label={t("expenseWorkflow.create.name")} value={name} onChangeText={setName} maxLength={120} placeholder={t("expenseWorkflow.create.namePlaceholder")} />
      <Field label={t("expenseWorkflow.create.description")} value={description} onChangeText={setDescription} maxLength={1000} multiline placeholder={t("expenseWorkflow.create.descriptionPlaceholder")} />
      <Field label={t("expenseWorkflow.create.amount")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <DateField label={t("expenseWorkflow.create.date")} value={expenseDate} onChange={setExpenseDate} required maximumDate={new Date()} />
      {validationError ? <Text style={{ color: Colors.error }}>{validationError}</Text> : null}
      {requestError ? <Text style={{ color: Colors.error }}>{requestError}</Text> : null}
      <WorkflowButton label={t("expenseWorkflow.create.review")} onPress={prepareConfirmation} icon="ChevronRight" disabled={!categories.data?.content.length} />
    </WorkflowCard>
    <ExpenseConfirmation visible={confirming} submitting={create.isPending} category={selectedCategory?.name} name={name.trim()} amount={normalizeMoneyInput(amount)} expenseDate={expenseDate.trim()} locale={i18n.language} error={requestError} onClose={() => !create.isPending && setConfirming(false)} onSubmit={submit} />
  </ScrollView></SafeAreaView>;
}

function Field({ label, value, onChangeText, maxLength, placeholder, multiline = false, keyboardType, autoCapitalize }: { label: string; value: string; onChangeText: (value: string) => void; maxLength?: number; placeholder: string; multiline?: boolean; keyboardType?: "default" | "decimal-pad"; autoCapitalize?: "none" }) {
  const { Colors } = useTheme();
  return <View style={styles.field}><Text style={[styles.label, { color: Colors.textPrimary }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} maxLength={maxLength} multiline={multiline} keyboardType={keyboardType} autoCapitalize={autoCapitalize} placeholder={placeholder} placeholderTextColor={Colors.textSecondary} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.multiline, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]} /></View>;
}

function ExpenseConfirmation({ visible, submitting, category, name, amount, expenseDate, locale, error, onClose, onSubmit }: { visible: boolean; submitting: boolean; category?: string; name: string; amount: string; expenseDate: string; locale: string; error: string; onClose: () => void; onSubmit: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><View style={[styles.modal, { backgroundColor: Colors.background }]}><Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{t("expenseWorkflow.create.confirmTitle")}</Text><Text style={{ color: Colors.textSecondary }}>{t("expenseWorkflow.create.confirmHint")}</Text><Text style={{ color: Colors.textPrimary }}>{category ?? "—"}</Text><Text style={{ color: Colors.textPrimary, fontWeight: "800" }}>{name}</Text><Text style={{ color: Colors.textPrimary }}>{formatMoney(amount, t("expenseWorkflow.common.currency"))}</Text><Text style={{ color: Colors.textSecondary }}>{formatDate(expenseDate, locale)}</Text>{error ? <Text style={{ color: Colors.error }}>{error}</Text> : null}<View style={styles.actions}><View style={styles.flex}><WorkflowButton label={t("expenseWorkflow.common.cancel")} onPress={onClose} variant="secondary" disabled={submitting} /></View><View style={styles.flex}><WorkflowButton label={t("expenseWorkflow.create.submit")} onPress={onSubmit} loading={submitting} /></View></View></View></View></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 }, content: { gap: 12, paddingBottom: 32 }, title: { fontSize: 24, fontWeight: "800" }, label: { fontSize: 14, fontWeight: "800" }, categoryList: { gap: 8 }, category: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 3 }, field: { gap: 6 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 }, multiline: { minHeight: 104, paddingTop: 10 }, overlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.45)" }, modal: { padding: 18, borderRadius: 16, gap: 11 }, modalTitle: { fontSize: 20, fontWeight: "800" }, actions: { flexDirection: "row", gap: 10 }, flex: { flex: 1 },
});
