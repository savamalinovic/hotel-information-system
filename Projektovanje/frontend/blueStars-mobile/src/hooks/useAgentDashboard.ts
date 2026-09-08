import { agentDashboardService, getLocalDateKey } from "@/src/api/services/agentDashboardService";
import { AgentDashboardData } from "@/src/types/types";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

export const useAgentDashboard = () => {
  const [today, setToday] = useState(getLocalDateKey);
  const hasBeenFocused = useRef(false);

  const query = useQuery<AgentDashboardData, Error>({
    queryKey: ["agent-dashboard", today],
    queryFn: () => agentDashboardService.getDashboard(today),
    staleTime: 30_000,
    retry: 1,
  });
  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      const currentDate = getLocalDateKey();
      const isNewDay = currentDate !== today;
      setToday(currentDate);

      if (hasBeenFocused.current && !isNewDay) {
        void refetch();
      }

      hasBeenFocused.current = true;
    }, [refetch, today])
  );

  return query;
};
