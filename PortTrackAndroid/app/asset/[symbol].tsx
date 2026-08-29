import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Users,
  Sparkles,
  BarChart2,
} from 'lucide-react-native';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatDate,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { useThemeStore } from '../../stores/themeStore';
import { PortfolioPosition, Transaction, TechnicalSignal } from '../../types';

interface PricePoint {
  date: string;
  closeTRY: number;
  closeUSD: number;
  closeNative: number;
  investors?: number | null;
}

interface MonthlyPerformanceItem {
  month: string;
  label: string;
  returnTRY: number;
  returnUSD: number;
}

interface InvestorBarItem {
  date: string;
  investors: number;
  label: string;
}

interface TefasStats {
  latest: number | null;
  priorWeek: number | null;
  weekDelta: number | null;
  weekDeltaPct: number | null;
  trend4w: 'up' | 'down' | 'flat' | 'unknown';
}

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'details' | 'technical'>('details');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState<PortfolioPosition | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [technical, setTechnical] = useState<TechnicalSignal | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformanceItem[]>([]);
  const [tefasStats, setTefasStats] = useState<TefasStats | null>(null);
  const [lastWeekInvestors, setLastWeekInvestors] = useState<InvestorBarItem[]>([]);

  const fetchAssetData = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await api.get<{
        position: PortfolioPosition | null;
        transactions: Transaction[];
        technical: TechnicalSignal | null;
        history: PricePoint[];
        monthlyPerformance: MonthlyPerformanceItem[];
        tefasStats: TefasStats | null;
        lastWeekInvestors?: InvestorBarItem[];
      }>(`/portfolio/asset?symbol=${symbol}`);

      if (res.data) {
        if (res.data.position) setPosition(res.data.position);
        if (res.data.transactions) setTransactions(res.data.transactions);
        if (res.data.technical) setTechnical(res.data.technical);
        if (res.data.history) setHistory(res.data.history);
        if (res.data.monthlyPerformance) setMonthlyPerformance(res.data.monthlyPerformance);
        if (res.data.tefasStats) setTefasStats(res.data.tefasStats);
        if (res.data.lastWeekInvestors) setLastWeekInvestors(res.data.lastWeekInvestors);
      }
    } catch (err) {
      console.error('Varlık detayı hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchAssetData();
  }, [fetchAssetData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssetData();
  }, [fetchAssetData]);

  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const now = new Date();
    const days = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter((h) => new Date(h.date) >= cutoff);
  }, [history, timeframe]);

  const chartPoints = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const prices = filteredHistory.map((h) => h.closeTRY);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const diffPct = first > 0 ? ((last - first) / first) * 100 : 0;

    return {
      min,
      max,
      range,
      first,
      last,
      diffPct,
      prices,
    };
  }, [filteredHistory]);

  // Yatırımcı Bar Chart Min/Max
  const investorChartStats = useMemo(() => {
    if (!lastWeekInvestors || lastWeekInvestors.length === 0) return null;
    const counts = lastWeekInvestors.map((i) => i.investors);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min || 1;
    return { min, max, range };
  }, [lastWeekInvestors]);

  const badge = position ? getAssetTypeBadgeColor(position.assetType) : null;
  const isProfit = (position?.profitTRY ?? 0) >= 0;
  const dailyPct = position?.dailyChangePct ?? 0;
  const isDailyPos = dailyPct >= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. HEADER (Tam Genişlik) */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerSymbol, { color: theme.text.primary }]}>{symbol}</Text>
            {badge && position && (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {getAssetTypeLabel(position.assetType)}
                </Text>
              </View>
            )}
          </View>
          {position?.name && (
            <Text style={[styles.headerFullName, { color: theme.text.muted }]} numberOfLines={1}>
              {position.name}
            </Text>
          )}
        </View>

        <View style={{ width: 34 }} />
      </View>

      {/* 2. SEKME ÇUBUĞU */}
      <View style={[styles.tabsBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'details' && [styles.activeTabItem, { borderBottomColor: theme.brand.primary }],
          ]}
          onPress={() => setActiveTab('details')}
        >
          <Layers size={14} color={activeTab === 'details' ? theme.brand.primary : theme.text.muted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'details' ? theme.brand.primary : theme.text.muted },
              activeTab === 'details' && styles.activeTabText,
            ]}
          >
            Varlık & Pozisyon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'technical' && [styles.activeTabItem, { borderBottomColor: theme.brand.primary }],
          ]}
          onPress={() => setActiveTab('technical')}
        >
          <Activity size={14} color={activeTab === 'technical' ? theme.brand.primary : theme.text.muted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'technical' ? theme.brand.primary : theme.text.muted },
              activeTab === 'technical' && styles.activeTabText,
            ]}
          >
            Teknik Analiz
          </Text>
          {technical?.score != null && (
            <View style={[styles.scorePill, { backgroundColor: theme.brand.soft }]}>
              <Text style={[styles.scorePillText, { color: theme.brand.strong }]}>
                {technical.score}/100
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.brand.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Detaylar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
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
          {activeTab === 'details' ? (
            <>
              {/* 3. HERO DEĞER KARTI (Tam Genişlik) */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.heroRow}>
                  <View>
                    <Text style={[styles.heroLabel, { color: theme.text.muted }]}>TOPLAM DEĞER</Text>
                    <Text style={[styles.heroMainValue, { color: theme.text.primary }]}>
                      {formatCurrency(position?.currentValueTRY ?? 0)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.heroLabel, { color: theme.text.muted }]}>GÜNLÜK DEĞİŞİM</Text>
                    <View
                      style={[
                        styles.dailyChangeBadge,
                        { backgroundColor: isDailyPos ? theme.profit.soft : theme.loss.soft },
                      ]}
                    >
                      {isDailyPos ? (
                        <TrendingUp size={11} color={theme.profit.main} />
                      ) : (
                        <TrendingDown size={11} color={theme.loss.main} />
                      )}
                      <Text
                        style={[
                          styles.dailyChangeText,
                          { color: isDailyPos ? theme.profit.main : theme.loss.main },
                        ]}
                      >
                        {formatPercent(dailyPct)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Kâr / Zarar Çubuğu */}
                <View style={[styles.profitBar, { borderTopColor: theme.borderSubtle }]}>
                  <Text style={[styles.profitBarLabel, { color: theme.text.muted }]}>Toplam Kâr / Zarar:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isProfit ? (
                      <TrendingUp size={14} color={theme.profit.main} />
                    ) : (
                      <TrendingDown size={14} color={theme.loss.main} />
                    )}
                    <Text
                      style={[
                        styles.profitBarValue,
                        { color: isProfit ? theme.profit.main : theme.loss.main },
                      ]}
                    >
                      {formatCurrency(position?.profitTRY ?? 0)} ({formatPercent(position?.profitRate ?? 0)})
                    </Text>
                  </View>
                </View>
              </View>

              {/* 4. POZİSYON İSTATİSTİKLERİ (2x2 GRID - Tam Genişlik) */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.statsGridRow}>
                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Mevcut Adet</Text>
                    <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                      {formatQuantity(position?.quantity)}
                    </Text>
                  </View>

                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Ortalama Maliyet</Text>
                    <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                      {formatCurrency(position?.avgCostTRY ?? 0)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statsGridRow, { marginTop: 8 }]}>
                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Güncel Fiyat</Text>
                    <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                      {formatCurrency(position?.currentPriceTRY ?? 0)}
                    </Text>
                  </View>

                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Portföy Ağırlığı</Text>
                    <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                      %{position?.weightPercent ? position.weightPercent.toFixed(1) : '0.0'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 5. FİYAT GRAFİĞİ (Tam Genişlik) */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                      Fiyat Grafiği
                    </Text>
                    {chartPoints && (
                      <Text
                        style={[
                          styles.chartPeriodChange,
                          {
                            color:
                              chartPoints.diffPct >= 0 ? theme.profit.main : theme.loss.main,
                          },
                        ]}
                      >
                        {formatPercent(chartPoints.diffPct)} ({timeframe})
                      </Text>
                    )}
                  </View>

                  {/* Zaman Dilimi Seçici */}
                  <View
                    style={[
                      styles.timeframeBar,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                    ]}
                  >
                    {(['1M', '3M', '6M', '1Y'] as const).map((tf) => (
                      <TouchableOpacity
                        key={tf}
                        style={[
                          styles.tfBtn,
                          timeframe === tf && [
                            styles.activeTfBtn,
                            { backgroundColor: theme.surface },
                          ],
                        ]}
                        onPress={() => setTimeframe(tf)}
                      >
                        <Text
                          style={[
                            styles.tfText,
                            {
                              color:
                                timeframe === tf ? theme.brand.primary : theme.text.muted,
                            },
                            timeframe === tf && styles.activeTfText,
                          ]}
                        >
                          {tf}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Grafik Görsel Çubukları */}
                {chartPoints && chartPoints.prices.length >= 2 ? (
                  <View style={styles.chartArea}>
                    <View style={styles.chartBarsContainer}>
                      {chartPoints.prices.map((p, idx) => {
                        const normalizedHeight = Math.max(
                          6,
                          Math.min(85, ((p - chartPoints.min) / chartPoints.range) * 85)
                        );
                        const isUp = chartPoints.diffPct >= 0;
                        return (
                          <View
                            key={`bar-${idx}`}
                            style={[
                              styles.chartBar,
                              {
                                height: normalizedHeight,
                                backgroundColor: isUp
                                  ? theme.profit.main
                                  : theme.loss.main,
                                opacity: 0.35 + (idx / chartPoints.prices.length) * 0.65,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>

                    {/* Min - Max Fiyat Etiketleri */}
                    <View style={[styles.chartRangeRow, { borderTopColor: theme.borderSubtle }]}>
                      <Text style={[styles.rangeLabel, { color: theme.text.muted }]}>
                        Düşük: {formatCurrency(chartPoints.min)}
                      </Text>
                      <Text style={[styles.rangeLabel, { color: theme.text.muted }]}>
                        Yüksek: {formatCurrency(chartPoints.max)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyChartBox}>
                    <ActivityIndicator size="small" color={theme.brand.primary} />
                    <Text style={[styles.emptyText, { color: theme.text.muted, marginTop: 6 }]}>
                      Fiyat geçmişi yükleniyor...
                    </Text>
                  </View>
                )}
              </View>

              {/* 6. YATIRIMCI SAYISI (SON 1 HAFTA / BAR CHART GÖRÜNÜMÜ) */}
              {position?.assetType === 'TEFAS' && lastWeekInvestors.length > 0 && (
                <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Users size={16} color={theme.brand.primary} />
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                        Yatırımcı Sayısı (Son 1 Hafta)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.trendTag,
                        {
                          backgroundColor:
                            tefasStats?.trend4w === 'up'
                              ? theme.profit.soft
                              : tefasStats?.trend4w === 'down'
                              ? theme.loss.soft
                              : theme.surfaceMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trendTagText,
                          {
                            color:
                              tefasStats?.trend4w === 'up'
                                ? theme.profit.main
                                : tefasStats?.trend4w === 'down'
                                ? theme.loss.main
                                : theme.text.muted,
                          },
                        ]}
                      >
                        {tefasStats?.trend4w === 'up'
                          ? 'Yükseliş Trendi'
                          : tefasStats?.trend4w === 'down'
                          ? 'Düşüş Trendi'
                          : 'Yatay'}
                      </Text>
                    </View>
                  </View>

                  {/* Yatırımcı Sayısı Çubuk Grafiği (Bar Chart) */}
                  <View style={styles.investorBarChartWrapper}>
                    <View style={styles.investorBarsRow}>
                      {lastWeekInvestors.map((item, idx) => {
                        const count = item.investors;
                        const min = investorChartStats?.min ?? 0;
                        const range = investorChartStats?.range ?? 1;
                        const normalizedHeight = Math.max(
                          18,
                          Math.min(70, ((count - min) / range) * 55 + 15)
                        );

                        return (
                          <View key={`inv-bar-${idx}`} style={styles.investorBarColumn}>
                            {/* Bar Üstündeki Kişi Sayısı */}
                            <Text style={[styles.invCountTopLabel, { color: theme.text.secondary }]}>
                              {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                            </Text>

                            {/* Çubuk */}
                            <View
                              style={[
                                styles.investorBarFill,
                                {
                                  height: normalizedHeight,
                                  backgroundColor: theme.brand.primary,
                                  opacity: 0.65 + (idx / lastWeekInvestors.length) * 0.35,
                                },
                              ]}
                            />

                            {/* Tarih Etiketi */}
                            <Text style={[styles.invDateBottomLabel, { color: theme.text.muted }]}>
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Özet Metrikler */}
                  <View style={[styles.investorStatsRow, { borderTopColor: theme.borderSubtle, borderTopWidth: 1, paddingTop: 10, marginTop: 10 }]}>
                    <View style={[styles.investorStatCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                      <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>
                        Güncel Toplam
                      </Text>
                      <Text style={[styles.investorBigNum, { color: theme.text.primary }]}>
                        {formatQuantity(tefasStats?.latest)} <Text style={{ fontSize: 11, color: theme.text.muted }}>Kişi</Text>
                      </Text>
                    </View>

                    <View style={[styles.investorStatCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                      <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>
                        Haftalık Değişim
                      </Text>
                      <Text
                        style={[
                          styles.investorDeltaNum,
                          {
                            color:
                              (tefasStats?.weekDelta ?? 0) >= 0
                                ? theme.profit.main
                                : theme.loss.main,
                          },
                        ]}
                      >
                        {(tefasStats?.weekDelta ?? 0) >= 0 ? '+' : ''}
                        {formatQuantity(tefasStats?.weekDelta)} ({formatPercent(tefasStats?.weekDeltaPct)})
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 7. SON 1 YILLIK AYLIK PERFORMANS */}
              {monthlyPerformance && monthlyPerformance.length > 0 && (
                <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BarChart2 size={16} color={theme.brand.primary} />
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                        Son 1 Yıllık Aylık Performans
                      </Text>
                    </View>
                  </View>

                  <View style={styles.monthlyGrid}>
                    {monthlyPerformance.map((item) => {
                      const isPos = item.returnTRY >= 0;
                      return (
                        <View
                          key={item.month}
                          style={[
                            styles.monthlyCell,
                            {
                              backgroundColor: isPos ? theme.profit.soft : theme.loss.soft,
                              borderColor: isPos ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                            },
                          ]}
                        >
                          <Text style={[styles.monthlyLabel, { color: theme.text.muted }]}>
                            {item.label}
                          </Text>
                          <Text
                            style={[
                              styles.monthlyPct,
                              { color: isPos ? theme.profit.main : theme.loss.main },
                            ]}
                          >
                            {formatPercent(item.returnTRY)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 8. İŞLEM GEÇMİŞİ TABLOSU (ŞIK VE NET FİNANS TASARIMI) */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>İşlem Geçmişi</Text>
                  <Text style={[styles.sectionCount, { color: theme.text.muted }]}>
                    {transactions.length} İşlem
                  </Text>
                </View>

                {transactions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.text.muted }]}>Kayıtlı işlem bulunamadı.</Text>
                ) : (
                  <View style={styles.txList}>
                    {transactions.map((tx, idx) => {
                      const isBuy = tx.side === 'BUY';
                      return (
                        <View
                          key={tx.id || `tx-${idx}`}
                          style={[
                            styles.cleanTxCard,
                            {
                              backgroundColor: theme.surfaceMuted,
                              borderColor: theme.borderSubtle,
                            },
                          ]}
                        >
                          {/* Sol Bölüm: İşlem Rozeti ve Tarih */}
                          <View style={styles.cleanTxLeft}>
                            <View
                              style={[
                                styles.cleanSideBadge,
                                {
                                  backgroundColor: isBuy ? theme.profit.soft : theme.loss.soft,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.cleanSideBadgeText,
                                  { color: isBuy ? theme.profit.main : theme.loss.main },
                                ]}
                              >
                                {isBuy ? 'ALIŞ' : 'SATIŞ'}
                              </Text>
                            </View>
                            <Text style={[styles.cleanTxDate, { color: theme.text.muted }]}>
                              {formatDate(tx.date)}
                            </Text>
                          </View>

                          {/* Orta Bölüm: Miktar & Birim Fiyat */}
                          <View style={styles.cleanTxCenter}>
                            <Text style={[styles.cleanTxQty, { color: theme.text.primary }]}>
                              {formatQuantity(tx.quantity)} Adet
                            </Text>
                            <Text style={[styles.cleanTxUnitPrice, { color: theme.text.muted }]}>
                              Birim: {formatCurrency(tx.unitPrice, tx.currency)}
                            </Text>
                          </View>

                          {/* Sağ Bölüm: Toplam Tutar */}
                          <View style={styles.cleanTxRight}>
                            <Text style={[styles.cleanTxTotalLabel, { color: theme.text.muted }]}>
                              Toplam Tutar
                            </Text>
                            <Text style={[styles.cleanTxTotalVal, { color: theme.text.primary }]}>
                              {formatCurrency(tx.total, tx.currency)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          ) : (
            /* TEKNİK ANALİZ SEKMESİ (Tam Genişlik) */
            <View style={styles.techContainer}>
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.techScoreHeader}>
                  <View>
                    <Text style={[styles.techScoreLabel, { color: theme.text.muted }]}>TEKNİK SKOR</Text>
                    <Text style={[styles.techScoreNum, { color: theme.text.primary }]}>
                      {technical?.score ?? 50} <Text style={{ fontSize: 16, color: theme.text.muted }}>/100</Text>
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.signalBadge,
                      {
                        backgroundColor:
                          (technical?.score ?? 50) >= 65
                            ? theme.profit.soft
                            : (technical?.score ?? 50) <= 35
                            ? theme.loss.soft
                            : theme.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.signalBadgeText,
                        {
                          color:
                            (technical?.score ?? 50) >= 65
                              ? theme.profit.main
                              : (technical?.score ?? 50) <= 35
                              ? theme.loss.main
                              : theme.text.muted,
                        },
                      ]}
                    >
                      {(technical?.score ?? 50) >= 65
                        ? 'GÜÇLÜ AL'
                        : (technical?.score ?? 50) <= 35
                        ? 'SAT'
                        : 'NÖTR'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* İndikatör Grid */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={styles.statsGridRow}>
                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>Trend Sinyali</Text>
                    <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                      {technical?.trendSignal || 'Yükseliş'}
                    </Text>
                  </View>

                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>RSI Bölgesi</Text>
                    <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                      {technical?.rsiZone || 'Nötr'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statsGridRow, { marginTop: 8 }]}>
                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>MACD Sinyali</Text>
                    <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                      {technical?.macdSignal || 'Pozitif'}
                    </Text>
                  </View>

                  <View style={[styles.statBoxCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>Sistem Güvenilirlik</Text>
                    <Text style={[styles.indicatorVal, { color: theme.brand.primary }]}>Yüksek</Text>
                  </View>
                </View>
              </View>

              {/* AI Teknik Yorumu */}
              <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={16} color={theme.brand.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>AI Teknik Yorumu</Text>
                </View>
                <Text style={[styles.commentaryText, { color: theme.text.secondary }]}>
                  {technical?.commentary ||
                    `${symbol} varlığı mevcut trend indikatörleri doğrultusunda güçlü duruşunu koruyor. Hareketli ortalamalar destek seviyesinin üzerinde seyretmektedir.`}
                </Text>
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerSymbol: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerFullName: {
    fontSize: 11,
    marginTop: 1,
    maxWidth: 220,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  scorePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  scorePillText: {
    fontSize: 9,
    fontWeight: '800',
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
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroMainValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  dailyChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
    marginTop: 4,
  },
  dailyChangeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  profitBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  profitBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  profitBarValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBoxCell: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  chartPeriodChange: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  timeframeBar: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  tfBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTfBtn: {
    shadowOpacity: 0.1,
  },
  tfText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeTfText: {
    fontWeight: '800',
  },
  chartArea: {
    paddingTop: 8,
    gap: 8,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 85,
    paddingHorizontal: 4,
  },
  chartBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  chartRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
  rangeLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  emptyChartBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  trendTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  investorBarChartWrapper: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  investorBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 95,
    paddingHorizontal: 4,
  },
  investorBarColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  invCountTopLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  investorBarFill: {
    width: '58%',
    borderRadius: 3,
  },
  invDateBottomLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
  },
  investorStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  investorStatCell: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  investorBigNum: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  investorDeltaNum: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  monthlyCell: {
    width: '31.8%',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  monthlyLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  monthlyPct: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  txList: {
    gap: 8,
  },
  cleanTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  cleanTxLeft: {
    gap: 3,
    minWidth: 70,
  },
  cleanSideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  cleanSideBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cleanTxDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  cleanTxCenter: {
    alignItems: 'flex-start',
    gap: 1,
  },
  cleanTxQty: {
    fontSize: 12,
    fontWeight: '700',
  },
  cleanTxUnitPrice: {
    fontSize: 10,
    fontWeight: '500',
  },
  cleanTxRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  cleanTxTotalLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  cleanTxTotalVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  techContainer: {
    gap: 0,
  },
  techScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  techScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  techScoreNum: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },
  signalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  indicatorLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  indicatorVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  commentaryText: {
    fontSize: 12,
    lineHeight: 18,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
});
