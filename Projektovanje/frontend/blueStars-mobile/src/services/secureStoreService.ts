import * as SecureStore from 'expo-secure-store';

const VALID_KEY = /^[A-Za-z0-9._-]+$/;

const assertValidKey = (key: string) => {
    if (!VALID_KEY.test(key)) throw new Error("Invalid secure storage key.");
};

export const secureStoreService = {
    setItemAsync: async (key: string, itemJson: string) => {
        assertValidKey(key);
        return await SecureStore.setItemAsync(key, itemJson);
    },

    getItemAsync: async(key: string): Promise<string | null> => {
        assertValidKey(key);
        return await SecureStore.getItemAsync(key);
    },

    deleteItemAsync: async(key: string) => {
        assertValidKey(key);
        return await SecureStore.deleteItemAsync(key);
    },
}
