import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  X,
  Check,
  Search,
  Calendar,
  Sparkles,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Coins,
  FileText,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useThemeStore } from '../../stores/themeStore';
import { haptic } from '../../utils/haptics';
import {
  formatCurrency,
  formatQuantity,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { AssetType, TransactionSide } from '../../types';

const ASSET_TYPES: { type: AssetType; label: string }[] = [
  { type: 'BIST', label: 'BIST Hisseleri' },
  { type: 'TEFAS', label: 'Yatırım Fonları' },
  { type: 'FOREIGN', label: 'Yabancı Hisseler' },
  { type: 'CRYPTO', label: 'Kripto Paralar' },
  { type: 'METAL', label: 'Kıymetli Maden' },
  { type: 'FX', label: 'Döviz' },
  { type: 'BES', label: 'BES Fonları' },
];

interface SearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  source: 'db' | 'yahoo';
}

export default function AddTransactionModal() {
  const router = useRouter();
  const { theme } = useThemeStore();

  const [side, setSide] = useState<TransactionSide>('BUY');
  const [assetType, setAssetType] = useState<AssetType>('BIST');
  const [symbol, setSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Canlı Arama State'leri
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Canlı Sembol Arama (Debounce ile)
  const handleSymbolChange = (text: string) => {
    setSymbol(text);
    setAssetName('');

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length >= 1) {
      setSearching(true);
      setShowDropdown(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.get<{ ok: boolean; results: SearchResult[] }>(
            `/symbols/search?query=${encodeURIComponent(text.trim())}&assetType=${assetType}`
          );
          if (res.data?.results) {
            setSearchResults(res.data.results);
          }
        } catch (err) {
          console.error('Sembol arama hatası:', err);
        } finally {
          setSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setSearching(false);
    }
  };

  // Arama Sonucuna Dokunulduğunda
  const selectSearchResult = async (item: SearchResult) => {
    haptic.selection();
    setSymbol(item.symbol);
    setAssetName(item.name);
    setAssetType(item.assetType);
    setShowDropdown(false);

    // Canlı Fiyatı Çek
    setFetchingPrice(true);
    try {
      const res = await api.get<{ ok: boolean; data: { price: number; currency: 'TRY' | 'USD' } | null }>(
        `/symbols/price?symbol=${encodeURIComponent(item.symbol)}&assetType=${item.assetType}`
      );
      if (res.data?.data) {
        setUnitPrice(res.data.data.price.toFixed(2));
        setCurrency(res.data.data.currency || 'TRY');
        haptic.light();
      }
    } catch (err) {
      console.error('Fiyat çekme hatası:', err);
    } finally {
      setFetchingPrice(false);
    }
  };

  const numQty = parseFloat(quantity.replace(',', '.')) || 0;
  const numPrice = parseFloat(unitPrice.replace(',', '.')) || 0;
  const calculatedTotal = numQty * numPrice;

  // Hızlı Tarih Seçenekleri
  const setToday = () => {
    haptic.light();
    setDate(new Date().toISOString().slice(0, 10));
  };
  const setYesterday = () => {
    haptic.light();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    if (!symbol.trim()) {
      haptic.error();
      Alert.alert('Eksik Bilgi', 'Lütfen bir sembol veya hisse/fon kodu girin.');
      return;
    }
    if (numQty <= 0 || numPrice <= 0) {
      haptic.error();
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli adet ve birim fiyat girin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/transactions', {
        assetType,
        symbol: symbol.trim().toUpperCase(),
        side,
        unitPrice: numPrice,
        quantity: numQty,
        total: calculatedTotal,
        currency,
        date: new Date(date).toISOString(),
        note: note.trim() || undefined,
      });

      if (res.error) {
        haptic.error();
        Alert.alert('Hata', res.error);
      } else {
        haptic.success();
        router.back();
      }
    } catch (err: any) {
      haptic.error();
      Alert.alert('Hata', 'İşlem kaydedilirken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top', 'bottom']}>
      {/* 1. ÜST HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Yeni İşlem Ekle</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.muted }]}>
            Portföyünüze alım veya satım hareketi kaydedin
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <X size={18} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 2. ALIŞ / SATIŞ YÖNÜ SEGMENTİ */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>İŞLEM YÖNÜ</Text>
          <View style={[styles.sideToggleRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.sideBtn,
                side === 'BUY' && { backgroundColor: theme.profit.main },
              ]}
              onPress={() => setSide('BUY')}
              activeOpacity={0.8}
            >
              <ArrowDownLeft size={16} color={side === 'BUY' ? '#ffffff' : theme.text.muted} />
              <Text
                style={[
                  styles.sideBtnText,
                  { color: side === 'BUY' ? '#ffffff' : theme.text.muted },
                  side === 'BUY' && { fontWeight: '800' },
                ]}
              >
                ALIŞ (Portföye Ekle)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sideBtn,
                side === 'SELL' && { backgroundColor: theme.loss.main },
              ]}
              onPress={() => setSide('SELL')}
              activeOpacity={0.8}
            >
              <ArrowUpRight size={16} color={side === 'SELL' ? '#ffffff' : theme.text.muted} />
              <Text
                style={[
                  styles.sideBtnText,
                  { color: side === 'SELL' ? '#ffffff' : theme.text.muted },
                  side === 'SELL' && { fontWeight: '800' },
                ]}
              >
                SATIŞ (Çıkış Yap)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. VARLIK TÜRÜ SEÇİCİ (Yatay Kaydırılabilir) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>VARLIK TÜRÜ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesScroll}>
            {ASSET_TYPES.map((item) => {
              const isSelected = assetType === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: isSelected ? theme.brand.primary : theme.surfaceMuted,
                      borderColor: isSelected ? theme.brand.primary : theme.borderSubtle,
                    },
                  ]}
                  onPress={() => {
                    setAssetType(item.type);
                    if (symbol) handleSymbolChange(symbol);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      { color: isSelected ? '#ffffff' : theme.text.secondary },
                      isSelected && { fontWeight: '800' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. SEMBOL CANLI ARAMA & OTOMATİK TAMAMLAMA */}
        <View style={[styles.sectionBlock, { zIndex: 100 }]}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>VARLIK / SEMBOL ADI</Text>
          <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Search size={16} color={theme.text.muted} />
            <TextInput
              style={[styles.textInputMain, { color: theme.text.primary }]}
              placeholder="Örn: ASELS, THYAO, AAPL, TI2, BTC..."
              placeholderTextColor={theme.text.muted}
              value={symbol}
              onChangeText={handleSymbolChange}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={theme.brand.primary} />}
            {fetchingPrice && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Sparkles size={13} color={theme.amber.main} />
                <Text style={{ fontSize: 10, color: theme.amber.main, fontWeight: '700' }}>Fiyat...</Text>
              </View>
            )}
            {symbol.length > 0 && !searching && !fetchingPrice && (
              <TouchableOpacity onPress={() => handleSymbolChange('')}>
                <X size={16} color={theme.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          {assetName ? (
            <Text style={[styles.foundAssetName, { color: theme.text.muted }]}>{assetName}</Text>
          ) : null}

          {/* ARAMA DROPDOWN LİSTESİ */}
          {showDropdown && searchResults.length > 0 && (
            <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {searchResults.map((item, idx) => {
                const badge = getAssetTypeBadgeColor(item.assetType);
                return (
                  <TouchableOpacity
                    key={`${item.symbol}-${idx}`}
                    style={[styles.dropdownItem, { borderBottomColor: theme.borderSubtle }]}
                    onPress={() => selectSearchResult(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownLeft}>
                      <View style={[styles.dropdownBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.dropdownBadgeText, { color: badge.text }]}>
                          {getAssetTypeLabel(item.assetType)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.dropdownSymbol, { color: theme.text.primary }]}>
                          {item.symbol}
                        </Text>
                        <Text style={[styles.dropdownName, { color: theme.text.muted }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 5. İŞLEM TARİHİ & HIZLI BUTONLAR */}
        <View style={styles.sectionBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.muted, marginBottom: 0 }]}>İŞLEM TARİHİ</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.dateQuickBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={setToday}
              >
                <Text style={[styles.dateQuickBtnText, { color: theme.brand.primary }]}>Bugün</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateQuickBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={setYesterday}
              >
                <Text style={[styles.dateQuickBtnText, { color: theme.text.secondary }]}>Dün</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Calendar size={16} color={theme.text.muted} />
            <TextInput
              style={[styles.textInputMain, { color: theme.text.primary }]}
              placeholder="YYYY-AA-GG (Örn: 2026-08-30)"
              placeholderTextColor={theme.text.muted}
              value={date}
              onChangeText={setDate}
            />
          </View>
        </View>

        {/* 6. ADET VE BİRİM FİYAT GRİDİ */}
        <View style={styles.gridRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>MİKTAR / ADET</Text>
            <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <TextInput
                style={[styles.textInputMain, { color: theme.text.primary, fontWeight: '700' }]}
                placeholder="0"
                placeholderTextColor={theme.text.muted}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.sectionLabel, { color: theme.text.muted, marginBottom: 0 }]}>BİRİM FİYAT</Text>
              <TouchableOpacity
                onPress={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
                style={[styles.currencyPill, { backgroundColor: theme.brand.soft }]}
              >
                <Text style={[styles.currencyPillText, { color: theme.brand.strong }]}>{currency}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <TextInput
                style={[styles.textInputMain, { color: theme.text.primary, fontWeight: '700' }]}
                placeholder="0,00"
                placeholderTextColor={theme.text.muted}
                value={unitPrice}
                onChangeText={setUnitPrice}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* 7. TOPLAM TUTAR ÖNİZLEME KARTI */}
        <View style={[styles.totalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.totalCardLabel, { color: theme.text.muted }]}>TOPLAM TUTAR</Text>
            <Text style={[styles.totalCardSub, { color: theme.text.secondary }]}>
              {numQty > 0 && numPrice > 0 ? `${formatQuantity(numQty)} Adet × ${formatCurrency(numPrice, currency)}` : 'Adet ve fiyat giriniz'}
            </Text>
          </View>
          <Text style={[styles.totalCardValue, { color: side === 'BUY' ? theme.profit.main : theme.loss.main }]}>
            {formatCurrency(calculatedTotal, currency)}
          </Text>
        </View>

        {/* 8. İŞLEM NOTU (OPSİYONEL) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>İŞLEM NOTU (İSTEĞE BAĞLI)</Text>
          <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <FileText size={16} color={theme.text.muted} />
            <TextInput
              style={[styles.textInputMain, { color: theme.text.primary }]}
              placeholder="Örn: Aylık düzenli birikim, temettü sonrası ekleme..."
              placeholderTextColor={theme.text.muted}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* 9. KAYDET BUTONU */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.brand.primary }]}
          onPress={handleSave}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Check size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>İşlemi Kaydet</Text>
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sideToggleRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 9,
    borderWidth: 1,
  },
  sideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    gap: 5,
  },
  sideBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typesScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    gap: 8,
  },
  textInputMain: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  foundAssetName: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  dropdownContainer: {
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  dropdownSymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  dropdownName: {
    fontSize: 10,
    maxWidth: 220,
  },
  dateQuickBtn: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  dateQuickBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currencyPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  totalCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  totalCardValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
