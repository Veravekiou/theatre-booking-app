import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';
import { saveSession } from '../services/secureStorage';
import { cardShadow, uiColors } from '../constants/ui';
import { getErrorMessage } from '../utils/errorMessage';

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(String(value).trim());

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please provide a valid email address.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Missing password', 'Please provide your password.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/login', {
        email: normalizedEmail,
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
      Alert.alert('Login failed', getErrorMessage(error, 'Unable to sign in right now.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundBase} />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <View style={styles.backgroundDarkLayer} />
      <View style={styles.backgroundBottomFade} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Text style={styles.appTitle}>TheaterBookingApp</Text>

            <View style={styles.formCard}>
              <Text style={styles.sectionEyebrow}>Account Access</Text>
              <Text style={styles.sectionTitle}>Login</Text>
              <Text style={styles.sectionSubtitle}>Use your email and password to enter the app.</Text>

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#9f7f66"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!submitting}
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9f7f66"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!submitting}
              />

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={submitting}>
                <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Login'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, submitting && styles.buttonDisabled]}
                onPress={() => router.push('/register')}
                disabled={submitting}>
                <Text style={styles.secondaryButtonText}>Create New Account</Text>
              </TouchableOpacity>

              <Text style={styles.footnote}>
                Browse productions, pick your showtime and manage reservations from one place.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101015',
  },
  keyboardContainer: {
    flex: 1,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#16111a',
  },
  backgroundGlowTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(122, 54, 74, 0.28)',
    top: -70,
    right: -50,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(143, 58, 58, 0.22)',
    bottom: -130,
    left: -90,
  },
  backgroundDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 12, 0.42)',
  },
  backgroundBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    backgroundColor: 'rgba(9, 10, 12, 0.76)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  appTitle: {
    textAlign: 'center',
    color: uiColors.heroText,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 18,
    letterSpacing: 0.4,
  },
  formCard: {
    backgroundColor: 'rgba(24, 24, 28, 0.9)',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...cardShadow,
  },
  sectionEyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#e7c58f',
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 6,
    color: '#fff6ea',
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#dbc6a8',
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#f2e3cf',
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    color: '#fff6ea',
  },
  button: {
    backgroundColor: uiColors.primary,
    padding: 15,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: uiColors.primaryDark,
  },
  buttonText: {
    color: uiColors.buttonPrimaryText,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: uiColors.buttonGhostBorder,
    backgroundColor: uiColors.buttonGhost,
  },
  secondaryButtonText: {
    color: uiColors.heroText,
    textAlign: 'center',
    fontWeight: '700',
  },
  footnote: {
    color: '#cbb79b',
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 19,
  },
});

