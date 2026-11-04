export function shouldEndSessionForResponse({ status, url, authorization, currentToken, alreadyHandling }: {
  status: number | undefined;
  url: string | undefined;
  authorization: unknown;
  currentToken: string | null;
  alreadyHandling: boolean;
}): boolean {
  return status === 401 &&
    !(url?.endsWith("/auth/login") ?? false) &&
    Boolean(currentToken) &&
    authorization === `Bearer ${currentToken}` &&
    !alreadyHandling;
}

// A completed request may outlive its screen or authenticated account.
export async function persistCurrentSessionDownload<TContent, TFile extends { uri: string }>(
  download: () => Promise<TContent>,
  scope: { isCurrent: () => boolean; persist: (content: TContent) => TFile; release: (uri: string) => void },
): Promise<TFile | null> {
  const content = await download();
  if (!scope.isCurrent()) return null;
  const file = scope.persist(content);
  if (!scope.isCurrent()) {
    scope.release(file.uri);
    return null;
  }
  return file;
}
