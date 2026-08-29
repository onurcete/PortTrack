import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { AssetType, TransactionSide } from '../../types';

const ASSET_TYPES: { type: AssetType; label: string }[] = [
  { type: 'BIST', label: 'BIST' },
  { type: 'TEFAS', label: 'TEFAS Fon' },
  { type: 'FOREIGN', label: 'Yabancı' },
  { type: 'CRYPTO', label: 'Kripto' },
  { type: 'BES', label: 'BES' },
  { type: 'METAL', label: 'Emtia' },
  { type: 'FX', label: 'Döviz' },
];

export default function AddTransactionModal() {
  const router = useRouter();

  const [side, setSide] = useState<TransactionSide>('BUY');
  const [assetType, setAssetType] = useState<AssetType>('BIST');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const numQty = parseFloat(quantity.replace(',', '.')) || 0;
  const numPrice = parseFloat(unitPrice.replace(',', '.')) || 0;
  const total = numQty * numPrice;

  const handleSave = async () => {
    if (!symbol.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir sembol veya hisse/fon kodu girin.');
      return;
    }
    if (numQty <= 0 || numPrice <= 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli adet ve birim fiyat girin.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/transactions', {
        assetType,
        symbol: symbol.trim().toUpperCase(),
        side,
        unitPrice: numPrice,
        quantity: numQty,
        total,
        currency,
        date: new Date().toISOString(),
        note: note.trim() || undefined,
      });

      if (res.error) {
        Alert.alert('Hata', res.error);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Hata', 'İşlem kaydedilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal Başlık */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yeni İşlem Ekle</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alış / Satış Toggle */}
        <View style={styles.sideToggle}>
          <TouchableOpacity
            style={[
              styles.sideBtn,
              side === 'BUY' && { backgroundColor: colors.emerald[500] },
            ]}
            onPress={() => setSide('BUY')}
          >
            <Text
              style={[
                styles.sideText,
                side === 'BUY' && { color: '#ffffff', fontWeight: '700' },
              ]}
            >
              ALIŞ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sideBtn,
              side === 'SELL' && { backgroundColor: colors.rose[500] },
            ]}
            onPress={() => setSide('SELL')}
          >
            <Text
              style={[
                styles.sideText,
                side === 'SELL' && { color: '#ffffff', fontWeight: '700' },
              ]}
            >
              SATIŞ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Varlık Türü */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Varlık Türü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {ASSET_TYPES.map((item) => {
                const isActive = assetType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeChip,
                      isActive && {
                        backgroundColor: colors.emerald[500],
                        borderColor: colors.emerald[500],
                      },
                    ]}
                    onPress={() => setAssetType(item.type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        isActive && { color: '#ffffff', fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Sembol */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Sembol / Kod</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: THYAO, TUPRS, MAC, AAPL, BTC"
            placeholderTextColor={colors.text.muted}
            value={symbol}
            onChangeText={(t) => setSymbol(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        {/* Adet & Birim Fiyat */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Adet / Lot</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.text.muted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Birim Fiyat ({currency})</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.text.muted}
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Toplam Hesaplanan Tutar */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Hesaplanan Toplam Tutar</Text>
          <Text style={styles.totalValue}>
            {total.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {currency}
          </Text>
        </View>

        {/* Not */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Not (İsteğe Bağlı)</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="İşlem hakkında kısa bir not..."
            placeholderTextColor={colors.text.muted}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Check size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>İşlemi Kaydet</Text>
            </>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  sideToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  sideText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  typeChipText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    color: colors.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  totalBox: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.text.muted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.emerald[400],
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emerald[500],
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
