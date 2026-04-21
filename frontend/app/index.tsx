import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';
import { clearSession, getToken } from '../services/secureStorage';

export default function Index() {
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const token = await getToken();

        if (!token) {
          router.replace('/login');
          return;
        }

        await api.get('/profile');
        router.replace('/(tabs)');
      } catch {
        await clearSession();
        router.replace('/login');
      } finally {
        setCheckingSession(false);
      }
    };

    bootstrapSession();
  }, []);

  if (!checkingSession) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#8f3a3a" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f1e8'
  }
});

