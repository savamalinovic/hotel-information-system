import { StyleSheet } from 'react-native';
import { Colors } from "@/src/styles/style";

export const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 16,
        fontWeight: 500,
        color: Colors.primary,
        marginBottom: 15,
        marginLeft: 5,
    },
    listContainer: {
        borderRadius: 10,
        overflow: "hidden",
    },
});