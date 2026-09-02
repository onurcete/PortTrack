import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Activity, Settings } from 'lucide-react-native';
import { useThemeStore } from '../../stores/themeStore';

export default function TabLayout() {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();

  // Android 3 tuşlu navigasyon çubuğu (||| O <) olduğunda insets.bottom ~48dp olur.
  // Jestli sistemde ~16-24dp, iOS'ta ~34dp olur.
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 26);
  const barHeight = (Platform.OS === 'android' ? 56 : 54) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSubtle,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Genel Bakış',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'İşlemler',
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: 'Gelişim',
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: 'Analiz',
          tabBarIcon: ({ color, size }) => (
            <Activity size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size ?? 22} color={color} />
          ),
        }}
      />
      {/* Portfolio screen exists as sub-view or redirected from overview */}
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null, // Alt barda gizle, genel bakış içinden erişilebilir
        }}
      />
    </Tabs>
  );
}
