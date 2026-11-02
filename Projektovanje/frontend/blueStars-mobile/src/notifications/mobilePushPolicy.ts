export const isMobilePushRole = (role: unknown): boolean =>
  role === "AGENT" || role === "OPERATIONAL_WORKER";
