import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="showtimes/[id]"
          options={{
            title: 'Book Tickets',
            headerStyle: {
              backgroundColor: '#1b1521'
            },
            headerTintColor: '#fff6ea',
            headerTitleStyle: {
              fontWeight: '700'
            }
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
