import { VStack } from "@/src/components/ui/vstack";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { router, useSegments } from "expo-router";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, ImageBackground, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AuthScreenTemplateProps {
  authForm: React.ReactNode;
  header?: React.ReactNode;
}

export default function AuthScreenTemplate({ authForm, header }: AuthScreenTemplateProps) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const initialHeight = useRef(Dimensions.get("window").height).current;
  const imageHeight = Math.min(Math.max(initialHeight * 0.3, 190 + insets.top), 310);
  const showBack = segments.includes("forgotPassword");

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <KeyboardAwareScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {header ?? (
          <ImageBackground source={require("@/assets/images/bluestars-auth-background.png")}
            resizeMode="cover" style={{ height: imageHeight, width: "100%" }}>
            <View style={styles.imageShade} />
            {showBack && <Pressable accessibilityRole="button" accessibilityLabel={t("session.back")}
              onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]}>
              <Icon name="ArrowLeft" size={24} color="#fff" />
            </Pressable>}
          </ImageBackground>
        )}
        <View style={[styles.form, { backgroundColor: Colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <VStack space="lg" className="w-full pt-8 items-center">
            <View className="w-full mt-6">{authForm}</View>
          </VStack>
        </View>
      </KeyboardAwareScrollView>
      <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  imageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.30)" },
  statusScrim: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.65)" },
  form: { flexGrow: 1, marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  back: { position: "absolute", left: 16, padding: 10, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.4)" },
});
