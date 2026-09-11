import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { VisitProvider } from '@/lib/visit';
import { C } from '@/theme';

function Gate() {
  const { ready, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    // Screens a signed-out user is allowed to reach.
    const publicRoute = segments[0] === 'login' || segments[0] === 'server';
    if (!user && !publicRoute) router.replace('/login');
    if (user && segments[0] === 'login') router.replace('/');
  }, [ready, user, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.a} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'fade',
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="server" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="visit/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <VisitProvider>
          <StatusBar style="light" />
          <Gate />
        </VisitProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
