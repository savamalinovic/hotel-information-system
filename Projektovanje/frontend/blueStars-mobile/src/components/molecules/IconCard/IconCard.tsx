import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Label } from "@/src/components/atoms/Label/Label";
import { Box } from "@/src/components/ui/box";
import { LucideIconName } from "@/src/types/types";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
// import { Colors } from "@/src/styles/style";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Platform } from "react-native";

interface IconCardProps {
  iconName: LucideIconName;
  label: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  strokeWidth?: number; 
  className?: string;
  labelProps?: Omit<React.ComponentProps<typeof Label>, "text">; // omogucava prosljedjivanje svih Label propova
}

export const IconCard = ({
  iconName,
  label,
  onPress,
  size = 35,
  color,
  strokeWidth = 1.5,
  className,
  labelProps,
}: IconCardProps) => {
  const { Colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <Box
        className={`items-center justify-center rounded-2xl p-3 bg-[rgb(var(--color-secondary-0))] ${className}`}
        style={[
          styles.container,
          {
            backgroundColor: Colors.background,
            ...(Platform.OS === 'ios' && {
              shadowColor: Colors.shadowColor,
            })
          }
        ]}
      >
        {/* Ikona – pomjerena malo gore */}
        <Box style={styles.iconContainer}>
          <Icon name={iconName} size={size} color={color} strokeWidth={strokeWidth} />
        </Box>

        {/* Labela – moze se kontrolisati sve kroz labelProps */}
        <Label text={label} align="center" size="xl" {...labelProps} />
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: 110,
    height: 110,

    // SHADOW
    ...Platform.select({
      ios: {
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    marginBottom: 8,
    transform: [{ translateY: -2 }],
  },
});