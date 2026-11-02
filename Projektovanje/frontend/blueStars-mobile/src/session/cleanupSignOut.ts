type ActiveSession = { email: string; token: string } | null;
type CleanupDependencies = {
  readToken: (email: string) => Promise<string | null>;
  unregister: (token: string) => Promise<void>;
  isCurrent: (token: string) => boolean;
  clearPreference: (email: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Cleanup timed out")), milliseconds);
    operation.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function cleanupSignOut(session: ActiveSession, deps: CleanupDependencies) {
  let pushCleanupFailed = false;
  try {
    if (session) {
      let token: string | null = null;
      try { token = await withTimeout(deps.readToken(session.email), 2000); } catch { pushCleanupFailed = true; }
      if (token && deps.isCurrent(session.token)) {
        try { await withTimeout(deps.unregister(token), 6000); } catch { pushCleanupFailed = true; }
      }
    }
  } finally {
    try {
      if (session) await withTimeout(deps.clearPreference(session.email), 2000);
    } catch { /* Local storage failures must not prevent sign-out. */ }
    finally { await deps.clearSession(); }
  }
  return { pushCleanupFailed };
}
