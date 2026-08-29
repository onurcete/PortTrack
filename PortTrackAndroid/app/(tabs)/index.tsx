import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet,
  Eye,
  EyeOff,
  RefreshCw,
  Coins,
  ChevronDown,
  Layers,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { formatCurrency, formatPercent, getAssetTypeLabel, getAssetTypeBadgeColor } from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { PortfolioSummary, PortfolioPosition, AssetType } from '../../types';

const SECTION_ORDER: { type: AssetType; label: string }[] = [
  { type: 'TEFAS', label: 'Yatırım Fonları' },
  { type: 'FOREIGN', label: 'Yabancı Hisseler' },
  { type: 'BIST', label: 'BIST Hisseleri' },
  { type: 'CRYPTO', label: 'Kripto Paralar' },
  { type: 'METAL', label: 'Kıymetli Madenler' },
  { type: 'FX', label: 'Döviz Varlıkları' },
  { type: 'BES', label: 'Bireysel Emeklilik' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { theme, mode, toggleTheme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api.get<PortfolioSummary>('/portfolio');
      if (res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error('Portföy yükleme hatası:', err);
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
    try {
      await api.post('/prices/refresh');
    } catch {}
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Kategori bazlı pozisyon gruplaması
  const positionsByType = useMemo(() => {
    const map: Record<string, PortfolioPosition[]> = {};
    if (!portfolio?.positions) return map;
    for (const pos of portfolio.positions) {
      if (!map[pos.assetType]) {
        map[pos.assetType] = [];
      }
      map[pos.assetType].push(pos);
    }
    return map;
  }, [portfolio]);

  const totalValue = portfolio?.totalValueTRY ?? 0;
  const pReturns = portfolio?.periodReturns;

  const isTRY = currency === 'TRY';

  // Dönemsel Kart Listesi
  const periodCards = [
    {
      key: '5d',
      label: 'Son 5 Gün',
      pct: isTRY ? pReturns?.weeklyTRY : pReturns?.weeklyUSD,
      amt: isTRY ? pReturns?.weeklyAmtTRY : pReturns?.weeklyAmtUSD,
    },
    {
      key: 'mtd',
      label: 'Bu Ay (MTD)',
      pct: isTRY ? pReturns?.mtdTRY : pReturns?.mtdUSD,
      amt: isTRY ? pReturns?.mtdAmtTRY : pReturns?.mtdAmtUSD,
    },
    {
      key: '1m',
      label: 'Son 1 Ay',
      pct: isTRY ? pReturns?.monthlyTRY : pReturns?.monthlyUSD,
      amt: isTRY ? pReturns?.monthlyAmtTRY : pReturns?.monthlyAmtUSD,
    },
    {
      key: 'ytd',
      label: 'Yıl Başı (YTD)',
      pct: isTRY ? pReturns?.ytdTRY : pReturns?.ytdUSD,
      amt: isTRY ? pReturns?.ytdAmtTRY : pReturns?.ytdAmtUSD,
    },
    {
      key: '1y',
      label: 'Son 1 Yıl',
      pct: isTRY ? pReturns?.oneYearTRY : pReturns?.oneYearUSD,
      amt: null,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER BAR */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.logoGroup}>
          <View style={[styles.logoIcon, { backgroundColor: theme.brand.primary }]}>
            <Wallet size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.text.primary }]}>PortTrack</Text>
            <Text style={[styles.brandSubtitle, { color: theme.text.muted }]}>Genel Bakış</Text>
          </View>
        </View>

        {/* Sağ Butonlar: Para Birimi, Tema Değiştirici, Gizle/Göster, Yenile */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
            onPress={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
          >
            <Coins size={13} color={theme.brand.primary} />
            <Text style={[styles.headerBtnText, { color: theme.brand.primary }]}>{currency}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
            onPress={toggleTheme}
          >
            {mode === 'dark' ? (
              <Sun size={16} color={theme.amber.main} />
            ) : (
              <Moon size={16} color={theme.brand.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
            onPress={() => setShowValues(!showValues)}
          >
            {showValues ? (
              <Eye size={16} color={theme.text.secondary} />
            ) : (
              <EyeOff size={16} color={theme.text.secondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              color={refreshing ? theme.brand.primary : theme.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
              colors={[theme.brand.primary]}
            />
          }
        >
          {/* 2. TOPLAM PORTFÖY DEĞERİ (NET WORTH) */}
          <View
            style={[
              styles.netWorthCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.netWorthLabel, { color: theme.text.muted }]}>
              TOPLAM PORTFÖY DEĞERİ
            </Text>
            <Text style={[styles.netWorthValue, { color: theme.text.primary }]}>
              {showValues ? formatCurrency(totalValue, currency) : '•••••••• ₺'}
            </Text>
          </View>

          {/* 3. DÖNEMSEL GETİRİLER (PERIOD RETURNS) */}
          <View style={styles.periodReturnsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.periodScroll}
            >
              {periodCards.map((card) => {
                const hasPct = card.pct !== null && card.pct !== undefined;
                const isPos = (card.pct ?? 0) >= 0;
                const profitColor = isPos ? theme.profit.main : theme.loss.main;
                const profitBg = isPos ? theme.profit.soft : theme.loss.soft;

                return (
                  <View
                    key={card.key}
                    style={[
                      styles.periodCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.periodLabel, { color: theme.text.muted }]}>
                      {card.label}
                    </Text>

                    <View style={styles.periodRow}>
                      {hasPct && (
                        <View
                          style={[
                            styles.periodBadge,
                            { backgroundColor: profitBg },
                          ]}
                        >
                          {isPos ? (
                            <TrendingUp size={12} color={profitColor} />
                          ) : (
                            <TrendingDown size={12} color={profitColor} />
                          )}
                          <Text style={[styles.periodPct, { color: profitColor }]}>
                            {showValues ? formatPercent(card.pct) : '••••'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {card.amt !== null && card.amt !== undefined && (
                      <Text style={[styles.periodAmt, { color: theme.text.secondary }]}>
                        {showValues ? formatCurrency(card.amt, currency) : '••••'}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. VARLIK DAĞILIMI (ASSET ALLOCATION) */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.sectionCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={15} color={theme.brand.primary} />
                <Text style={[styles.sectionCardTitle, { color: theme.text.primary }]}>
                  Varlık Dağılımı
                </Text>
              </View>
              <Text style={[styles.sectionCardCount, { color: theme.text.muted }]}>
                {portfolio?.positions?.length || 0} Varlık
              </Text>
            </View>

            {portfolio?.assetBreakdown && portfolio.assetBreakdown.length > 0 && (
              <View style={styles.allocationContainer}>
                {/* Segmentli Dağılım Çubuğu */}
                <View style={[styles.allocationBar, { backgroundColor: theme.surfaceMuted }]}>
                  {portfolio.assetBreakdown.map((item, idx) => {
                    const badge = getAssetTypeBadgeColor(item.type);
                    return (
                      <View
                        key={`bar-${item.type}-${idx}`}
                        style={{
                          flex: item.percent,
                          backgroundColor: badge.text,
                          height: 7,
                          borderRadius: 2,
                          marginHorizontal: 1,
                        }}
                      />
                    );
                  })}
                </View>

                {/* Dağılım Çipleri */}
                <View style={styles.chipsContainer}>
                  {portfolio.assetBreakdown.map((item, idx) => {
                    const badge = getAssetTypeBadgeColor(item.type);
                    return (
                      <View
                        key={`chip-${item.type}-${idx}`}
                        style={[styles.breakdownChip, { backgroundColor: theme.surfaceMuted }]}
                      >
                        <View style={[styles.chipDot, { backgroundColor: badge.text }]} />
                        <Text style={[styles.chipLabel, { color: theme.text.secondary }]}>
                          {getAssetTypeLabel(item.type)}
                        </Text>
                        <Text style={[styles.chipPercent, { color: theme.text.primary }]}>
                          %{item.percent.toFixed(1)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 5. TEK SATIR KOMPAKT AÇIK POZİSYONLAR */}
          <View style={styles.categoriesContainer}>
            <Text style={[styles.categoriesMainTitle, { color: theme.text.primary }]}>
              Açık Pozisyonlar
            </Text>

            {SECTION_ORDER.map((section) => {
              const items = positionsByType[section.type] || [];
              if (items.length === 0) return null;

              const isCollapsed = collapsedSections[section.type];
              const sectionTotalValue = items.reduce((acc, p) => acc + p.currentValueTRY, 0);
              const sectionTotalProfit = items.reduce((acc, p) => acc + p.profitTRY, 0);
              const badge = getAssetTypeBadgeColor(section.type);

              return (
                <View
                  key={section.type}
                  style={[
                    styles.categoryBlock,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {/* Kategori Başlığı */}
                  <TouchableOpacity
                    style={[styles.categoryHeader, { backgroundColor: theme.surface }]}
                    onPress={() => toggleSection(section.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catHeaderLeft}>
                      <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.categoryBadgeText, { color: badge.text }]}>
                          {items.length}
                        </Text>
                      </View>
                      <Text style={[styles.categoryTitle, { color: theme.text.primary }]}>
                        {section.label}
                      </Text>
                    </View>

                    <View style={styles.catHeaderRight}>
                      <Text style={[styles.categoryValue, { color: theme.text.primary }]}>
                        {showValues ? formatCurrency(sectionTotalValue, currency) : '••••••'}
                      </Text>
                      <ChevronDown
                        size={16}
                        color={theme.text.muted}
                        style={{
                          transform: [{ rotate: isCollapsed ? '-90deg' : '0deg' }],
                          marginLeft: 4,
                        }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Kategori İçi Tek Satır Varlık Listesi */}
                  {!isCollapsed && (
                    <View style={[styles.itemsList, { borderTopColor: theme.borderSubtle }]}>
                      {items.map((pos, pIdx) => {
                        const isPosProfit = pos.profitTRY >= 0;
                        const profitColor = isPosProfit ? theme.profit.main : theme.loss.main;

                        return (
                          <TouchableOpacity
                            key={`${pos.symbol}-${pIdx}`}
                            style={[
                              styles.singleRowAsset,
                              { borderBottomColor: theme.borderSubtle },
                            ]}
                            onPress={() => router.push(`/asset/${pos.symbol}` as any)}
                            activeOpacity={0.7}
                          >
                            {/* Sol: Sembol */}
                            <View style={styles.rowLeft}>
                              <Text style={[styles.rowSymbol, { color: theme.text.primary }]}>
                                {pos.symbol}
                              </Text>
                              {pos.currency !== 'TRY' && (
                                <View style={[styles.currencyTag, { backgroundColor: theme.surfaceMuted }]}>
                                  <Text style={[styles.currencyTagText, { color: theme.text.muted }]}>
                                    {pos.currency}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Orta: Adet @ Güncel Fiyat */}
                            <View style={styles.rowCenter}>
                              <Text style={[styles.rowQtyPrice, { color: theme.text.muted }]}>
                                {pos.quantity.toLocaleString('tr-TR')} adet @ {formatCurrency(pos.currentPriceTRY, currency)}
                              </Text>
                            </View>

                            {/* Sağ: Toplam Değer & Kâr/Zarar % */}
                            <View style={styles.rowRight}>
                              <Text style={[styles.rowValue, { color: theme.text.primary }]}>
                                {showValues ? formatCurrency(pos.currentValueTRY, currency) : '••••••'}
                              </Text>
                              <Text style={[styles.rowProfit, { color: profitColor }]}>
                                {showValues ? formatPercent(pos.profitRate) : '••••'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 3,
    borderWidth: 1,
  },
  headerBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 32,
    gap: 12,
  },
  netWorthCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  netWorthLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  netWorthValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  periodReturnsSection: {
    marginHorizontal: -14,
  },
  periodScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  periodCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    minWidth: 105,
  },
  periodLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  periodPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  periodAmt: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCardCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  allocationContainer: {
    gap: 8,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  breakdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 4,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chipPercent: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoriesContainer: {
    gap: 8,
    marginTop: 2,
  },
  categoriesMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 2,
    marginBottom: 2,
  },
  categoryBlock: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    borderTopWidth: 1,
  },
  singleRowAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '28%',
  },
  rowSymbol: {
    fontSize: 13,
    fontWeight: '800',
  },
  currencyTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  currencyTagText: {
    fontSize: 8,
    fontWeight: '700',
  },
  rowCenter: {
    flex: 1,
    paddingHorizontal: 4,
  },
  rowQtyPrice: {
    fontSize: 11,
    fontWeight: '500',
  },
  rowRight: {
    alignItems: 'flex-end',
    width: '32%',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  rowProfit: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
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
});
