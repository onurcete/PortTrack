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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginDemo, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) return;
    const success = await login(email.trim(), password);
    if (success) {
      router.replace('/(tabs)' as any);
    }
  };

  const handleDemoLogin = async () => {
    const success = await loginDemo();
    if (success) {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Başlık */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>PT</Text>
            </View>
            <Text style={styles.title}>PortTrack</Text>
            <Text style={styles.subtitle}>
              Yatırım ve Portföy Takip Asistanınız
            </Text>
          </View>

          {/* Hata Mesajı */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-posta Adresi</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@email.com"
                  placeholderTextColor={colors.text.muted}
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
                <Lock size={18} color={colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  value={password}
                  onChangeText={(t) => {
                    clearError();
                    setPassword(t);
                  }}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Giriş Yap</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>VEYA</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={handleDemoLogin}
              disabled={isLoading}
            >
              <ShieldCheck size={18} color={colors.amber[400]} />
              <Text style={styles.demoBtnText}>Demo Modu ile İncele</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: colors.rose.bgSubtle,
    borderWidth: 1,
    borderColor: colors.rose[500],
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: colors.rose[400],
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emerald[500],
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.bg.borderSubtle,
  },
  dividerText: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  demoBtnText: {
    color: colors.amber[400],
    fontSize: 14,
    fontWeight: '600',
  },
});
