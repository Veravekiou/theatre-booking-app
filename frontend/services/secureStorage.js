import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';
const AVATAR_URI_PREFIX = 'profile_avatar_uri:';
const LEGACY_KEYS = {
  [TOKEN_KEY]: 'token',
  [REFRESH_TOKEN_KEY]: 'refreshToken',
  [USER_KEY]: 'user'
};

const getAvatarKey = (user) => {
  const email = String(user?.email || '').trim().toLowerCase();
  return email ? `${AVATAR_URI_PREFIX}${email}` : null;
};

const getStoredAvatarUri = async (user) => {
  const avatarKey = getAvatarKey(user);
  if (!avatarKey) {
    return null;
  }

  return AsyncStorage.getItem(avatarKey);
};

const saveStoredAvatarUri = async (user) => {
  const avatarKey = getAvatarKey(user);
  const avatarUri = String(user?.avatar_uri || '').trim();

  if (!avatarKey || !avatarUri) {
    return;
  }

  await AsyncStorage.setItem(avatarKey, avatarUri);
};

const canUseSecureStore = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

const setSecureValue = async (key, value) => {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, value);
};

const getSecureValue = async (key) => {
  if (await canUseSecureStore()) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue !== null) {
      return secureValue;
    }
  }

  const currentValue = await AsyncStorage.getItem(key);
  if (currentValue !== null) {
    return currentValue;
  }

  const legacyKey = LEGACY_KEYS[key];
  if (!legacyKey) {
    return null;
  }

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue === null) {
    return null;
  }

  await setSecureValue(key, legacyValue);
  await AsyncStorage.removeItem(legacyKey);
  return legacyValue;
};

const deleteSecureValue = async (key) => {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
  }

  await AsyncStorage.removeItem(key);

  const legacyKey = LEGACY_KEYS[key];
  if (legacyKey) {
    await AsyncStorage.removeItem(legacyKey);
  }
};

export const saveSession = async (token, refreshToken, user) => {
  await setSecureValue(TOKEN_KEY, token);
  if (refreshToken) {
    await setSecureValue(REFRESH_TOKEN_KEY, refreshToken);
  }

  const avatarUri = user?.avatar_uri || await getStoredAvatarUri(user);
  const sessionUser = avatarUri ? { ...user, avatar_uri: avatarUri } : user;

  await setSecureValue(USER_KEY, JSON.stringify(sessionUser));
};

export const getToken = async () => {
  return getSecureValue(TOKEN_KEY);
};

export const getRefreshToken = async () => {
  return getSecureValue(REFRESH_TOKEN_KEY);
};

export const saveAccessToken = async (token) => {
  await setSecureValue(TOKEN_KEY, token);
};

export const saveRefreshToken = async (refreshToken) => {
  await setSecureValue(REFRESH_TOKEN_KEY, refreshToken);
};

export const getUser = async () => {
  const rawUser = await getSecureValue(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const saveUser = async (user) => {
  await saveStoredAvatarUri(user);
  await setSecureValue(USER_KEY, JSON.stringify(user));
};

export const deleteUserAvatar = async (user) => {
  const avatarKey = getAvatarKey(user);
  if (avatarKey) {
    await AsyncStorage.removeItem(avatarKey);
  }

  const nextUser = { ...(user || {}) };
  delete nextUser.avatar_uri;
  await setSecureValue(USER_KEY, JSON.stringify(nextUser));
  return nextUser;
};

export const clearSession = async () => {
  await deleteSecureValue(TOKEN_KEY);
  await deleteSecureValue(REFRESH_TOKEN_KEY);
  await deleteSecureValue(USER_KEY);
};
