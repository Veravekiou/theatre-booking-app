import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1b1521'
        },
        headerTintColor: '#fff6ea',
        headerTitleStyle: {
          fontWeight: '700'
        }
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="shows"
        options={{
          title: 'Shows'
        }}
      />
      <Stack.Screen
        name="explore"
        options={{
          title: 'Showtimes'
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile'
        }}
      />
      <Stack.Screen
        name="buy-tickets"
        options={{
          title: 'Buy Tickets'
        }}
      />
    </Stack>
  );
}
