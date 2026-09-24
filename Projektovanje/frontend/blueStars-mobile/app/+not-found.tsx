import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function NotFoundScreen() {
    const { t } = useTranslation();

    return(
        <>
            <Stack.Screen options={{ title: t('notFound.title') }} />
            <View>
                <Text>{t('notFound.title')}</Text>
                <Text>{t('notFound.message')}</Text>
                <Link href="/">{t('notFound.goHome')}</Link>
            </View>
        </>
    );
}
