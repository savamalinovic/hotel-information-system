import { apiEndpointService } from "@/src/services/apiEndpointService";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ApiEndpointContextValue = {
  rootUrl: string;
  setRootUrl: (value: string) => Promise<string>;
  resetRootUrl: () => Promise<string>;
};

const ApiEndpointContext = createContext<ApiEndpointContextValue | undefined>(undefined);

export const ApiEndpointProvider = ({ children }: { children: ReactNode }) => {
  const [rootUrl, setRootUrlState] = useState(apiEndpointService.getRootUrl());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void apiEndpointService.load()
      .then((loadedRootUrl) => {
        if (!isMounted) {
          return;
        }

        setRootUrlState(loadedRootUrl);
        setIsReady(true);
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setRootUrl = useCallback(async (value: string) => {
    const updatedRootUrl = await apiEndpointService.setRootUrl(value);
    setRootUrlState(updatedRootUrl);
    return updatedRootUrl;
  }, []);

  const resetRootUrl = useCallback(async () => {
    const defaultRootUrl = await apiEndpointService.resetRootUrl();
    setRootUrlState(defaultRootUrl);
    return defaultRootUrl;
  }, []);

  const value = useMemo(
    () => ({ rootUrl, setRootUrl, resetRootUrl }),
    [resetRootUrl, rootUrl, setRootUrl]
  );

  if (!isReady) {
    return null;
  }

  return <ApiEndpointContext.Provider value={value}>{children}</ApiEndpointContext.Provider>;
};

export const useApiEndpoint = () => {
  const context = useContext(ApiEndpointContext);
  if (!context) {
    throw new Error("useApiEndpoint must be used within an ApiEndpointProvider.");
  }

  return context;
};
