import { Redirect } from "expo-router";
import { ManagerFallbackScreen } from "@/src/components/screens/RoleLandingScreen/RoleLandingScreen";
import { useSession } from "@/src/providers/SessionProvider";

export default function ManagerHome() {
  const { status, session } = useSession();
  if (status !== "authenticated" || session?.role !== "MANAGER") {
    return status === "unauthenticated" ? <Redirect href="/(auth)" /> : null;
  }
  return <ManagerFallbackScreen />;
}
