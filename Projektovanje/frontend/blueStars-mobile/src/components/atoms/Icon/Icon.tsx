import React from "react";
import * as LucideIcons from "lucide-react-native";
import { ViewStyle, StyleProp } from "react-native";
import { Colors } from "@/src/styles/style";
import { LucideIconName } from "@/src/types/types";

interface IconProps {
  name: LucideIconName;
  color?: string;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a Lucide icon from the `lucide-react-native` library.
 *
 * This component dynamically selects an icon by its `name` from the Lucide icon set.
 * It provides customization options for color, size, stroke width, and style.
 * If the specified icon name does not exist, a warning is logged and nothing is rendered.
 *
 * @param {IconProps} props - The icon component props.
 * @param {LucideIconName} props.name - The Lucide icon name to render.
 * @param {string} [props.color=Colors.tertiary] - Icon color.
 * @param {number} [props.size=24] - Icon size in pixels.
 * @param {number} [props.strokeWidth=2] - Line thickness of the icon.
 * @param {StyleProp<ViewStyle>} [props.style] - Optional style for the icon.
 * @returns {JSX.Element | null} The rendered icon, or `null` if not found.
 */
export const Icon = ({
  name,
  color = Colors.tertiary,
  size = 24,
  strokeWidth = 2,
  style,
}: IconProps) => {
  const LucideIcon = (LucideIcons as any)[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react-native`);
    return null;
  }

  return (
    <LucideIcon
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};


