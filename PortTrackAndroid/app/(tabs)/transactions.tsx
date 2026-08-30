import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  Search,
  X,
  Trash2,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react-native';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatQuantity,
  formatDate,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { useThemeStore } from '../../stores/themeStore';
import { haptic } from '../../utils/haptics';
import { Transaction, AssetType } from '../../types';
import { PortTrackLogo } from '../../components/PortTrackLogo';

const ASSET_TYPE_FILTERS: { key: AssetType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tüm Varlıklar' },
  { key: 'TEFAS', label: 'Fonlar (TEFAS)' },
  { key: 'FOREIGN', label: 'Yabancı Hisseler' },
  { key: 'BIST', label: 'BIST Hisseleri' },
  { key: 'BES', label: 'Bireysel Emeklilik' },
  { key: 'CRYPTO', label: 'Kripto Para' },
  { key: 'METAL', label: 'Kıymetli Maden' },
  { key: 'FX', label: 'Döviz' },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'ALL'>('ALL');
  const [selectedSide, setSelectedSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get<{ transactions: Transaction[] }>('/transactions');
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('İşlemler yükleme hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await fetchTransactions();
    haptic.success();
  }, [fetchTransactions]);

  const handleDelete = (id: string, symbol: string) => {
    haptic.medium();
    Alert.alert(
      'İşlemi Sil',
      `${symbol} varlığına ait bu işlemi silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/transactions?id=${id}`);
              setTransactions((prev) => prev.filter((t) => t.id !== id));
              haptic.success();
            } catch (err) {
              Alert.alert('Hata', 'İşlem silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  // Filtreleme ve Arama Mantığı
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = selectedType === 'ALL' || tx.assetType === selectedType;
      const matchesSide = selectedSide === 'ALL' || tx.side === selectedSide;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        tx.symbol.toLowerCase().includes(q) ||
        (tx.note && tx.note.toLowerCase().includes(q));
      return matchesType && matchesSide && matchesQuery;
    });
  }, [transactions, selectedType, selectedSide, searchQuery]);

  const countsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      map.set(t.assetType, (map.get(t.assetType) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER (Logo + "+ Yeni İşlem" Butonu) */}
      <View style={[styles.topHeader, { backgroundColor: theme.bg.primary }]}>
        <View style={styles.headerLeft}>
          <PortTrackLogo size={28} variant="horizontal" showTagline={false} />
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#6366f1' }]}
          onPress={() => {
            haptic.selection();
            router.push('/modals/add-transaction' as any);
          }}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#ffffff" strokeWidth={3} />
          <Text style={styles.addBtnText}>Yeni İşlem</Text>
        </TouchableOpacity>
      </View>

      {/* 2. SAYFA BAŞLIĞI & İKONLAR */}
      <View style={styles.pageTitleRow}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>İşlemler</Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.pageSubtitle, { color: theme.text.muted }]}>
              {transactions.length} Kayıtlı Hareket
            </Text>
            <View style={[styles.purpleDot, { backgroundColor: '#8b5cf6' }]} />
          </View>
        </View>

        <View style={styles.titleActions}>
          <View style={[styles.iconCircleBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <Search size={17} color={theme.text.primary} />
          </View>
          <View style={[styles.iconCircleBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <Filter size={17} color={theme.text.primary} />
          </View>
        </View>
      </View>

      {/* 3. ARAMA KUTUSU */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
          <Search size={16} color={theme.text.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Sembol veya not ara..."
            placeholderTextColor={theme.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. İŞLEM TÜRÜ SEKMESİ (Tümü / Alışlar / Satışlar) */}
      <View style={[styles.sideSegmentBar, { borderBottomColor: theme.borderSubtle }]}>
        {(['ALL', 'BUY', 'SELL'] as const).map((side) => {
          const isSelected = selectedSide === side;
          const label = side === 'ALL' ? 'Tümü' : side === 'BUY' ? 'Alışlar' : 'Satışlar';
          return (
            <TouchableOpacity
              key={side}
              style={[
                styles.sideSegmentBtn,
                isSelected && styles.sideSegmentBtnActive,
              ]}
              onPress={() => {
                haptic.selection();
                setSelectedSide(side);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.sideSegmentText,
                  {
                    color: isSelected
                      ? theme.text.primary
                      : theme.text.muted,
                  },
                  isSelected && { fontWeight: '900', color: theme.text.primary },
                ]}
              >
                {label}
              </Text>
              {isSelected && <View style={[styles.activeTabIndicator, { backgroundColor: '#6366f1' }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. VARLIK KATEGORİ ÇİPLERİ (Yatay Kaydırılabilir) */}
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChipsScroll}
        >
          {ASSET_TYPE_FILTERS.map((f) => {
            const isSelected = selectedType === f.key;
            const count = f.key === 'ALL' ? transactions.length : (countsByType.get(f.key) ?? 0);
            if (f.key !== 'ALL' && count === 0 && selectedType !== f.key) return null;
            const badge = f.key !== 'ALL' ? getAssetTypeBadgeColor(f.key) : { bg: 'rgba(99, 102, 241, 0.15)', text: '#8b5cf6' };

            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? '#1e1b4b' : theme.surface,
                    borderColor: isSelected ? '#6366f1' : theme.borderSubtle,
                  },
                ]}
                onPress={() => {
                  haptic.selection();
                  setSelectedType(f.key);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: badge.text }]} />
                <Text
                  style={[
                    styles.typeChipText,
                    { color: isSelected ? '#ffffff' : theme.text.secondary },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {f.label}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.3)' : theme.surfaceMuted }]}>
                  <Text style={[styles.countBadgeText, { color: isSelected ? '#c7d2fe' : theme.text.muted }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 6. İŞLEM KARTLARI LİSTESİ */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>İşlemler yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
              colors={[theme.brand.primary]}
            />
          }
        >
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>İşlem Bulunamadı</Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.muted }]}>
                Arama kriterlerinize uygun kayıtlı işlem bulunmuyor.
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsContainer}>
              {filteredTransactions.map((tx, idx) => {
                const isBuy = tx.side === 'BUY';
                const badge = getAssetTypeBadgeColor(tx.assetType);

                return (
                  <TouchableOpacity
                    key={tx.id || `tx-${idx}`}
                    style={[
                      styles.txCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    onPress={() => router.push(`/asset/${tx.symbol}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Sol Kısım: Alış/Satış Kutusu + Varlık Tipi + Sembol + Adet */}
                    <View style={styles.txLeftGroup}>
                      {/* Alış / Satış Kutusu */}
                      <View
                        style={[
                          styles.sideSquare,
                          {
                            backgroundColor: isBuy ? 'rgba(34, 197, 94, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                          },
                        ]}
                      >
                        {isBuy ? (
                          <ArrowDownLeft size={16} color="#22c55e" strokeWidth={2.5} />
                        ) : (
                          <ArrowUpRight size={16} color="#f43f5e" strokeWidth={2.5} />
                        )}
                        <Text
                          style={[
                            styles.sideSquareText,
                            { color: isBuy ? '#22c55e' : '#f43f5e' },
                          ]}
                        >
                          {isBuy ? 'ALIŞ' : 'SATIŞ'}
                        </Text>
                      </View>

                      {/* Varlık Bilgileri */}
                      <View style={styles.txInfoGroup}>
                        <View style={styles.txHeaderRow}>
                          <View style={[styles.assetTypePill, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.assetTypePillText, { color: badge.text }]}>
                              {getAssetTypeLabel(tx.assetType)}
                            </Text>
                          </View>
                          <Text style={[styles.txSymbolText, { color: theme.text.primary }]}>
                            {tx.symbol}
                          </Text>
                        </View>

                        <Text style={[styles.txSubDetail, { color: theme.text.muted }]}>
                          {formatQuantity(tx.quantity)} Adet • Birim: {formatCurrency(tx.unitPrice, tx.currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Sağ Kısım: Tutar + Çöp Kutusu + Tarih + Ok */}
                    <View style={styles.txRightGroup}>
                      <View style={styles.txAmountRow}>
                        <Text style={[styles.txTotalVal, { color: theme.text.primary }]}>
                          {formatCurrency(tx.total, tx.currency)}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(tx.id, tx.symbol)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={14} color="#f43f5e" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.txDateRow}>
                        <Calendar size={12} color={theme.text.muted} />
                        <Text style={[styles.txDateText, { color: theme.text.muted }]}>
                          {formatDate(tx.date)}
                        </Text>
                        <ChevronRight size={14} color={theme.text.muted} style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontWeight: '500',
  },
  sideSegmentBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  sideSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sideSegmentBtnActive: {},
  sideSegmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 20,
    right: 20,
    height: 2.5,
    borderRadius: 1.5,
  },
  chipsSection: {
    marginBottom: 8,
  },
  typeChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  transactionsContainer: {
    gap: 9,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  txLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sideSquare: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  sideSquareText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  txInfoGroup: {
    flex: 1,
    gap: 3,
  },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assetTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  assetTypePillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  txSymbolText: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  txSubDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
  txRightGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTotalVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  deleteBtn: {
    padding: 2,
  },
  txDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txDateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
