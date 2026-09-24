import DamageDetailScreen from "@/src/components/screens/DamageWorkflowScreen/DamageDetailScreen";
import { parsePositiveId } from "@/src/util/idParams";
import { useLocalSearchParams } from "expo-router";

export default function WorkerDamageDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return <DamageDetailScreen workerTaskId={parsePositiveId(id)} />;
}
