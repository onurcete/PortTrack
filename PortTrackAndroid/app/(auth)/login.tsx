import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import {
  User as UserIcon,
  UserPlus,
  Eye,
  ChevronRight,
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { PortTrackLogo } from '../../components/PortTrackLogo';
import { haptic } from '../../utils/haptics';

WebBrowser.maybeCompleteAuthSession();

// Google 4-Renk SVG İkonu
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, loginGoogle, loginDemo, isLoading, error, clearError } = useAuthStore();
  const { theme, mode } = useThemeStore();

  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleOpenModal = (type: 'login' | 'register') => {
    haptic.selection();
    clearError();
    setAuthModalType(type);
  };

  const handleCloseModal = () => {
    setAuthModalType(null);
    clearError();
  };

  const handleGoogleLogin = async () => {
    haptic.medium();
    setGoogleLoading(true);
    try {
      const authUrl = 'https://port-track-ten.vercel.app/api/auth/google?mobile=true';
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'porttrack://');
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string;
        if (token) {
          await loginGoogle(token);
          haptic.success();
          setAuthModalType(null);
          router.replace('/(tabs)' as any);
        }
      }
    } catch (err) {
      console.error('Google login error:', err);
      Alert.alert('Hata', 'Google ile giriş yapılırken bir sorun oluştu.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    haptic.medium();
    if (!email.trim() || !password.trim()) return;

    if (authModalType === 'login') {
      const success = await login(email.trim(), password);
      if (success) {
        haptic.success();
        setAuthModalType(null);
        router.replace('/(tabs)' as any);
      }
    } else if (authModalType === 'register') {
      const success = await register(name.trim(), email.trim(), password);
      if (success) {
        haptic.success();
        setAuthModalType(null);
        router.replace('/(tabs)' as any);
      }
    }
  };

  const handleDemoAccess = async () => {
    haptic.medium();
    const success = await loginDemo();
    if (success) {
      haptic.success();
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: mode === 'dark' ? '#060814' : theme.bg.primary }]} edges={['top', 'bottom']}>
      {/* Arka Plan Ambient Parlama */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      <View style={styles.contentWrapper}>
        {/* Üst Logo ve Başlık Bölümü */}
        <View style={styles.heroSection}>
          <PortTrackLogo size={90} variant="vertical" showTagline={true} />

          {/* Slogan Metni */}
          <Text style={[styles.taglineText, { color: theme.text.secondary }]}>
            Tüm yatırımlarını <Text style={styles.taglineHighlight}>tek yerde</Text> takip et,{'\n'}
            performansını net şekilde gör.
          </Text>
        </View>

        {/* Alt Butonlar & Aksiyonlar */}
        <View style={styles.actionsSection}>
          {/* 1. Google İle Giriş Yap Butonu (Web ile Birebir Uyumlu) */}
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <>
                <GoogleIcon size={20} />
                <Text style={[styles.googleBtnText, { color: theme.text.primary }]}>
                  Google İle Giriş Yap
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* VEYA Ayracı */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: theme.text.muted }]}>veya e-posta ile</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
          </View>

          {/* 2. Giriş Yap Butonu (Mor Gradient Görünümlü Ana Buton) */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => handleOpenModal('login')}
            activeOpacity={0.85}
          >
            <UserIcon size={19} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </TouchableOpacity>

          {/* 3. Üye Ol Butonu (Koyu Çerçeveli İkincil Buton) */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
            onPress={() => handleOpenModal('register')}
            activeOpacity={0.85}
          >
            <UserPlus size={19} color={theme.text.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text.primary }]}>Yeni Hesap Oluştur</Text>
          </TouchableOpacity>

          {/* 4. Demo Hesabı İncele */}
          <TouchableOpacity
            style={styles.demoLinkBtn}
            onPress={handleDemoAccess}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#818cf8" />
            ) : (
              <>
                <Eye size={18} color="#818cf8" />
                <Text style={styles.demoLinkText}>Demo Hesabı İncele</Text>
                <ChevronRight size={16} color="#818cf8" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Giriş / Kayıt Modal Sheet */}
      <Modal
        visible={authModalType !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={styles.backdropOverlay} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheetContainer, { backgroundColor: theme.surface }]}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: theme.text.primary }]}>
                  {authModalType === 'login' ? 'Giriş Yap' : 'Yeni Hesap Oluştur'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.text.muted }]}>
                  {authModalType === 'login'
                    ? 'Portföyünüze erişmek için bilgilerinizi girin'
                    : 'PortTrack ile yatırımlarınızı hemen yönetmeye başlayın'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[styles.sheetCloseBtn, { backgroundColor: theme.surfaceMuted }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Modal İçi Google Giriş Butonu */}
            <TouchableOpacity
              style={[styles.googleBtnModal, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <>
                  <GoogleIcon size={18} />
                  <Text style={[styles.googleBtnText, { color: theme.text.primary, fontSize: 13 }]}>
                    {authModalType === 'login' ? 'Google İle Giriş Yap' : 'Google İle Kaydol'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.dividerRow, { marginVertical: 14 }]}>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
              <Text style={[styles.dividerText, { color: theme.text.muted }]}>veya bilgilerinizle</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSubtle }]} />
            </View>

            {/* Hata Kutusu */}
            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {typeof error === 'string' ? error : (error as any)?.message || 'İşlem başarısız.'}
                </Text>
              </View>
            )}

            {/* Input Alanları */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
            >
              {authModalType === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Ad Soyad</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <UserIcon size={18} color={theme.text.muted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text.primary }]}
                      placeholder="Adınız Soyadınız"
                      placeholderTextColor={theme.text.muted}
                      value={name}
                      onChangeText={(t) => {
                        clearError();
                        setName(t);
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>E-posta Adresi</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                  <Mail size={18} color={theme.text.muted} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text.primary }]}
                    placeholder="ornek@email.com"
                    placeholderTextColor={theme.text.muted}
                    value={email}
                    onChangeText={(t) => {
                      clearError();
                      setEmail(t);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text.secondary }]}>Şifre</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                  <Lock size={18} color={theme.text.muted} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text.primary }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.text.muted}
                    value={password}
                    onChangeText={(t) => {
                      clearError();
                      setPassword(t);
                    }}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Submit Butonu */}
              <TouchableOpacity
                style={[styles.sheetSubmitBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.sheetSubmitBtnText}>
                      {authModalType === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                    </Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  taglineText: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 28,
    fontWeight: '500',
  },
  taglineHighlight: {
    color: '#818cf8',
    fontWeight: '800',
  },
  actionsSection: {
    width: '100%',
    gap: 11,
    paddingBottom: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  demoLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  demoLinkText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetSubmitBtn: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  sheetSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
