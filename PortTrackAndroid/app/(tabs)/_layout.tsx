import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { LayoutDashboard, PieChart, ArrowLeftRight, TrendingUp, Sparkles, Settings } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emerald[400],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.bg.borderSubtle,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 65 : 85,
          paddingBottom: Platform.OS === 'android' ? 10 : 25,
          paddingTop: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Özet',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portföy',
          tabBarIcon: ({ color, size }) => (
            <PieChart size={size ?? 22} color={color} />
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
          title: 'Büyüme',
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: 'AI Analiz',
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size ?? 22} color={color} />
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
    </Tabs>
  );
}
