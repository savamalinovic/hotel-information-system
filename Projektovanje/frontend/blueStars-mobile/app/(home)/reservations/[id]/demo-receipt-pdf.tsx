import DemoReceiptPdfScreen from "@/src/components/screens/DemoReceiptScreen/DemoReceiptPdfScreen";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function DemoReceiptPdfRoute() {
  const { t } = useTranslation();
  return <><Stack.Screen options={{ title: t("demoReceipt.pdf.title") }} /><DemoReceiptPdfScreen /></>;
}
