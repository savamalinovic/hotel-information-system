import { useTheme } from "../providers/ThemeProvider";

export const useStyles = (getStyles: (Colors: any) => any) => {
  const { Colors } = useTheme();
  return getStyles(Colors);
};