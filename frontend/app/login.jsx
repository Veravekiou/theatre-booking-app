import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';
import { saveSession } from '../services/secureStorage';
import { cardShadow, uiColors } from '../constants/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await api.post('/login', {
        email,
        password,
      });

      await saveSession(
        response.data.token,
        response.data.refreshToken,
        response.data.user
      );

      Alert.alert('Success', 'Login successful');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error.response?.data || error.message));
console.log('LOGIN ERROR:', error.response?.data || error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Theatre Booking</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your reservations.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#7b8798"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#7b8798"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/register')}>
            <Text style={styles.secondaryButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.background,
  },
  backgroundOrbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#dce9ff',
    top: -90,
    right: -60,
  },
  backgroundOrbBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#e7eeff',
    bottom: -110,
    left: -70,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: uiColors.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: uiColors.border,
    ...cardShadow,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: uiColors.primary,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    marginBottom: 6,
    textAlign: 'center',
    color: uiColors.text,
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    color: uiColors.textMuted,
    marginBottom: 20,
  },
  input: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.border,
    marginBottom: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    color: uiColors.text,
  },
  button: {
    backgroundColor: uiColors.primary,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: uiColors.surface,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: uiColors.border,
    backgroundColor: uiColors.surfaceMuted,
  },
  secondaryButtonText: {
    color: uiColors.primaryDark,
    textAlign: 'center',
    fontWeight: '700',
  },
});
