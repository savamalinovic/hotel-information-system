import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";


export default function TabsRootLayout() {
    const { t } = useTranslation();
    const { Colors } = useTheme();
    const insets = useSafeAreaInsets();

    return(
        <Tabs initialRouteName="index" safeAreaInsets={{ bottom: insets.bottom }} screenOptions={{
            tabBarActiveTintColor: Colors.tabBarActiveTint,
            tabBarInactiveTintColor: Colors.tabBarInactiveTint,
            headerTintColor: Colors.textPrimary,
            headerStyle: {
                backgroundColor: Colors.tabBackground,
            },
            sceneStyle: { backgroundColor: Colors.screenBackground },
            tabBarStyle: {
              backgroundColor: Colors.tabBackground,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 10),
              height: 64 + Math.max(insets.bottom, 10),
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "600",
            },
            headerShadowVisible: false,
        }}>
            <Tabs.Screen name="index" options={{
                title: t('tabs.home'),
                headerTitle: t('tabs.home'),
                tabBarIcon: ({ color }) => <Icon name="House" size={28} color={color} />,
            }} />
            <Tabs.Screen name="apartments" options={{
                title: t('tabs.apartments'),
                headerTitle: t('tabs.apartments'),
                tabBarIcon: ({ color }) => <Icon name="Building2" size={28} color={color} />,
            }} />
            <Tabs.Screen name="reservations" options={{ href: null }} />
            <Tabs.Screen name="menu" options={{
                title: t('tabs.menu'),
                headerTitle: t('tabs.menu'),
                tabBarIcon: ({ color }) => <Icon name="Menu" size={28} color={color} />,
            }} />
        </Tabs>
    );
}
