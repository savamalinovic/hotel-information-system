import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/src/providers/ThemeProvider";

interface Props {
  content: ReactNode;
}

export default function ProfileTemplate({ content }: Props) {
  const { Colors } = useTheme();
  const dynamicStyles = getStyles(Colors);

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.content}>{content}</View>
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.screenBackground,
    },
    content: {
      paddingHorizontal: 20,
      marginTop: 20,
      flexDirection: "column",
      rowGap: 16,
    },
  });