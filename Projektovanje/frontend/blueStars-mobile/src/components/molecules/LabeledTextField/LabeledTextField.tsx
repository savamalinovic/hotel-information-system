import React from "react";
import { View } from "react-native";
import { Label } from "@/src/components/atoms/Label/Label";
import TextField from "@/src/components/atoms/TextField/TextField";
import { LucideIconName } from "@/src/types/types";
import { useTheme } from "@/src/providers/ThemeProvider";

interface LabeledTextFieldProps {
  label: string;
  required?: boolean;
  error?: boolean;              // dodato
  errorText?: string;           // dodato
  disabled?: boolean;
  placeholder?: string;
  size?: "sm" | "md" | "lg" | "xl";
  labelSize?:
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl";
  iconName?: LucideIconName;
  iconLocation?: "left" | "right";
  variant?: "outline" | "underlined" | "rounded";
  type?: "text" | "password";
  rightElement?: React.ReactNode;
  onPress?: (e: any) => void;

  value?: string;
  onChangeText?: (text: string) => void;
  inputProps?: any;
}

const LabeledTextField = ({
  label,
  required = false,
  error = false,
  errorText,
  disabled = false,
  placeholder = "",
  size = "md",
  labelSize = "md",
  iconName,
  iconLocation = "left",
  variant = "outline",
  type = "text",
  rightElement,
  onPress,
  value,
  onChangeText,
  inputProps,
}: LabeledTextFieldProps) => {
  const hasError = !!error || !!errorText;
  const { Colors } = useTheme();

  return (
    <View className="w-full">
      <Label
        text={`${label}`}
        size={labelSize}
		required={required}
        align="left"
        color={hasError ? Colors.deleteColor : undefined}
        className="mb-1"
      />

      <TextField
        placeholder={placeholder}
        size={size}
        variant={variant}
        type={type}
        iconName={iconName}
        iconLocation={iconLocation}
        isInvalid={hasError}
        isDisabled={disabled}
        rightElement={rightElement}
        onPress={onPress}
        inputProps={{
          value,
          onChangeText,
          ...(inputProps || {}),
        }}
      />

      {errorText ? (
        <Label
          text={errorText}
          size="xs"
          align="left"
          color={Colors.deleteColor}
          className="mt-1"
        />
      ) : null}
    </View>
  );
};

export default LabeledTextField;
