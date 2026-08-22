import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { Accordion } from "@/src/components/atoms/Accordion/Accordion";
// import { Colors } from "@/src/styles/style";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

const screenHeight = Dimensions.get("window").height;

export const AboutAppScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { Colors } = useTheme();

  const styles = getStyles(Colors);

  const accordionItems = [
    {
      id: "a",
      title: t('aboutApp.accordion.functionalities'),
      content: (
        <View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="CircleCheckBig" size={14} color={Colors.textPrimary} />
           <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_fiscalization')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="CalendarDays" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_reservations')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="ChartNoAxesCombined" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_statistics')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Globe" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_multiLang')}
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: "b",
      title: t('aboutApp.accordion.compatibility'),
      content: (
        <View className="space-y-4">
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Smartphone" size={14} color={Colors.textPrimary}/>
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_platforms')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="ReceiptText" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_cashRegister')}
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: "c",
      title: t('aboutApp.accordion.appVersion'),
      content: (
        <View className="space-y-4">
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="RefreshCcw" size={14} color={Colors.textPrimary}/>
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_versionNumber')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="CalendarClock" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              {t('aboutApp.accordion.content_releaseDate')}
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: "d",
      title: t('aboutApp.accordion.team'),
      content: (
        <View className="space-y-4">
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary}/>
            <Text style={styles.accordionText}>
              Marko Maksimović
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              Anđela Balaban
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              Ivan Kuruzović
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              Sava Malinović
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              Nikolina Gatarić
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Dot" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              Sonja Galić
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: "e",
      title: t('aboutApp.accordion.contact'),
      content: (
        <View className="space-y-4">
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Mail" size={14} color={Colors.textPrimary}/>
            <Text style={styles.accordionText}>
              efikas@gmail.com
            </Text>
          </View>
          <View className="flex-row items-center gap-3 mb-1">
            <Icon name="Phone" size={14} color={Colors.textPrimary} />
            <Text style={styles.accordionText}>
              065/065-111
            </Text>
          </View>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appInfoContainer}>
          <View style={styles.appInfoSection}>
            <Image
              source={require("@/assets/images/appLogo.png")}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <View style={styles.appTextContainer}>
              <Text style={styles.appName}>eFikas</Text>
              <Text style={styles.appDesc}>
                Elektronski hotelski administrativni sistem
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.accordionSection, styles.accordionItemShadow]}> 
          <Accordion items={accordionItems} type="single" isCollapsible />
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (Colors: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
  scrollContent: {
    width: "100%",
    alignItems: "center",
    paddingTop: screenHeight * 0.02,
    paddingBottom: screenHeight * 0.1,
  },
  appInfoContainer: {
    width: "92%",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 30,
    borderColor: Colors.borderColor,
    borderWidth: 1,
    backgroundColor: Colors.cardBackground,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
  appInfoSection: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  appTextContainer: {
    flex: 1,
    marginLeft: 24,
  },
  appIcon: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 0,
    color: Colors.textPrimary,
  },
  appDesc: {
    textAlign: "left",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  accordionSection: {
    width: "92%",
    marginTop: 8, 
  },
  accordionItemShadow: {
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderColor: Colors.borderColor,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 4 },
      },
      
    }),
  },
  accordionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  accordionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
