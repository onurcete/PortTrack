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
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
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
import { Transaction, AssetType } from '../../types';

const ASSET_TYPE_FILTERS: { key: AssetType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tüm Varlıklar' },
  { key: 'TEFAS', label: 'Fonlar (TEFAS)' },
  { key: 'FOREIGN', label: 'Yabancı Hisseler' },
  { key: 'BIST', label: 'BIST Hisseleri' },
  { key: 'CRYPTO', label: 'Kripto' },
  { key: 'METAL', label: 'Maden' },
  { key: 'FX', label: 'Döviz' },
  { key: 'BES', label: 'BES' },
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
    setRefreshing(true);
    await fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = (id: string, symbol: string) => {
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

  // Özet İstatistikler (KPI)
  const stats = useMemo(() => {
    let totalBuy = 0;
    let totalSell = 0;
    for (const tx of transactions) {
      if (tx.side === 'BUY') {
        totalBuy += tx.total;
      } else {
        totalSell += tx.total;
      }
    }
    return {
      totalBuy,
      totalSell,
      netVolume: totalBuy - totalSell,
      count: transactions.length,
    };
  }, [transactions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST BAŞLIK & YENİ İŞLEM BUTONU (Tam Genişlik) */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>İşlemler</Text>
          <Text style={[styles.pageSubtitle, { color: theme.text.muted }]}>
            {stats.count} Kayıtlı Hareket
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.brand.primary }]}
          onPress={() => router.push('/modals/add-transaction' as any)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Yeni İşlem</Text>
        </TouchableOpacity>
      </View>

      {/* 2. ÖZET KPI ÇUBUĞU (Tam Genişlik) */}
      <View style={[styles.kpiBarSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>Toplam Alış</Text>
            <Text style={[styles.kpiValue, { color: theme.profit.main }]}>
              {formatCurrency(stats.totalBuy)}
            </Text>
          </View>

          <View style={[styles.kpiCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>Toplam Satış</Text>
            <Text style={[styles.kpiValue, { color: theme.loss.main }]}>
              {formatCurrency(stats.totalSell)}
            </Text>
          </View>

          <View style={[styles.kpiCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>Net Yatırım</Text>
            <Text style={[styles.kpiValue, { color: theme.text.primary }]}>
              {formatCurrency(stats.netVolume)}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. ARAMA & FİLTRE BÖLÜMÜ */}
      <View style={[styles.filterSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {/* Arama Kutusu */}
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
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

        {/* İşlem Yönü Segmenti (Tümü / Alışlar / Satışlar) */}
        <View style={styles.sideSegmentBar}>
          {(['ALL', 'BUY', 'SELL'] as const).map((side) => {
            const isSelected = selectedSide === side;
            const label = side === 'ALL' ? 'Tümü' : side === 'BUY' ? 'Alışlar' : 'Satışlar';
            return (
              <TouchableOpacity
                key={side}
                style={[
                  styles.sideSegmentBtn,
                  { backgroundColor: isSelected ? theme.surface : 'transparent' },
                  isSelected && { borderColor: theme.border, borderWidth: 1 },
                ]}
                onPress={() => setSelectedSide(side)}
              >
                <Text
                  style={[
                    styles.sideSegmentText,
                    {
                      color: isSelected
                        ? side === 'BUY'
                          ? theme.profit.main
                          : side === 'SELL'
                          ? theme.loss.main
                          : theme.text.primary
                        : theme.text.muted,
                    },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Varlık Kategori Çipleri (Yatay Kaydırılabilir) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChipsScroll}
        >
          {ASSET_TYPE_FILTERS.map((f) => {
            const isSelected = selectedType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? theme.brand.primary : theme.surfaceMuted,
                    borderColor: isSelected ? theme.brand.primary : theme.borderSubtle,
                  },
                ]}
                onPress={() => setSelectedType(f.key)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: isSelected ? '#ffffff' : theme.text.secondary },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. İŞLEM LİSTESİ (Tam Genişlik, Ekranla Bütün) */}
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
                      styles.txFullCard,
                      {
                        backgroundColor: theme.surface,
                        borderBottomColor: theme.border,
                      },
                    ]}
                    onPress={() => router.push(`/asset/${tx.symbol}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Üst Satır: Rozetler, Sembol ve Toplam Tutar */}
                    <View style={styles.txTopRow}>
                      <View style={styles.txTopLeft}>
                        {/* Alış / Satış Rozeti */}
                        <View
                          style={[
                            styles.sidePill,
                            { backgroundColor: isBuy ? theme.profit.soft : theme.loss.soft },
                          ]}
                        >
                          {isBuy ? (
                            <ArrowDownLeft size={11} color={theme.profit.main} />
                          ) : (
                            <ArrowUpRight size={11} color={theme.loss.main} />
                          )}
                          <Text
                            style={[
                              styles.sidePillText,
                              { color: isBuy ? theme.profit.main : theme.loss.main },
                            ]}
                          >
                            {isBuy ? 'ALIŞ' : 'SATIŞ'}
                          </Text>
                        </View>

                        {/* Kategori Rozeti */}
                        <View style={[styles.assetTypePill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.assetTypePillText, { color: badge.text }]}>
                            {getAssetTypeLabel(tx.assetType)}
                          </Text>
                        </View>

                        {/* Sembol */}
                        <Text style={[styles.txSymbolText, { color: theme.text.primary }]}>
                          {tx.symbol}
                        </Text>
                      </View>

                      {/* Sağ Taraf: Toplam Tutar & Silme Butonu */}
                      <View style={styles.txTopRight}>
                        <Text style={[styles.txTotalVal, { color: theme.text.primary }]}>
                          {formatCurrency(tx.total, tx.currency)}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(tx.id, tx.symbol)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={13} color={theme.loss.main} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Alt Satır: Adet, Birim Fiyat ve Tarih */}
                    <View style={styles.txBottomRow}>
                      <View style={styles.txDetailItems}>
                        <Text style={[styles.txSubDetail, { color: theme.text.secondary }]}>
                          <Text style={{ fontWeight: '700' }}>{formatQuantity(tx.quantity)}</Text> Adet
                        </Text>
                        <Text style={[styles.txDotSeparator, { color: theme.text.muted }]}>•</Text>
                        <Text style={[styles.txSubDetail, { color: theme.text.muted }]}>
                          Birim: {formatCurrency(tx.unitPrice, tx.currency)}
                        </Text>
                      </View>

                      <View style={styles.txDateWrapper}>
                        <Calendar size={11} color={theme.text.muted} />
                        <Text style={[styles.txDateText, { color: theme.text.muted }]}>
                          {formatDate(tx.date)}
                        </Text>
                      </View>
                    </View>

                    {/* Varsa Not Alanı */}
                    {tx.note && (
                      <View style={[styles.txNoteBox, { backgroundColor: theme.surfaceMuted }]}>
                        <FileText size={10} color={theme.text.muted} />
                        <Text style={[styles.txNoteText, { color: theme.text.secondary }]} numberOfLines={1}>
                          {tx.note}
                        </Text>
                      </View>
                    )}
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
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiBarSection: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  sideSegmentBar: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
  },
  sideSegmentBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  sideSegmentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listScrollContent: {
    paddingBottom: 40,
  },
  transactionsContainer: {
    gap: 0,
  },
  txFullCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  sidePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  assetTypePill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assetTypePillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  txSymbolText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txTotalVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDetailItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txSubDetail: {
    fontSize: 11,
  },
  txDotSeparator: {
    fontSize: 11,
  },
  txDateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txDateText: {
    fontSize: 10,
    fontWeight: '500',
  },
  txNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 5,
    marginTop: 2,
  },
  txNoteText: {
    fontSize: 10,
    fontStyle: 'italic',
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
