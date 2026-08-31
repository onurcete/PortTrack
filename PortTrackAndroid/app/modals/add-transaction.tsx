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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  BarChart2,
  PieChart,
  Globe,
  Info,
  ShieldCheck,
  LucideIcon,
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

interface AssetTypeOption {
  type: AssetType;
  label: string;
  icon: LucideIcon;
}

const ASSET_TYPE_CARDS: AssetTypeOption[] = [
  { type: 'BIST', label: 'BIST Hisseleri', icon: BarChart2 },
  { type: 'TEFAS', label: 'Yatırım Fonları', icon: PieChart },
  { type: 'BES_FUND', label: 'BES Fonları', icon: ShieldCheck },
  { type: 'FOREIGN', label: 'Yabancı Hisseler', icon: Globe },
  { type: 'CRYPTO', label: 'Kripto Paralar', icon: Coins },
  { type: 'FX', label: 'Döviz', icon: DollarSign },
  { type: 'METAL', label: 'Kıymetli Maden', icon: Layers },
  { type: 'BES', label: 'Bireysel Emeklilik', icon: ShieldCheck },
];

const PREDEFINED_METALS: SearchResult[] = [
  { symbol: 'ALTIN', name: 'Gram Altın (TL/Gram)', assetType: 'METAL', source: 'db' },
  { symbol: 'CEYREK', name: 'Çeyrek Altın (Adet / 1.75 gr)', assetType: 'METAL', source: 'db' },
  { symbol: 'YARIM', name: 'Yarım Altın (Adet / 3.51 gr)', assetType: 'METAL', source: 'db' },
  { symbol: 'TAM', name: 'Tam Altın / Ziynet (Adet / 7.02 gr)', assetType: 'METAL', source: 'db' },
  { symbol: 'ATA', name: 'Ata / Cumhuriyet Altını (Adet / 7.22 gr)', assetType: 'METAL', source: 'db' },
  { symbol: 'GUMUS', name: 'Gram Gümüş (TL/Gram)', assetType: 'METAL', source: 'db' },
  { symbol: 'XAU', name: 'Ons Altın (USD/Ons)', assetType: 'METAL', source: 'db' },
  { symbol: 'XAG', name: 'Ons Gümüş (USD/Ons)', assetType: 'METAL', source: 'db' },
  { symbol: 'XPT', name: 'Ons Platin (USD/Ons)', assetType: 'METAL', source: 'db' },
  { symbol: 'XPD', name: 'Ons Paladyum (USD/Ons)', assetType: 'METAL', source: 'db' },
];

interface SearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  source: 'db' | 'yahoo';
}

function formatDateToDisplay(isoDateStr: string): string {
  const [y, m, d] = isoDateStr.split('-');
  if (!y || !m || !d) return isoDateStr;
  return `${d}.${m}.${y}`;
}

