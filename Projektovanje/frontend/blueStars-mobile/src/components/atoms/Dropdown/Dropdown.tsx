import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  LayoutAnimation,
  ImageStyle,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Icon } from "../Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";

type DynamicStyles = {
    wrapper: ViewStyle;
    label: TextStyle;
    input: ViewStyle;
    placeholder: TextStyle;
    selectedText: TextStyle;
    dropdown: ViewStyle;
    item: ViewStyle;
    itemImage: ImageStyle;
    itemLabel: TextStyle;
    itemSub: TextStyle;
};

interface Props {
  label?: string;
  placeholder: string;
  options: any[];
  optionLabel?: string;
  optionValue?: string;
  selectedValue: any | any[];
  setSelectedValue: (v: any | any[]) => void;
  style?: any;
  containerStyle?: any;
}

export function Dropdown({
  label,
  placeholder,
  options,
  optionLabel = "label",
  optionValue = "value",
  selectedValue,
  setSelectedValue,
  style,
  containerStyle,
}: Props) {
  const { Colors } = useTheme();
  const isMulti = Array.isArray(selectedValue);
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  const handleSelect = (item: any) => {
    if (isMulti) {
      const exists = selectedValue?.some((x: any) => x[optionValue] === item[optionValue]);
      if (exists) {
        setSelectedValue(
          selectedValue.filter((x: any) => x[optionValue] !== item[optionValue])
        );
      } else {
        setSelectedValue([...selectedValue, item]);
      }
    } else {
      setSelectedValue(item);
      toggleOpen();
    }
  };

  const dynamicStyles: DynamicStyles = {
    wrapper: {
      width: "100%",
    },
    label: {
      marginBottom: 6,
      fontSize: 14,
      fontWeight: "500",
      color: Colors.textPrimary,
    },
    input: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: Colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.borderColor,
    },
    placeholder: {
      color: Colors.tertiary,
    },
    selectedText: {
      fontSize: 16,
      fontWeight: "500",
      color: Colors.textPrimary,
    },
    dropdown: {
      marginTop: 8,
      backgroundColor: Colors.background,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.borderColor,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      backgroundColor: Colors.background,
    },
    itemImage: {
      width: 48,
      height: 48,
      borderRadius: 10,
      marginRight: 12,
    },
    itemLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors.textPrimary,
    },
    itemSub: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
  };

  const renderItem = ({ item }: any) => {
    const isSelected = isMulti && selectedValue?.some((x: any) => x[optionValue] === item[optionValue]);

    return (
        <TouchableOpacity 
            style={[
                dynamicStyles.item,
                { backgroundColor: Colors.background }
            ]} 
            onPress={() => handleSelect(item)}
        >
          {item.image && <Image source={{ uri: item.image }} style={dynamicStyles.itemImage} />}
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.itemLabel}>{item[optionLabel]}</Text>
            {item.address && <Text style={dynamicStyles.itemSub}>{item.address}</Text>}
          </View>
          {isSelected && (
            <Icon name="Check" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
    );
  };

  const renderSelected = () => {
    if (isMulti) {
      if (!selectedValue?.length) return <Text style={dynamicStyles.placeholder}>{placeholder}</Text>;
      return (
        <Text style={dynamicStyles.selectedText}>
          {selectedValue.map((x: any) => x[optionLabel]).join(", ")}
        </Text>
      );
    }
    if (!selectedValue) return <Text style={dynamicStyles.placeholder}>{placeholder}</Text>;
    return <Text style={dynamicStyles.selectedText}>{selectedValue[optionLabel]}</Text>;
  };

  return (
    <View style={[dynamicStyles.wrapper, containerStyle]}>
      {label && <Text style={dynamicStyles.label}>{label}</Text>}

      <TouchableOpacity style={[dynamicStyles.input, style]} onPress={toggleOpen}>
        {renderSelected()}

        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={22} color={Colors.textPrimary} />
      </TouchableOpacity>

      {open && (
        <View style={dynamicStyles.dropdown}>
          <FlatList
            data={options}
            keyExtractor={(item) => item[optionValue].toString()}
            renderItem={renderItem}
			scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
}