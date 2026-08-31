import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useCurrencyStore } from '../stores/currencyStore';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isInitialized, checkAuth, loginGoogle } = useAuthStore();
  const { theme, loadTheme, mode } = useThemeStore();
  const loadCurrency = useCurrencyStore((state) => state.loadCurrency);

  useEffect(() => {
    checkAuth();
    loadTheme();
    loadCurrency();

    // Deep Link ile Google Girişini Dinle
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes('auth-callback') || url.includes('token=')) {
        const parsed = Linking.parse(url);
        const token = parsed.queryParams?.token as string;
        if (token) {
          await loginGoogle(token);
          router.replace('/(tabs)' as any);
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [user, isInitialized, segments]);

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={theme.bg.primary} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen
          name="modals/add-transaction"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="asset/[symbol]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
