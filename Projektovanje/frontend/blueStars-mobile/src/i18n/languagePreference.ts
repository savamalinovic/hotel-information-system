export type AppLanguage = "sr" | "en";

type LanguagePreferenceDependencies = {
  read: () => Promise<string | null>;
  write: (language: AppLanguage) => Promise<void>;
  apply: (language: AppLanguage) => void;
};

const isAppLanguage = (value: unknown): value is AppLanguage => value === "sr" || value === "en";

export const createLanguagePreference = ({ read, write, apply }: LanguagePreferenceDependencies) => {
  let selectionVersion = 0;
  let restoration: Promise<void> | undefined;
  let writes: Promise<void> = Promise.resolve();

  const restore = () => {
    restoration ??= (async () => {
      const version = selectionVersion;
      try {
        const saved = await read();
        if (version === selectionVersion && isAppLanguage(saved)) apply(saved);
      } catch {
        // Keep the current language when local storage cannot be read.
      }
    })();
    return restoration;
  };

  const select = (language: string): Promise<boolean> => {
    if (!isAppLanguage(language)) return Promise.resolve(false);
    selectionVersion += 1;
    apply(language);
    const saved = writes.then(async () => {
      try {
        await write(language);
        return true;
      } catch {
        return false;
      }
    });
    // Serialize writes so an older selection cannot overwrite the newest one.
    writes = saved.then(() => {});
    return saved;
  };

  return { restore, select };
};
