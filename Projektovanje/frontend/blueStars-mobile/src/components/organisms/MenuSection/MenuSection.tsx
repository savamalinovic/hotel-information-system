import { Text } from "@/src/components/ui/text";
import { MenuSectionProps } from "@/src/types/types";
import { View } from "react-native";
import { MenuItem } from "../../molecules/MenuItem/MenuItem";
import { styles } from "./index.styles";


export default function MenuSection({ title, items }: MenuSectionProps) {
    return(
        <View className="mb-5">
            <Text
                style={[
                    styles.sectionTitle,
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
