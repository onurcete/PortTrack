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
  const periodMetrics = [
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

        {/* Sağ Butonlar */}
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
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Portföy yükleniyor...</Text>
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
          {/* 2. BİRLEŞİK TEK BÜTÜN HERO KART (TOPLAM PORTFÖY + DÖNEMSEL GETİRİLER) */}
          <View
            style={[
              styles.unifiedHeroCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Üst Kısım: Toplam Portföy Değeri */}
            <View style={styles.heroTop}>
              <View style={styles.heroHeaderRow}>
                <Text style={[styles.heroLabel, { color: theme.text.muted }]}>
                  TOPLAM PORTFÖY DEĞERİ
                </Text>
                <Text style={[styles.heroDate, { color: theme.text.muted }]}>
                  {portfolio?.lastUpdated
                    ? new Date(portfolio.lastUpdated).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>

              <Text style={[styles.heroMainValue, { color: theme.text.primary }]}>
                {showValues ? formatCurrency(totalValue, currency) : '•••••••• ₺'}
              </Text>
            </View>

            {/* Alt Kısım: Dönemsel Getiriler (Son 5 Gün, MTD, 1 Ay, YTD, 1 Yıl) */}
            <View style={[styles.heroBottom, { borderTopColor: theme.borderSubtle }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.heroPeriodScroll}
              >
                {periodMetrics.map((item) => {
                  const hasPct = item.pct !== null && item.pct !== undefined;
                  const isPos = (item.pct ?? 0) >= 0;
                  const color = hasPct ? (isPos ? theme.profit.main : theme.loss.main) : theme.text.muted;
                  const bg = hasPct ? (isPos ? theme.profit.soft : theme.loss.soft) : theme.surfaceMuted;

                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.heroPeriodItem,
                        {
                          backgroundColor: theme.surfaceMuted,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.heroPeriodLabel, { color: theme.text.muted }]}>
                        {item.label}
                      </Text>

                      <View style={[styles.heroPeriodBadge, { backgroundColor: bg }]}>
                        {hasPct && (
                          isPos ? (
                            <TrendingUp size={11} color={color} style={{ marginRight: 2 }} />
                          ) : (
                            <TrendingDown size={11} color={color} style={{ marginRight: 2 }} />
                          )
                        )}
                        <Text style={[styles.heroPeriodPct, { color }]}>
                          {hasPct && showValues ? formatPercent(item.pct) : (hasPct ? '••••' : '%0.00')}
                        </Text>
                      </View>

                      {item.amt !== null && item.amt !== undefined && (
                        <Text style={[styles.heroPeriodAmt, { color: theme.text.muted }]}>
                          {showValues ? formatCurrency(item.amt, currency) : '••••'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* 3. VARLIK DAĞILIMI (ASSET ALLOCATION) */}
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

          {/* 4. AÇIK POZİSYONLAR (GÜNCEL FİYAT, GÜNLÜK %, ADET SEMBOL ALTINDA) */}
          <View style={styles.categoriesContainer}>
            <Text style={[styles.categoriesMainTitle, { color: theme.text.primary }]}>
              Açık Pozisyonlar
            </Text>

            {SECTION_ORDER.map((section) => {
              const items = positionsByType[section.type] || [];
              if (items.length === 0) return null;

              const isCollapsed = collapsedSections[section.type];
              const sectionTotalValue = items.reduce((acc, p) => acc + p.currentValueTRY, 0);
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

                  {/* Kategori İçi Varlık Listesi (Tek Satır: Sol: Sembol+Adet, Orta: Güncel Fiyat, Sağ: Değer+Günlük %) */}
                  {!isCollapsed && (
                    <View style={[styles.itemsList, { borderTopColor: theme.borderSubtle }]}>
                      {items.map((pos, pIdx) => {
                        const dailyPct = pos.dailyChangePct ?? 0;
                        const isDailyPos = dailyPct >= 0;
                        const dailyColor = isDailyPos ? theme.profit.main : theme.loss.main;

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
                            {/* Sol: Üstte Sembol, Altta Adet */}
                            <View style={styles.colLeft}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.symbolText, { color: theme.text.primary }]}>
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
                              <Text style={[styles.qtyText, { color: theme.text.muted }]}>
                                {pos.quantity.toLocaleString('tr-TR')} Adet
                              </Text>
                            </View>

                            {/* Orta: Güncel Fiyat */}
                            <View style={styles.colCenter}>
                              <Text style={[styles.centerPrice, { color: theme.text.secondary }]}>
                                {formatCurrency(pos.currentPriceTRY, currency)}
                              </Text>
                            </View>

                            {/* Sağ: Üstte Toplam Değer, Altta Günlük % Değişim */}
                            <View style={styles.colRight}>
                              <Text style={[styles.rightValue, { color: theme.text.primary }]}>
                                {showValues ? formatCurrency(pos.currentValueTRY, currency) : '••••••'}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 }}>
                                {isDailyPos ? (
                                  <TrendingUp size={10} color={dailyColor} />
                                ) : (
                                  <TrendingDown size={10} color={dailyColor} />
                                )}
                                <Text style={[styles.dailyPctText, { color: dailyColor }]}>
                                  {showValues ? formatPercent(dailyPct) : '••••'}
                                </Text>
                              </View>
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
    paddingBottom: 36,
    gap: 12,
  },
  unifiedHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroTop: {
    padding: 16,
    paddingBottom: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroDate: {
    fontSize: 10,
  },
  heroMainValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  heroBottom: {
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  heroPeriodScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  heroPeriodItem: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    minWidth: 95,
  },
  heroPeriodLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  heroPeriodPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroPeriodAmt: {
    fontSize: 9,
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
  colLeft: {
    width: '32%',
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '800',
  },
  qtyText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
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
  colCenter: {
    flex: 1,
    alignItems: 'center',
  },
  centerPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  colRight: {
    alignItems: 'flex-end',
    width: '34%',
  },
  rightValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  dailyPctText: {
    fontSize: 10,
    fontWeight: '700',
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
