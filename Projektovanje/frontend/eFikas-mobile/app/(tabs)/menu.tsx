import { MenuItem } from "@/src/components/molecules/MenuItem/MenuItem";
import { LogoutDialog } from "@/src/components/organisms/Dialogs/LogoutDialog/LogoutDialog";
import { useAuth } from "@/src/hooks/useAuth";
import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { LucideIconName } from "@/src/types/types";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type MenuItemType = {
  id: string;
  icon: LucideIconName;
  i18nKey: string;
  roles?: ("AGENT" | "OPERATIONAL_WORKER")[];
};

type MenuSection = {
  i18nTitleKey: string;
  items: MenuItemType[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    i18nTitleKey: "menu.title.profile",
    items: [
      { id: "profile", icon: "User", i18nKey: "menu.item.profile" },
      { id: "notifications", icon: "Bell", i18nKey: "menu.item.notifications" },
      { id: "workforce", icon: "CalendarDays", i18nKey: "menu.item.workforce", roles: ["AGENT", "OPERATIONAL_WORKER"] },
    ],
  },
  {
    i18nTitleKey: "menu.title.operations",
    items: [
      { id: "apartments", icon: "House", i18nKey: "menu.item.apartments" },
      { id: "reservations", icon: "BookOpen", i18nKey: "menu.item.reservations" },
      { id: "tasks", icon: "Wrench", i18nKey: "menu.item.tasks" },
      { id: "expenses", icon: "Wallet", i18nKey: "menu.item.expenses" },
      { id: "damages", icon: "TriangleAlert", i18nKey: "menu.item.damages" },
    ],
  },
  {
    i18nTitleKey: "menu.title.settings",
    items: [
      { id: "settings", icon: "Settings", i18nKey: "menu.item.settings" },
      { id: "aboutApp", icon: "Info", i18nKey: "menu.item.aboutApp" },
      { id: "logout", icon: "LogOut", i18nKey: "menu.item.logout" },
    ],
  },
];

export default function Menu() {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { session } = useSession();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const handleItemPress = (itemId: string) => {
    switch (itemId) {
      case "profile":
        router.push("/(menu)/(profile)/profile");
        break;
      case "notifications":
        router.push("/(menu)/(profile)/notifications");
        break;
      case "workforce":
        router.push("/(menu)/workforce");
        break;
      case "reservations":
        router.push("/(tabs)/reservations");
        break;
      case "apartments":
      case "tasks":
      case "expenses":
      case "damages":
        router.push(`/(home)/${itemId}`);
        break;
      case "settings":
        router.push("/(menu)/(mainSettings)/settings");
        break;
      case "aboutApp":
        router.push("/(menu)/(mainSettings)/aboutApp");
        break;
      case "logout":
        setLogoutDialogVisible(true);
        break;
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={[styles.screenContainer, { backgroundColor: Colors.screenBackground }]}
    >
      {MENU_SECTIONS.map((section, sectionIndex) => {
        const items = section.items.filter((item) => item.roles
          ? Boolean(session?.role && item.roles.includes(session.role as "AGENT" | "OPERATIONAL_WORKER"))
          : session?.role === "AGENT");
        if (!items.length) return null;
        return (
        <View key={section.i18nTitleKey}>
          <Text
            style={[
              styles.sectionTitle,
              { color: Colors.primary },
              sectionIndex > 0 && styles.sectionMargin,
            ]}
          >
            {t(section.i18nTitleKey)}
          </Text>
          <View style={styles.listContainer}>
            {items.map((item, itemIndex) => (
              <MenuItem
                key={item.id}
                leftIconName={item.icon}
                text={t(item.i18nKey)}
                onPress={() => handleItemPress(item.id)}
                showDivider={itemIndex < items.length - 1}
              />
            ))}
          </View>
        </View>
      )})}
      <View style={{ height: 50 }} />
      <LogoutDialog
        visible={logoutDialogVisible}
        onConfirm={async () => {
          setLogoutDialogVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutDialogVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1 },
  scrollContent: { padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "500", marginBottom: 15, marginLeft: 5 },
  listContainer: { borderRadius: 10, overflow: "hidden" },
  sectionMargin: { marginTop: 20 },
});
