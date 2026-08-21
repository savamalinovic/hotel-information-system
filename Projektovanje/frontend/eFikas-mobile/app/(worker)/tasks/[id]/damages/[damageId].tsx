import DamageDetailScreen from "@/src/components/screens/DamageWorkflowScreen/DamageDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function WorkerDamageDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <DamageDetailScreen workerTaskId={Number(id)} />;
}
