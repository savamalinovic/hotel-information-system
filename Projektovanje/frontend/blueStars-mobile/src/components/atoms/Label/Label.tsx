import { Text } from "@/src/components/ui/text";
import { useTheme } from "@/src/providers/ThemeProvider";

interface LabelProps {
  text: string;
  color?: string;
  required?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  align?: "left" | "center" | "right";
  className?: string;
}

export const Label = ({
  text,
  color,
  required = false,
  size = "md",
  align = "left",
  className = "",
}: LabelProps) => {
  const { Colors } = useTheme();

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  const labelColor = color || Colors.textPrimary;    
  return (
    <Text
      size={size}
      className={`font-medium ${alignClass} ${className}`}
      style={{ color: labelColor }}
      accessibilityLabel={`${text}${required ? " (required)" : ""}`}
    >
      {text}
      {required && (
        <Text size={size} style={{ color: 'red' }}>
          {" *"}
        </Text>
      )}
    </Text>
  );
};