function formatDisplayToIso(displayStr: string): string {
  if (displayStr.includes('.')) {
    const [d, m, y] = displayStr.split('.');
    if (y && m && d) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return displayStr;
}

export default function AddTransactionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    symbol?: string;
    side?: string;
    assetType?: string;
    quantity?: string;
    unitPrice?: string;
    currency?: string;
    date?: string;
    note?: string;
  }>();
  const isEdit = Boolean(params.id);
  const { theme } = useThemeStore();

  const initialDateDisplay = params.date
    ? formatDateToDisplay(params.date.slice(0, 10))
    : formatDateToDisplay(new Date().toISOString().slice(0, 10));

  const [side, setSide] = useState<TransactionSide>((params.side as TransactionSide) || 'BUY');
  const [assetType, setAssetType] = useState<AssetType>((params.assetType as AssetType) || 'BIST');
  const [symbol, setSymbol] = useState(params.symbol || '');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState(params.quantity || '');
  const [unitPrice, setUnitPrice] = useState(params.unitPrice || '');
  const [currency, setCurrency] = useState<'TRY' | 'USD'>((params.currency as 'TRY' | 'USD') || 'TRY');
  const [dateDisplay, setDateDisplay] = useState<string>(initialDateDisplay);
  const [note, setNote] = useState(params.note || '');
  const [submitting, setSubmitting] = useState(false);

  // Canlı Arama State'leri
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const isToday = dateDisplay === formatDateToDisplay(todayIso);
  const isYesterday = dateDisplay === formatDateToDisplay(yesterdayIso);

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
      if (assetType === 'METAL') {
        setSearchResults(PREDEFINED_METALS);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
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
    haptic.selection();
    setDateDisplay(formatDateToDisplay(todayIso));
  };
  const setYesterday = () => {
    haptic.selection();
    setDateDisplay(formatDateToDisplay(yesterdayIso));
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
      const isoDate = formatDisplayToIso(dateDisplay);
      const payload = {
        id: params.id,
        assetType,
        symbol: symbol.trim().toUpperCase(),
        side,
        unitPrice: numPrice,
        quantity: numQty,
        total: calculatedTotal,
        currency,
        date: new Date(isoDate).toISOString(),
        note: note.trim() || undefined,
      };

      const res = isEdit
        ? await api.put('/transactions', payload)
        : await api.post('/transactions', payload);

      if (res.error) {
        haptic.error();
        Alert.alert('Hata', res.error);
      } else {
        haptic.success();
        router.back();
      }
    } catch (err: any) {
      haptic.error();
      Alert.alert('Hata', isEdit ? 'İşlem güncellenirken bir sorun oluştu.' : 'İşlem kaydedilirken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top', 'bottom']}>
      {/* 1. ÜST HEADER & TUTAMAK */}
      <View style={styles.topHandleContainer}>
        <View style={[styles.topHandleBar, { backgroundColor: theme.borderSubtle }]} />
      </View>

      <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
            {isEdit ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.muted }]}>
            {isEdit ? 'Portföyünüzdeki bu işlem hareketini güncelleyin.' : 'Portföyünüze yatırım, alım veya satış işlemi ekleyin.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <X size={18} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 2. ALIŞ / SATIŞ SEGMENTİ (Screenshot 1:1) */}
        <View style={[styles.sideToggleRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
          <TouchableOpacity
            style={[
              styles.sideBtn,
              side === 'BUY' && [styles.sideBtnActive, { backgroundColor: '#5b4df5' }],
            ]}
            onPress={() => {
              haptic.selection();
              setSide('BUY');
            }}
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
              side === 'SELL' && [styles.sideBtnActive, { backgroundColor: '#5b4df5' }],
            ]}
            onPress={() => {
              haptic.selection();
              setSide('SELL');
            }}
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

        {/* 3. VARLIK TÜRÜ KARTLARI (Screenshot 1:1) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>Varlık Türü</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typesScroll}
          >
            {ASSET_TYPE_CARDS.map((item) => {
              const isSelected = assetType === item.type;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isSelected ? '#5b4df5' : theme.surfaceMuted,
                      borderColor: isSelected ? '#5b4df5' : theme.borderSubtle,
                    },
                    isSelected && styles.typeCardSelected,
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setAssetType(item.type);
                    if (item.type === 'METAL' && !symbol) {
                      setSearchResults(PREDEFINED_METALS);
                      setShowDropdown(true);
                    } else if (symbol) {
                      handleSymbolChange(symbol);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <IconComp size={20} color={isSelected ? '#ffffff' : theme.text.muted} />
                  <Text
                    style={[
                      styles.typeCardText,
                      { color: isSelected ? '#ffffff' : theme.text.secondary },
                      isSelected && { fontWeight: '800' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. VARLIK / SEMBOL ARAMA KUTUSU (Screenshot 1:1) */}
        <View style={[styles.sectionBlock, { zIndex: 100 }]}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>Varlık / Sembol</Text>
          <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Search size={18} color={theme.text.muted} />
            <TextInput
              style={[styles.textInputMain, { color: theme.text.primary }]}
              placeholder="Örnek: ASELS, THYAO, AAPL, BTC..."
              placeholderTextColor={theme.text.muted}
              value={symbol}
              onChangeText={handleSymbolChange}
              onFocus={() => {
                if (!symbol && assetType === 'METAL') {
                  setSearchResults(PREDEFINED_METALS);
                  setShowDropdown(true);
                }
              }}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color="#8b5cf6" />}
            {fetchingPrice && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Sparkles size={13} color="#f59e0b" />
                <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '700' }}>Fiyat...</Text>
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
            <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
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

        {/* 5. İŞLEM TARİHİ & HIZLI TARİH PİLLERİ (Screenshot 1:1) */}
        <View style={styles.sectionBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.muted, marginBottom: 0 }]}>İşlem Tarihi</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[
                  styles.quickDatePill,
                  isToday
                    ? { backgroundColor: '#5b4df5', borderColor: '#5b4df5' }
                    : { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
                onPress={setToday}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.quickDatePillText,
                    { color: isToday ? '#ffffff' : theme.text.muted },
                    isToday && { fontWeight: '800' },
                  ]}
                >
                  Bugün
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDatePill,
                  isYesterday
                    ? { backgroundColor: '#5b4df5', borderColor: '#5b4df5' }
                    : { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
                onPress={setYesterday}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.quickDatePillText,
                    { color: isYesterday ? '#ffffff' : theme.text.muted },
                    isYesterday && { fontWeight: '800' },
                  ]}
                >
                  Dün
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Calendar size={18} color={theme.text.muted} />
            <TextInput
              style={[styles.textInputMain, { color: theme.text.primary }]}
              placeholder="GG.AA.YYYY (Örn: 30.08.2026)"
              placeholderTextColor={theme.text.muted}
              value={dateDisplay}
              onChangeText={setDateDisplay}
            />
          </View>
        </View>

        {/* 6. MİKTAR / ADET & BİRİM FİYAT YAN YANA (Screenshot 1:1) */}
        <View style={styles.gridRow}>
          {/* Miktar */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionLabel, { color: theme.text.muted, marginBottom: 6 }]}>Miktar / Adet</Text>
            <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <Layers size={18} color={theme.text.muted} />
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

          {/* Birim Fiyat */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.sectionLabel, { color: theme.text.muted, marginBottom: 0 }]}>Birim Fiyat</Text>
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setCurrency(currency === 'TRY' ? 'USD' : 'TRY');
                }}
                style={[styles.currencyPill, { backgroundColor: 'rgba(99, 102, 241, 0.18)' }]}
                activeOpacity={0.8}
              >
                <Text style={styles.currencyPillText}>{currency}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputBoxWithIcon, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <Text style={[styles.currencySymbolPrefix, { color: theme.text.muted }]}>
                {currency === 'TRY' ? '₺' : '$'}
              </Text>
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

        {/* 7. TOPLAM TUTAR KARTI (Screenshot 1:1) */}
        <View style={[styles.totalCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
          <View>
            <Text style={styles.totalCardTitle}>Toplam Tutar</Text>
            <Text style={[styles.totalCardSub, { color: theme.text.muted }]}>Miktar × Birim Fiyat</Text>
          </View>
          <Text style={styles.totalCardValue}>
            {formatCurrency(calculatedTotal, currency)}
          </Text>
        </View>

        {/* 8. İŞLEM NOTU (İSTEĞE BAĞLI) (Screenshot 1:1) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: theme.text.muted }]}>İşlem Notu (İsteğe Bağlı)</Text>
          <View style={[styles.noteBoxContainer, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <FileText size={18} color={theme.text.muted} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.noteTextInput, { color: theme.text.primary }]}
                placeholder="Örnek: Düzenli alım, temettü öncesi alım..."
                placeholderTextColor={theme.text.muted}
                value={note}
                onChangeText={setNote}
                maxLength={200}
                multiline
              />
            </View>
            <Text style={[styles.noteCharCount, { color: theme.text.muted }]}>{note.length}/200</Text>
          </View>
        </View>

        {/* 9. NOT BİLGİ KUTUSU (Screenshot 1:1) */}
        <View style={[styles.infoCalloutBox, { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Info size={16} color="#a78bfa" />
            <Text style={styles.infoCalloutTitle}>Not</Text>
          </View>
          <Text style={[styles.infoCalloutDesc, { color: theme.text.secondary }]}>
            İşleminiz kaydedildiğinde portföy dağılımınız ve getiri hesaplamalarınız otomatik olarak güncellenecektir.
          </Text>
        </View>

        {/* 10. İŞLEMİ KAYDET BUTONU (Screenshot 1:1) */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#5b4df5' }]}
          onPress={handleSave}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Check size={18} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Değişiklikleri Kaydet' : (side === 'BUY' ? 'Alış İşlemini Kaydet' : 'Satış İşlemini Kaydet')}
              </Text>
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
  topHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  topHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sideToggleRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  sideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  sideBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sideBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  typesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  typeCard: {
    width: 92,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  typeCardSelected: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  typeCardText: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputBoxWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  textInputMain: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  foundAssetName: {
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  dropdownContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dropdownSymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  dropdownName: {
    fontSize: 11,
  },
  quickDatePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickDatePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currencyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818cf8',
  },
  currencySymbolPrefix: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#818cf8',
  },
  totalCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  totalCardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  noteBoxContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minHeight: 74,
    justifyContent: 'space-between',
  },
  noteTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  noteCharCount: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  infoCalloutBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
    padding: 14,
  },
  infoCalloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#a78bfa',
  },
  infoCalloutDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
