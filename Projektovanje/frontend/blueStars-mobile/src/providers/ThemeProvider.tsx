import { createContext, useContext, useEffect, useState } from "react";
import { asyncStorageService } from "../services/asyncStorageService";
import { ASYNC_STORAGE_KEYS } from "../util/secureStoreKeys";
import { darkTheme, lightTheme } from "../styles/style";

export type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme; // "light" | "dark"
    Colors: typeof lightTheme; // the actual color object
    toggleTheme: (newTheme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>("light");

    const colors = theme === "light" ? lightTheme : darkTheme;

    const toggleTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        asyncStorageService.setItemAsync(ASYNC_STORAGE_KEYS.themeKey, newTheme);
    };

    useEffect(() => {
        (async () => {
            const savedTheme =
                (await asyncStorageService.getItemAsync(ASYNC_STORAGE_KEYS.themeKey)) ||
                "light";
            setTheme(savedTheme as Theme);
        })();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, Colors: colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};