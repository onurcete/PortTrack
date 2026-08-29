import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
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
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, mode, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ayarlar & Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Kullanıcı Bilgi Kartı */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.brand.soft }]}>
            <UserIcon size={24} color={theme.brand.primary} />
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

        {/* Görünüm & Tema */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>GÖRÜNÜM & TEMA</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.menuItem, { borderBottomColor: theme.borderSubtle }]}>
              <View style={styles.menuLeft}>
                {mode === 'dark' ? (
                  <Moon size={18} color={theme.brand.primary} />
                ) : (
                  <Sun size={18} color={theme.amber.main} />
                )}
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>
                  Karanlık Mod (Dark Theme)
                </Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.surfaceMuted, true: theme.brand.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Tercihler */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>TERCİHLER</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.menuItem, { borderBottomColor: theme.borderSubtle }]}>
              <View style={styles.menuLeft}>
                <Coins size={18} color={theme.text.secondary} />
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Ana Para Birimi</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={[styles.menuValue, { color: theme.text.muted }]}>{user?.defaultCurrency || 'TRY'}</Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Bell size={18} color={theme.text.secondary} />
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Günlük E-posta Bülteni</Text>
              </View>
              <Switch
                value={user?.dailyDigestEnabled ?? false}
                trackColor={{ false: theme.surfaceMuted, true: theme.brand.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.muted }]}>HAKKINDA</Text>

          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Info size={18} color={theme.text.secondary} />
                <Text style={[styles.menuLabel, { color: theme.text.primary }]}>Uygulama Sürümü</Text>
              </View>
              <Text style={[styles.menuValue, { color: theme.text.muted }]}>v1.0.0 (PortTrack Mobile)</Text>
            </View>
          </View>
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { backgroundColor: theme.loss.soft, borderColor: theme.loss.main },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={17} color={theme.loss.main} />
          <Text style={[styles.logoutText, { color: theme.loss.main }]}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 36,
    gap: 18,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  demoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  demoTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    gap: 7,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
