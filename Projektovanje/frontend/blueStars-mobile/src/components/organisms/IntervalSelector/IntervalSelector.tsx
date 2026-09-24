import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/src/providers/ThemeProvider";

interface IntervalOption {
  id: string;
  label: string;
}

interface IntervalSelectorProps {
  options: IntervalOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  options,
  selectedId,
  onSelect,
  style,
}) => {
  const { Colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = option.id === selectedId;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[
              styles.option,
              {
                backgroundColor: isSelected
                  ? Colors.background || "#FFFFFF"
                  : "transparent",
                borderTopLeftRadius: 24,
                borderBottomLeftRadius: 24,
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24
              },
              isSelected && styles.selectedOption,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: isSelected
                    ? Colors.textPrimary || "#000000"
                    : Colors.textSecondary || "#666666",
                  fontWeight: isSelected ? "600" : "500",
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 24,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedOption: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionText: {
    fontSize: 15,
  },
});

export default IntervalSelector;