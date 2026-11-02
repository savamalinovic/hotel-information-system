import { useTheme } from "@/src/providers/ThemeProvider";
import { Text } from "@/src/components/ui/text";
import { MenuSectionProps } from "@/src/types/types";
import { View } from "react-native";
import { MenuItem } from "../../molecules/MenuItem/MenuItem";
import { styles } from "./index.styles";


export default function MenuSection({ title, items }: MenuSectionProps) {
    const { Colors, theme } = useTheme();
    return(
        <View className="mb-5">
            <Text
                style={[
                    styles.sectionTitle,
                    { color: theme === "dark" ? Colors.calendarPeriod : Colors.primary },
                ]}
            >
                {title}
            </Text>
            <View style={styles.listContainer}>
                {items.map((item, itemIndex) => (
                    <MenuItem
                        key={item.id}
                        leftIconName={item.icon}
                        text={item.text}
                        onPress={() => item.onPressMenuItem()}
                        showDivider={itemIndex < items.length - 1}
                    />
                ))}
            </View>
        </View>
    );
}
