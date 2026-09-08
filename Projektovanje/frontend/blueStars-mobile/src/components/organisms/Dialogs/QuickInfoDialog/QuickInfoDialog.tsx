import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Easing,
    Pressable,
} from "react-native";
import { DialogButton } from "@/src/components/atoms/DialogButton/DialogButton";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";

export interface QuickInfoItem {
    label: string;
    value: string | number;
    isBold?: boolean;
    marginTop?: number;
}

export interface QuickInfoButton {
    title: string;
    onPress: () => void;
}

interface QuickInfoDialogProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    items: QuickInfoItem[];
    buttons: QuickInfoButton[];
    // Opciono: ako imate vise setova podataka (kao vise rezervacija)
    multipleData?: {
        currentIndex: number;
        total: number;
        onNavigate: (direction: "prev" | "next") => void;
    };
}

export const QuickInfoDialog: React.FC<QuickInfoDialogProps> = ({
    visible,
    onClose,
    title,
    items,
    buttons,
    multipleData,
}) => {
    const { Colors } = useTheme();
    const [navigationLocked, setNavigationLocked] = useState(false);

    // Animacije
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateOut = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start(() => callback());
    };

    useEffect(() => {
        if (visible) {
            setTimeout(animateIn, 10);
        }
    }, [visible]);

    const handleNavigate = (direction: "prev" | "next") => {
        if (navigationLocked || !multipleData) return;

        setNavigationLocked(true);
        multipleData.onNavigate(direction);

        setTimeout(() => setNavigationLocked(false), 120);
    };

    const handleClose = () => {
        animateOut(() => {
            onClose();
        });
    };

    const styles = getStyles(Colors);

    // Provera da li prikazati strelice
    const showArrows = multipleData && multipleData.total > 1;
    const isFirstItem = multipleData?.currentIndex === 0;
    const isLastItem =
        multipleData?.currentIndex === (multipleData?.total ?? 1) - 1;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.modalBackdrop} >
                
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    {/* Strelice - samo ako ima vise podataka */}
                    {showArrows && (
                        <>
                            <TouchableOpacity
                                style={styles.leftArrow}
                                disabled={isFirstItem}
                                onPress={() => handleNavigate("prev")}
                            >
                                <Icon
                                    name="ChevronLeft"
                                    size={28}
                                    color={isFirstItem ? Colors.tertiary : Colors.primary}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.rightArrow}
                                disabled={isLastItem}
                                onPress={() => handleNavigate("next")}
                            >
                                <Icon
                                    name="ChevronRight"
                                    size={28}
                                    color={isLastItem ? Colors.tertiary : Colors.primary}
                                />
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Naslov */}
                    <Text style={styles.modalTitle}>
                        {title}
                        {showArrows && ` (${multipleData.total})`}
                    </Text>

                    {/* Podaci */}
                    <View style={styles.content}>
                        {items.map((item, index) => (
                            <Text
                                key={index}
                                style={[
                                    styles.label,
                                    item.marginTop && { marginTop: item.marginTop },
                                ]}
                            >
                                {item.label}{" "}
                                <Text style={item.isBold ? styles.bold : undefined}>
                                    {item.value}
                                </Text>
                            </Text>
                        ))}
                    </View>

                    {/* Dugmad */}
                    <View style={styles.buttonRow}>
                        {buttons.map((button, index) => (
                            <DialogButton
                                key={index}
                                title={button.title}
                                onPress={button.onPress}
                            />
                        ))}
                    </View>
                </Animated.View>
                
            </View>
        </Modal>
    );
};

const getStyles = (Colors: any) =>
    StyleSheet.create({
        modalBackdrop: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
        },
        modalContainer: {
            width: "90%",
            backgroundColor: Colors.background,
            borderRadius: 20,
            padding: 24,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 24,
            color: Colors.textPrimary,
        },
        leftArrow: {
            position: "absolute",
            top: 16,
            left: 16,
            padding: 6,
            zIndex: 999,
        },
        rightArrow: {
            position: "absolute",
            top: 16,
            right: 16,
            padding: 6,
            zIndex: 999,
        },
        content: {
            marginBottom: 26,
        },
        label: {
            fontSize: 15,
            color: Colors.textPrimary,
            marginBottom: 6,
        },
        bold: {
            fontWeight: "600",
        },
        buttonRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 20,
        },
    });
