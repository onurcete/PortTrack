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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, loginDemo, isLoading, error, clearError } = useAuthStore();
  const { theme } = useThemeStore();

  const [authModalType, setAuthModalType] = useState<'login' | 'register' | null>(null);

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Arka Plan Ambient Parlama */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      <View style={styles.contentWrapper}>
        {/* Üst Logo ve Başlık Bölümü */}
        <View style={styles.heroSection}>
          <PortTrackLogo size={90} variant="vertical" showTagline={true} themeMode="dark" />

          {/* Slogan Metni */}
          <Text style={styles.taglineText}>
            Tüm yatırımlarını <Text style={styles.taglineHighlight}>tek yerde</Text> takip et,{'\n'}
            performansını net şekilde gör.
          </Text>
        </View>

        {/* Alt Butonlar & Aksiyonlar */}
        <View style={styles.actionsSection}>
          {/* 1. Giriş Yap Butonu (Mor Gradient Görünümlü Ana Buton) */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => handleOpenModal('login')}
            activeOpacity={0.85}
          >
            <UserIcon size={20} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </TouchableOpacity>

          {/* 2. Üye Ol Butonu (Koyu Çerçeveli İkincil Buton) */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => handleOpenModal('register')}
            activeOpacity={0.85}
          >
            <UserPlus size={20} color="#e0e7ff" />
            <Text style={styles.secondaryBtnText}>Üye Ol</Text>
          </TouchableOpacity>

          {/* VEYA Ayracı */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 3. Demo Hesabı İncele */}
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

          <View style={styles.sheetContainer}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {authModalType === 'login' ? 'Giriş Yap' : 'Yeni Hesap Oluştur'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {authModalType === 'login'
                    ? 'Portföyünüze erişmek için bilgilerinizi girin'
                    : 'PortTrack ile yatırımlarınızı hemen yönetmeye başlayın'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
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
                  <Text style={styles.inputLabel}>Ad Soyad</Text>
                  <View style={styles.inputWrapper}>
                    <UserIcon size={18} color="#64748b" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Adınız Soyadınız"
                      placeholderTextColor="#475569"
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
                <Text style={styles.inputLabel}>E-posta Adresi</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="ornek@email.com"
                    placeholderTextColor="#475569"
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
                <Text style={styles.inputLabel}>Şifre</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
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
    backgroundColor: '#060814',
  },
  ambientGlow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    filter: 'blur(50px)',
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
    color: '#94a3b8',
    marginTop: 28,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  taglineHighlight: {
    color: '#a78bfa',
    fontWeight: '700',
  },
  actionsSection: {
    gap: 12,
    paddingBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 16,
    height: 54,
    gap: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1429',
    borderRadius: 16,
    height: 54,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  secondaryBtnText: {
    color: '#e0e7ff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
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
    fontSize: 14.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdropOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#0f1322',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 22,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    marginTop: 3,
    maxWidth: 260,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#fb7185',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070a14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    height: 50,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14.5,
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 14,
    height: 50,
    gap: 8,
    marginTop: 8,
  },
  sheetSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
