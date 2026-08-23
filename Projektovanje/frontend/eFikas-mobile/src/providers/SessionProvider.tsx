import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthenticationResponse,
  LoginRequest,
  USER_ROLES,
  UserRole,
} from "@/src/types/types";
import { authService } from "@/src/api/services/authService";
import {
  resetUnauthorizedHandling,
  setUnauthorizedHandler,
} from "@/src/api/axiosInstance";
import { secureStoreService } from "@/src/services/secureStoreService";
import { sessionStore } from "@/src/session/sessionStore";
import { SECURE_STORE_KEYS } from "@/src/util/secureStoreKeys";
import { notificationsApiService } from "@/src/api/services/notificationsApiService";
import { pushNotificationPreference } from "@/src/notifications/pushNotificationPreference";

export type SessionStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export type SignOutResult = {
  pushCleanupFailed: boolean;
};

type SessionContextValue = {
  status: SessionStatus;
  session: AuthenticationResponse | null;
  signIn: (credentials: LoginRequest) => Promise<AuthenticationResponse>;
  signOut: () => Promise<SignOutResult>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && USER_ROLES.includes(value as UserRole);

const isStoredSession = (value: unknown): value is AuthenticationResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthenticationResponse>;
  return (
    typeof session.email === "string" &&
    session.email.trim().length > 0 &&
    typeof session.token === "string" &&
    session.token.trim().length > 0 &&
    isUserRole(session.role)
  );
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("bootstrapping");
  const [session, setSession] = useState<AuthenticationResponse | null>(null);

  const clearLocalSession = useCallback(async () => {
    sessionStore.clearSession();
    queryClient.clear();
    setSession(null);
    setStatus("unauthenticated");

    try {
      await secureStoreService.deleteItemAsync(SECURE_STORE_KEYS.session);
    } catch {
      // The in-memory session and user data are still cleared when secure storage is unavailable.
    }
  }, [queryClient]);

  const signOut = useCallback(async (): Promise<SignOutResult> => {
    const activeSession = sessionStore.getSession();
    let pushCleanupFailed = false;

    if (activeSession) {
      let localToken: string | null = null;
      try {
        localToken = (await pushNotificationPreference.get(activeSession.email))?.token ?? null;
      } catch {
        // A token that cannot be read is not known locally and must not be regenerated during logout.
      }

      if (localToken && sessionStore.getSession()?.token === activeSession.token) {
        try {
          await notificationsApiService.unregisterPushToken({ token: localToken });
        } catch {
          pushCleanupFailed = true;
        }
      }

      try {
        await pushNotificationPreference.clear(activeSession.email);
      } catch {
        // Secure storage cleanup cannot keep a user signed in.
      }
    }

    await clearLocalSession();
    return { pushCleanupFailed };
  }, [clearLocalSession]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      let storedSession: AuthenticationResponse | null = null;

      try {
        const rawSession = await secureStoreService.getItemAsync(SECURE_STORE_KEYS.session);
        if (rawSession) {
          const parsedSession: unknown = JSON.parse(rawSession);
          if (isStoredSession(parsedSession)) {
            storedSession = parsedSession;
          } else {
            await secureStoreService.deleteItemAsync(SECURE_STORE_KEYS.session);
          }
        }
      } catch {
        try {
          await secureStoreService.deleteItemAsync(SECURE_STORE_KEYS.session);
        } catch {
          // The safe fallback is an unauthenticated in-memory state.
        }
      }

      if (!isMounted) {
        return;
      }

      if (storedSession) {
        sessionStore.setSession(storedSession);
        resetUnauthorizedHandling();
        setSession(storedSession);
        setStatus("authenticated");
        return;
      }

      sessionStore.clearSession();
      setSession(null);
      setStatus("unauthenticated");
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearLocalSession);
    return () => setUnauthorizedHandler(undefined);
  }, [clearLocalSession]);

  const signIn = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    const authenticatedSession = response.data;

    if (!isStoredSession(authenticatedSession)) {
      throw new Error("Invalid login response.");
    }

    await secureStoreService.setItemAsync(
      SECURE_STORE_KEYS.session,
      JSON.stringify(authenticatedSession)
    );

    sessionStore.setSession(authenticatedSession);
    resetUnauthorizedHandling();
    setSession(authenticatedSession);
    setStatus("authenticated");
    return authenticatedSession;
  }, []);

  const value = useMemo(
    () => ({ status, session, signIn, signOut }),
    [session, signIn, signOut, status]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider.");
  }

  return context;
};
