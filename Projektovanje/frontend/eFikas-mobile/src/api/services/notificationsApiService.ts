import * as Device from 'expo-device';
import * as Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { PushNotificationTokenRequest, ToggleNotificationRequest } from '@/src/types/types';
import { notificationsService } from '@/src/services/notificationsService';
import axiosInstance from '../axiosInstance';
import { API_URLS } from '@/src/util/apiConstants';
import { AxiosResponse } from 'axios';
import { sessionStore } from '@/src/session/sessionStore';

export const notificationsApiService = {
	
	registerPushTokenAsync: async () => {
		try {
			if (!Device.isDevice) throw new Error('Must use physical device');

			const { status: existingStatus } = await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;
			
			if (existingStatus !== 'granted') {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}
			
			if (finalStatus !== 'granted') throw new Error('Permission not granted');

			const token: string = await notificationsService.getPushToken();
			const session = sessionStore.getSession();
			if (!session) throw new Error('Authentication is required');

			const email = session.email;
			const payload: PushNotificationTokenRequest = {
				token: token,
				platform: notificationsService.getPlatform(),
				email: email
			}

			// TODO: create hook + register at beginning
			const response = await axiosInstance.post(API_URLS.notifications.pushToken, payload);

			if (response.status !== 200) throw new Error('Failed to save token on server');

			return response.data;
		} catch(err) {
			console.log("Push Token already exists");
		}
        
    },

	toggleNotifications: async (request: ToggleNotificationRequest): Promise<AxiosResponse> => {
		const response = axiosInstance.put(API_URLS.notifications.toggle, request);
		return response;
	}
}
