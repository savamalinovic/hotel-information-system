import DemoReceiptScreen from "@/src/components/screens/DemoReceiptScreen/DemoReceiptScreen";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function DemoReceiptRoute() {
  const { t } = useTranslation();
  return <><Stack.Screen options={{ title: t("demoReceipt.title") }} /><DemoReceiptScreen /></>;
}
