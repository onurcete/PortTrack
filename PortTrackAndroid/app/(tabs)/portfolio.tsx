import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Filter } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatPercent,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { PortfolioSummary, AssetType } from '../../types';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'BIST', label: 'BIST Hisse' },
  { key: 'TEFAS', label: 'Fonlar' },
  { key: 'FOREIGN', label: 'Yabancı Hisse' },
  { key: 'BES', label: 'BES' },
  { key: 'CRYPTO', label: 'Kripto' },
  { key: 'METAL', label: 'Emtia' },
  { key: 'FX', label: 'Döviz' },
];

export default function PortfolioScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api.get<PortfolioSummary>('/portfolio');
      if (res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error('Portföy hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const filteredPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter((pos) => {
      const matchCategory =
        selectedCategory === 'ALL' || pos.assetType === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pos.name && pos.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [portfolio, selectedCategory, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Başlık & Arama */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portföyüm</Text>
        <Text style={styles.headerSubtitle}>
          {portfolio?.positions?.length || 0} Farklı Varlık
        </Text>
      </View>

      {/* Arama Kutusu */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.text.muted} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Sembol veya varlık ara..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Kategori Filtre Çipleri */}
      <View style={{ height: 44, marginVertical: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  isActive && {
                    backgroundColor: colors.emerald[500],
                    borderColor: colors.emerald[500],
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && { color: '#ffffff', fontWeight: '700' },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Varlık Listesi */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.emerald[400]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.emerald[400]}
            />
          }
        >
          {filteredPositions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Filtreye uygun varlık bulunamadı.</Text>
            </View>
          ) : (
            filteredPositions.map((pos, idx) => {
              const badge = getAssetTypeBadgeColor(pos.assetType);
              const isProfit = pos.profitTRY >= 0;

              return (
                <TouchableOpacity
                  key={`${pos.symbol}-${idx}`}
                  style={styles.card}
                  onPress={() => router.push(`/asset/${pos.symbol}` as any)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleGroup}>
                      <Text style={styles.symbol}>{pos.symbol}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {getAssetTypeLabel(pos.assetType)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.currentValue}>
                      {formatCurrency(pos.currentValueTRY)}
                    </Text>
                  </View>

                  {pos.name && (
                    <Text style={styles.assetName} numberOfLines={1}>
                      {pos.name}
                    </Text>
                  )}

                  <View style={styles.cardBottom}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Adet / Maliyet</Text>
                      <Text style={styles.infoValue}>
                        {pos.quantity.toLocaleString('tr-TR')} adet @ {formatCurrency(pos.avgCostTRY)}
                      </Text>
                    </View>

                    <View style={styles.infoColRight}>
                      <Text style={styles.infoLabel}>Kâr / Zarar</Text>
                      <Text
                        style={[
                          styles.profitText,
                          { color: isProfit ? colors.emerald[400] : colors.rose[400] },
                        ]}
                      >
                        {formatCurrency(pos.profitTRY)} ({formatPercent(pos.profitRate)})
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  categoryText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  assetName: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
  },
  infoCol: {
    flex: 1,
  },
  infoColRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  profitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
  },
});
