import AsyncStorage from '@react-native-async-storage/async-storage';

/** Admin JWT. AsyncStorage = localStorage on web. The login screen calls setAdminToken. */
export const ADMIN_TOKEN_KEY = 'synagogue.adminToken';
export const getAdminToken = (): Promise<string | null> => AsyncStorage.getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token: string): Promise<void> =>
  AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
export const clearAdminToken = (): Promise<void> => AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
