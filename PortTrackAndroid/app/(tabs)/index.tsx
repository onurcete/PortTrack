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
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { haptic } from '../../utils/haptics';
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
    haptic.medium();
    setRefreshing(true);
    try {
      await api.post('/prices/refresh');
    } catch {}
    await fetchPortfolio();
    haptic.success();
  }, [fetchPortfolio]);

  const toggleSection = (type: string) => {
    haptic.selection();
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

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

  const isTRY = currency === 'TRY';
  const totalValue = isTRY ? (portfolio?.totalValueTRY ?? 0) : (portfolio?.totalValueUSD ?? 0);
  const pReturns = portfolio?.periodReturns;

  // 2x2 Grid için 4 Ana Dönemsel Getiri
  const gridPeriods = [
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
      key: 'ytd',
      label: 'Yıl Başı (YTD)',
      pct: isTRY ? pReturns?.ytdTRY : pReturns?.ytdUSD,
      amt: isTRY ? pReturns?.ytdAmtTRY : pReturns?.ytdAmtUSD,
    },
    {
      key: '1y',
      label: 'Son 1 Yıl',
      pct: isTRY ? pReturns?.oneYearTRY : pReturns?.oneYearUSD,
      amt: isTRY ? pReturns?.oneYearAmtTRY : pReturns?.oneYearAmtUSD,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER BAR (Tam Genişlik) */}
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
          {/* 2. FULL WIDTH HERO BÖLÜMÜ (TOPLAM DEĞER + 2x2 DÖNEMSEL GETİRİ) */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            {/* Toplam Portföy Değeri */}
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
                activeOpacity={0.7}
              >
                <Text style={[styles.heroLabel, { color: theme.text.muted }]}>
                  TOPLAM PORTFÖY DEĞERİ ({currency})
                </Text>
                <Text style={[styles.heroMainValue, { color: theme.text.primary }]}>
                  {showValues ? formatCurrency(totalValue, currency, 0) : `•••••••• ${currency === 'TRY' ? '₺' : '$'}`}
                </Text>
              </TouchableOpacity>
              {portfolio?.lastUpdated && (
                <Text style={[styles.heroDate, { color: theme.text.muted }]}>
                  Son: {new Date(portfolio.lastUpdated).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>

            {/* 2x2 Dönemsel Getiriler Izgarası (Full Width) */}
            <View style={[styles.heroGridContainer, { borderTopColor: theme.borderSubtle }]}>
              <View style={styles.heroGridRow}>
                {gridPeriods.slice(0, 2).map((item) => {
                  const hasPct = item.pct !== null && item.pct !== undefined;
                  const isPos = (item.pct ?? 0) >= 0;
                  const color = hasPct ? (isPos ? theme.profit.main : theme.loss.main) : theme.text.muted;
                  const bg = hasPct ? (isPos ? theme.profit.soft : theme.loss.soft) : theme.surfaceMuted;

                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.heroGridCell,
                        {
                          backgroundColor: theme.surfaceMuted,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.gridCellTop}>
                        <Text style={[styles.gridCellLabel, { color: theme.text.muted }]}>
                          {item.label}
                        </Text>
                        <View style={[styles.gridBadge, { backgroundColor: bg }]}>
                          {hasPct && (
                            isPos ? (
                              <TrendingUp size={10} color={color} style={{ marginRight: 2 }} />
                            ) : (
                              <TrendingDown size={10} color={color} style={{ marginRight: 2 }} />
                            )
                          )}
                          <Text style={[styles.gridPctText, { color }]}>
                            {hasPct && showValues ? formatPercent(item.pct) : (hasPct ? '••••' : '%0,00')}
                          </Text>
                        </View>
                      </View>

                      {item.amt !== null && item.amt !== undefined && (
                        <Text style={[styles.gridAmtText, { color: theme.text.primary }]}>
                          {showValues ? formatCurrency(item.amt, currency, 0) : '••••'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.heroGridRow}>
                {gridPeriods.slice(2, 4).map((item) => {
                  const hasPct = item.pct !== null && item.pct !== undefined;
                  const isPos = (item.pct ?? 0) >= 0;
                  const color = hasPct ? (isPos ? theme.profit.main : theme.loss.main) : theme.text.muted;
                  const bg = hasPct ? (isPos ? theme.profit.soft : theme.loss.soft) : theme.surfaceMuted;

                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.heroGridCell,
                        {
                          backgroundColor: theme.surfaceMuted,
                          borderColor: theme.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.gridCellTop}>
                        <Text style={[styles.gridCellLabel, { color: theme.text.muted }]}>
                          {item.label}
                        </Text>
                        <View style={[styles.gridBadge, { backgroundColor: bg }]}>
                          {hasPct && (
                            isPos ? (
                              <TrendingUp size={10} color={color} style={{ marginRight: 2 }} />
                            ) : (
                              <TrendingDown size={10} color={color} style={{ marginRight: 2 }} />
                            )
                          )}
                          <Text style={[styles.gridPctText, { color }]}>
                            {hasPct && showValues ? formatPercent(item.pct) : (hasPct ? '••••' : '%0,00')}
                          </Text>
                        </View>
                      </View>

                      {item.amt !== null && item.amt !== undefined && (
                        <Text style={[styles.gridAmtText, { color: theme.text.primary }]}>
                          {showValues ? formatCurrency(item.amt, currency, 0) : '••••'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 3. VARLIK DAĞILIMI (Tam Genişlik) */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={15} color={theme.brand.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Varlık Dağılımı
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: theme.text.muted }]}>
                {portfolio?.positions?.length || 0} Varlık
              </Text>
            </View>

            {portfolio?.assetBreakdown && portfolio.assetBreakdown.length > 0 && (
              <View style={styles.allocationBody}>
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
                          height: 8,
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

          {/* 4. AÇIK POZİSYONLAR TABLOSU (Tam Genişlik, Ekranla Bütün) */}
          <View style={styles.positionsSection}>
            <View style={styles.positionsSectionHeader}>
              <Text style={[styles.positionsTitleText, { color: theme.text.primary }]}>
                Açık Pozisyonlar
              </Text>
            </View>

            {SECTION_ORDER.map((section) => {
              const items = positionsByType[section.type] || [];
              if (items.length === 0) return null;

              const isCollapsed = collapsedSections[section.type];
              const sectionTotalValue = items.reduce(
                (acc, p) => acc + (isTRY ? p.currentValueTRY : (p.currentValueUSD ?? (p.currentValueTRY / (portfolio?.currentUsdTry || 1)))),
                0
              );
              const badge = getAssetTypeBadgeColor(section.type);

              return (
                <View
                  key={section.type}
                  style={[
                    styles.categoryBlockFull,
                    {
                      backgroundColor: theme.surface,
                      borderBottomColor: theme.border,
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
                        {showValues ? formatCurrency(sectionTotalValue, currency, 0) : '••••••'}
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

                  {/* Kategori İçi Tablo Başlıkları & Varlık Satırları */}
                  {!isCollapsed && (
                    <View style={styles.itemsList}>
                      {/* Tablo Alt Başlığı */}
                      <View style={[styles.tableSubHeader, { backgroundColor: theme.surfaceMuted }]}>
                        <Text style={[styles.thText, { width: '28%', color: theme.text.muted }]}>
                          Varlık / Adet
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '22%', textAlign: 'center', color: theme.text.muted },
                          ]}
                        >
                          Fiyat
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '20%', textAlign: 'center', color: theme.text.muted },
                          ]}
                        >
                          Günlük %
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '30%', textAlign: 'right', color: theme.text.muted },
                          ]}
                        >
                          Tutar / Toplam K/Z
                        </Text>
                      </View>

                      {/* Varlık Satırları */}
                      {items.map((pos, pIdx) => {
                        const dailyPct = pos.dailyChangePct ?? 0;
                        const isDailyPos = dailyPct >= 0;
                        const dailyColor = isDailyPos ? theme.profit.main : theme.loss.main;

                        const isTotalPos = pos.profitRate >= 0;
                        const totalProfitColor = isTotalPos ? theme.profit.main : theme.loss.main;

                        const posPrice = isTRY ? pos.currentPriceTRY : (pos.currentPriceUSD ?? (pos.currentPriceTRY / (portfolio?.currentUsdTry || 1)));
                        const posValue = isTRY ? pos.currentValueTRY : (pos.currentValueUSD ?? (pos.currentValueTRY / (portfolio?.currentUsdTry || 1)));

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
                            {/* Kolon 1: Üstte Sembol, Altta Adet */}
                            <View style={styles.colAsset}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
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
                                {formatQuantity(pos.quantity)} Adet
                              </Text>
                            </View>

                            {/* Kolon 2: Güncel Birim Fiyat */}
                            <View style={styles.colPrice}>
                              <Text style={[styles.centerPrice, { color: theme.text.secondary }]}>
                                {formatCurrency(posPrice, currency)}
                              </Text>
                            </View>

                            {/* Kolon 3: Günlük % Değişimi */}
                            <View style={styles.colDaily}>
                              <View
                                style={[
                                  styles.dailyPill,
                                  { backgroundColor: isDailyPos ? theme.profit.soft : theme.loss.soft },
                                ]}
                              >
                                {isDailyPos ? (
                                  <TrendingUp size={9} color={dailyColor} />
                                ) : (
                                  <TrendingDown size={9} color={dailyColor} />
                                )}
                                <Text style={[styles.dailyPctText, { color: dailyColor }]}>
                                  {showValues ? formatPercent(dailyPct) : '••••'}
                                </Text>
                              </View>
                            </View>

                            {/* Kolon 4: Üstte Total Tutar, Altta Total % K/Z */}
                            <View style={styles.colTotal}>
                              <Text style={[styles.rightValue, { color: theme.text.primary }]}>
                                {showValues ? formatCurrency(posValue, currency, 0) : '••••••'}
                              </Text>
                              <Text style={[styles.totalProfitPctText, { color: totalProfitColor }]}>
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
    paddingBottom: 40,
  },
  fullWidthSection: {
    borderBottomWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroDate: {
    fontSize: 10,
    marginTop: 2,
  },
  heroMainValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroGridContainer: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  heroGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroGridCell: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  gridCellTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridCellLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  gridBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  gridPctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  gridAmtText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  allocationBody: {
    gap: 8,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
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
  positionsSection: {
    gap: 0,
  },
  positionsSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  positionsTitleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryBlockFull: {
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
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
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  thText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  singleRowAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  colAsset: {
    width: '28%',
  },
  symbolText: {
    fontSize: 13,
    fontWeight: '800',
  },
  qtyText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  currencyTag: {
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  currencyTagText: {
    fontSize: 8,
    fontWeight: '700',
  },
  colPrice: {
    width: '22%',
    alignItems: 'center',
  },
  centerPrice: {
    fontSize: 11,
    fontWeight: '600',
  },
  colDaily: {
    width: '20%',
    alignItems: 'center',
  },
  dailyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 1.5,
  },
  dailyPctText: {
    fontSize: 10,
    fontWeight: '700',
  },
  colTotal: {
    alignItems: 'flex-end',
    width: '30%',
  },
  rightValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  totalProfitPctText: {
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
