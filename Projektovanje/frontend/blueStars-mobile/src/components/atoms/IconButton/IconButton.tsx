import React, { useState } from "react";
import { Pressable, GestureResponderEvent } from "react-native";
import { Icon } from "../Icon/Icon"; 
import { Colors } from "@/src/styles/style";
import { LucideIconName } from "@/src/types/types";

interface IconButtonProps {
  iconName: LucideIconName;            
  onPress: (event: GestureResponderEvent) => void;
  size?: number;
  strokeWidth?: number; 
  color?: string;              
  disabled?: boolean;
  className?: string;
}

export const IconButton = ({
  iconName,
  onPress,
  size = 24,
  strokeWidth = 2,
  color,
  disabled = false,
  className = "",
}: IconButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const iconColor = disabled
    ? Colors.secondary
    : pressed
    ? Colors.primaryPressed // tamnija nijansa kad je pritisnuto
    : color || Colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={`${className}`}
    >
      <Icon name={iconName} size={size} color={iconColor} strokeWidth={strokeWidth} />
    </Pressable>
  );
};
