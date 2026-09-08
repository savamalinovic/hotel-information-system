import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Divider } from "@/src/components/ui/divider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { LucideIconName } from "@/src/types/types";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface MenuItemProps {
  text: string;
  onPress: () => void;
  leftIconName?: LucideIconName;
  rightIconName?: LucideIconName;
  showDivider?: boolean;
}

export const MenuItem = ({
  text,
  onPress,
  leftIconName = "Home",
  rightIconName = "ChevronRight",
  showDivider = true,
}: MenuItemProps) => {
  const { Colors } = useTheme();

  return (
    <View>
      <Pressable onPress={onPress} style={[styles.container, { backgroundColor: Colors.screenBackground }]}>
        {leftIconName && (
          <Icon
            name={leftIconName}
            size={24}
            color={Colors.iconMenu}
            style={styles.leftIcon}
          />
        )}
        <Text style={[styles.text, { color: Colors.textPrimary }]}>{text}</Text>
        {rightIconName && (
          <Icon
            name={rightIconName}
            size={20}
            color={Colors.tertiary}
            style={styles.rightIcon}
          />
        )}
      </Pressable>

      {showDivider && (
        <Divider style={{ backgroundColor: Colors.divider }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftIcon: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    fontSize: 16,
  },
  rightIcon: {
    marginLeft: 12,
  },
});
