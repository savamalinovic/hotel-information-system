import { AuthenticationResponse } from "@/src/types/types";

let currentSession: AuthenticationResponse | null = null;

export const sessionStore = {
  getSession: () => currentSession,
  getToken: () => currentSession?.token ?? null,
  setSession: (session: AuthenticationResponse) => {
    currentSession = session;
  },
  clearSession: () => {
    currentSession = null;
  },
};
