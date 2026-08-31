import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  Coins,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  Info,
  Check,
  Mail,
  Palette,
  ExternalLink,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { haptic } from '../../utils/haptics';
import { SelectModal, SelectOption } from '../../components/SelectModal';

const CURRENCY_OPTIONS: SelectOption[] = [
  { key: 'TRY', label: 'Türk Lirası (₺)', subLabel: 'TRY - Varsayılan Para Birimi' },
  { key: 'USD', label: 'Amerikan Doları ($)', subLabel: 'USD - Global Para Birimi' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateSettings } = useAuthStore();
  const { theme, mode, toggleTheme } = useThemeStore();
  const { currency, setCurrency } = useCurrencyStore();

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [updatingDigest, setUpdatingDigest] = useState(false);

  // Günlük Bülten Ayarı Değiştirme
  const handleDigestToggle = async (val: boolean) => {
    haptic.selection();
    setUpdatingDigest(true);
    const ok = await updateSettings({ dailyDigestEnabled: val });
    setUpdatingDigest(false);
    if (ok) {
      haptic.success();
    } else {
      haptic.error();
      Alert.alert('Hata', 'E-posta bülteni tercihi kaydedilemedi.');
    }
  };

  // Varsayılan Para Birimi Değiştirme
  const handleCurrencySelect = async (newCurr: string) => {
    if (newCurr !== 'TRY' && newCurr !== 'USD') return;
    haptic.selection();
    setCurrency(newCurr);
    await updateSettings({ defaultCurrency: newCurr as 'TRY' | 'USD' });
    haptic.success();
  };

  // Tema Değiştirme
  const handleThemeToggle = () => {
    haptic.selection();
    toggleTheme();
    const nextTheme = mode === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme }).catch(() => {});
  };

  // Çıkış Yap
  const handleLogout = () => {
    haptic.light();
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          haptic.medium();
          await logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST BAŞLIK */}
      <View style={[styles.header, { borderBottomColor: theme.borderSubtle, backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ayarlar & Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. KULLANICI PROFİL KARTI */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: '#7c3aed' }]}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name[0]?.toUpperCase() : user?.email ? user.email[0]?.toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text.primary }]}>
              {user?.name || 'Kullanıcı'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.text.muted }]}>
              {user?.email || 'Giriş yapılmadı'}
            </Text>
            {user?.isDemo && (
              <View style={[styles.demoTag, { backgroundColor: theme.amber.soft }]}>
                <ShieldCheck size={11} color={theme.amber.main} />
                <Text style={[styles.demoTagText, { color: theme.amber.main }]}>Demo Hesap</Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. GÖRÜNÜM & TEMA */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>GÖRÜNÜM & TEMA</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: mode === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                  {mode === 'dark' ? (
                    <Moon size={18} color="#8b5cf6" />
                  ) : (
                    <Sun size={18} color="#f59e0b" />
                  )}
                </View>
                <View>
                  <Text style={[styles.menuLabel, { color: theme.text.primary }]}>
                    Karanlık Mod (Dark Theme)
                  </Text>
                  <Text style={[styles.menuSubText, { color: theme.text.muted }]}>
                    {mode === 'dark' ? 'Açık (Obsidian Gece Teması)' : 'Kapalı (Gündüz Teması)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={handleThemeToggle}
                trackColor={{ false: theme.surfaceMuted, true: '#5b4df5' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* 4. TERCİHLER & PORTFÖY */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>TERCİHLER & BİLDİRİMLER</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Ana Para Birimi Seçici */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.borderSubtle, borderBottomWidth: 1 }]}
              onPress={() => {
                haptic.selection();
                setCurrencyModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Coins size={18} color="#60a5fa" />
                </View>
                <View>
                  <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Ana Para Birimi</Text>
                  <Text style={[styles.menuSubText, { color: theme.text.muted }]}>
                    Varsayılan gösterim ve hesaplama para birimi
                  </Text>
                </View>
              </View>
              <View style={styles.menuRight}>
                <View style={[styles.currencyBadge, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.currencyBadgeText, { color: theme.text.primary }]}>
                    {user?.defaultCurrency || currency}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.text.muted} />
              </View>
            </TouchableOpacity>

            {/* Günlük E-posta Bülteni */}
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Mail size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.menuLabel, { color: theme.text.primary }]}>
                    Günlük E-posta Bülteni
                  </Text>
                  <Text style={[styles.menuSubText, { color: theme.text.muted }]}>
                    Her akşam portföy özetiniz e-posta adresinize iletilir
                  </Text>
                </View>
              </View>
              {updatingDigest ? (
                <ActivityIndicator size="small" color="#5b4df5" />
              ) : (
                <Switch
                  value={user?.dailyDigestEnabled ?? false}
                  onValueChange={handleDigestToggle}
                  trackColor={{ false: theme.surfaceMuted, true: '#5b4df5' }}
                  thumbColor="#ffffff"
                />
              )}
            </View>
          </View>
        </View>

        {/* 5. HAKKINDA & SİSTEM */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>UYGULAMA BİLGİSİ</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={[styles.menuItem, { borderBottomColor: theme.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                  <Info size={18} color={theme.text.secondary} />
                </View>
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Uygulama Sürümü</Text>
              </View>
              <Text style={[styles.menuValue, { color: theme.text.muted }]}>v1.0.2 (Build 3)</Text>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <ShieldCheck size={18} color="#818cf8" />
                </View>
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Veri Güvenliği & Gizlilik</Text>
              </View>
              <Text style={[styles.menuValue, { color: '#10b981', fontWeight: '700' }]}>Aktif ✓</Text>
            </View>
          </View>
        </View>

        {/* 6. ÇIKIŞ YAP BUTONU */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { backgroundColor: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.25)' },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={17} color={theme.loss.main} />
          <Text style={[styles.logoutText, { color: theme.loss.main }]}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Para Birimi Seçim Modalı */}
      <SelectModal
        visible={currencyModalVisible}
        title="Ana Para Birimi Seçin"
        options={CURRENCY_OPTIONS}
        selectedValue={user?.defaultCurrency || currency}
        onSelect={handleCurrencySelect}
        onClose={() => setCurrencyModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  demoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  demoTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  menuValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
