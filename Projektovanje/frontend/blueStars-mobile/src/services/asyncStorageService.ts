import AsyncStorage from "@react-native-async-storage/async-storage";

export const asyncStorageService = {
    setItemAsync: async (key: string, itemJson: string) => {
        return await AsyncStorage.setItem(key, itemJson);
    },

    getItemAsync: async(key: string): Promise<string | null> => {
        return await AsyncStorage.getItem(key);
    },

    deleteItemAsync: async(key: string) => {
        return await AsyncStorage.removeItem(key);
    },
}