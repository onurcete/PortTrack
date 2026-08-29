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
  ExternalLink,
  Info,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar & Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Kullanıcı Bilgi Kartı */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserIcon size={26} color={colors.emerald[400]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Kullanıcı'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Giriş yapılmadı'}</Text>
            {user?.isDemo && (
              <View style={styles.demoTag}>
                <ShieldCheck size={12} color={colors.amber[400]} />
                <Text style={styles.demoTagText}>Demo Hesap</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tercihler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TERCİHLER</Text>

          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Coins size={18} color={colors.text.secondary} />
                <Text style={styles.menuLabel}>Ana Para Birimi</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{user?.defaultCurrency || 'TRY'}</Text>
                <ChevronRight size={16} color={colors.text.muted} />
              </View>
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Bell size={18} color={colors.text.secondary} />
                <Text style={styles.menuLabel}>Günlük E-posta Bülteni</Text>
              </View>
              <Switch
                value={user?.dailyDigestEnabled ?? false}
                trackColor={{ false: colors.bg.tertiary, true: colors.emerald[500] }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Hakkında & Yasal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HAKKINDA</Text>

          <View style={styles.menuGroup}>
            <View style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Info size={18} color={colors.text.secondary} />
                <Text style={styles.menuLabel}>Uygulama Sürümü</Text>
              </View>
              <Text style={styles.menuValue}>v1.0.0 (Expo SDK 52)</Text>
            </View>
          </View>
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={colors.rose[400]} />
          <Text style={styles.logoutText}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.emerald.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  demoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  demoTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.amber[400],
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 13,
    color: colors.text.muted,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.rose.bgSubtle,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    marginTop: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.rose[400],
  },
});
