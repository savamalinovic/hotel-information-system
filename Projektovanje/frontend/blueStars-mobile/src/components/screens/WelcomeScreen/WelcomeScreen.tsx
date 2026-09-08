import React from "react";
import { Image, StyleSheet } from "react-native";
import WelcomeScreenTemplate from "@/src/components/templates/WelcomeScreenTemplate/WelcomeScreenTemplate";
import { LoginButton } from "@/src/components/atoms/LoginButton/LoginButton";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

const WelcomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const handlePress = () => {
	router.push("/(auth)");
  };

  return (
    <WelcomeScreenTemplate
      backgroundSource={require("@/assets/images/welcome.gif")}
      logo={<Image source={require("@/assets/images/lqlogo.png")} style={styles.logo} />}
      primaryButton={
        <LoginButton
          title={t("welcome.loginButton")}
          onPress={handlePress}
          className="bg-white"
          textClassName="text-black"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 160,
    height: 80,
  },
});

export default WelcomeScreen;
