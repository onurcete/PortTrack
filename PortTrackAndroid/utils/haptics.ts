import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Android ve iOS cihazlarda dokunmatik geri bildirim (haptic feedback) yardımcıları.
 */
export const haptic = {
  /** Hafif dokunma hissi (Butonlar, filtre çipleri, tab geçişleri) */
  light: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  /** Orta seviye dokunma hissi (Pull-to-refresh, toggle butonları) */
  medium: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /** Ağır / güçlü dokunma hissi (Uzun basma, önemli uyarılar) */
  heavy: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },

  /** Başarılı işlem hissi (İşlem kaydetme, fiyat yenileme tamamlanması) */
  success: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Hata veya uyarı hissi (İşlem silme, form doğrulama hatası) */
  error: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },

  /** Seçim değişimi hissi (Tarih seçici, kaydırmalı liste değişimi) */
  selection: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync();
    } catch {}
  },
};
