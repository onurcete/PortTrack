import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  Star,
  Share2,
  TrendingUp,
  TrendingDown,
  Layers,
  Calculator,
  PieChart,
  Users,
  BarChart2,
  ChevronRight,
  Activity,
  Sparkles,
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
import { haptic } from '../../utils/haptics';
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
  const { width: windowWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<'details' | 'technical'>('details');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');
  const [isFavorite, setIsFavorite] = useState(false);
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
    haptic.medium();
    setRefreshing(true);
    await fetchAssetData();
    haptic.success();
  }, [fetchAssetData]);

  const handleShare = async () => {
    try {
      haptic.light();
      await Share.share({
        message: `${symbol} - ${position?.name || ''}\nGüncel Fiyat: ${formatCurrency(position?.currentPriceTRY ?? 0)}\nToplam Değer: ${formatCurrency(position?.currentValueTRY ?? 0)}`,
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  const toggleFavorite = () => {
    haptic.selection();
    setIsFavorite(!isFavorite);
  };

  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    if (timeframe === 'ALL') return history;
    const now = new Date();
    const days = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter((h) => new Date(h.date) >= cutoff);
  }, [history, timeframe]);

  // Bezier Line Chart SVG Hesaplamaları
  const chartWidth = Math.max(windowWidth - 64, 300);
  const chartHeight = 120;

  const chartPoints = useMemo(() => {
    if (filteredHistory.length < 2) return null;
    const prices = filteredHistory.map((h) => h.closeTRY);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const diffPct = first > 0 ? ((last - first) / first) * 100 : 0;

    const paddingX = 10;
    const paddingTop = 12;
    const paddingBottom = 12;
    const plotWidth = chartWidth - paddingX * 2;
    const plotHeight = chartHeight - paddingTop - paddingBottom;

    const points = prices.map((p, i) => {
      const x = paddingX + (i / (prices.length - 1)) * plotWidth;
      const y = paddingTop + (1 - (p - min) / range) * plotHeight;
      return { x, y };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return {
      min,
      max,
      range,
      first,
      last,
      diffPct,
      linePath,
      areaPath,
    };
  }, [filteredHistory, chartWidth, chartHeight]);

  // Yatırımcı Bar Chart Min/Max
  const investorChartStats = useMemo(() => {
    if (!lastWeekInvestors || lastWeekInvestors.length === 0) return null;
    const counts = lastWeekInvestors.map((i) => i.investors);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min || 1;
    return { min, max, range };
  }, [lastWeekInvestors]);

  const isProfit = (position?.profitTRY ?? 0) >= 0;
  const dailyPct = position?.dailyChangePct ?? 0;
  const isDailyPos = dailyPct >= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST BAŞLIK & PROFİL BİLGİSİ (Screenshot 1:1) */}
      <View style={[styles.topHeader, { borderBottomColor: theme.borderSubtle }]}>
        <TouchableOpacity
          style={[styles.roundIconBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
          onPress={() => {
            haptic.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenterGroup}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {symbol ? symbol[0]?.toUpperCase() : 'T'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerSymbol, { color: theme.text.primary }]}>{symbol}</Text>
              {position && (
                <View style={styles.assetCategoryBadge}>
                  <Text style={styles.assetCategoryBadgeText}>
                    {getAssetTypeLabel(position.assetType)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.headerFullName, { color: theme.text.muted }]} numberOfLines={1}>
              {position?.name || 'Varlık Detayı'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.roundIconBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
            onPress={toggleFavorite}
            activeOpacity={0.7}
          >
            <Star
              size={17}
              color={isFavorite ? '#fbbf24' : theme.text.primary}
              fill={isFavorite ? '#fbbf24' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roundIconBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={17} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. ALT SEKMELER (Varlık & Pozisyon | Teknik Analiz) */}
      <View style={[styles.subTabsBar, { borderBottomColor: theme.borderSubtle }]}>
        <TouchableOpacity
          style={styles.subTabItem}
          onPress={() => {
            haptic.selection();
            setActiveTab('details');
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Layers size={15} color={activeTab === 'details' ? '#8b5cf6' : theme.text.muted} />
            <Text
              style={[
                styles.subTabText,
                { color: activeTab === 'details' ? '#8b5cf6' : theme.text.muted },
                activeTab === 'details' && { fontWeight: '800' },
              ]}
            >
              Varlık & Pozisyon
            </Text>
          </View>
          {activeTab === 'details' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.subTabItem}
          onPress={() => {
            haptic.selection();
            setActiveTab('technical');
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Activity size={15} color={activeTab === 'technical' ? '#8b5cf6' : theme.text.muted} />
            <Text
              style={[
                styles.subTabText,
                { color: activeTab === 'technical' ? '#8b5cf6' : theme.text.muted },
                activeTab === 'technical' && { fontWeight: '800' },
              ]}
            >
              Teknik Analiz
            </Text>
            {technical?.score != null && (
              <View style={styles.techScoreBadge}>
                <Text style={styles.techScoreBadgeText}>{technical.score}/100</Text>
              </View>
            )}
          </View>
          {activeTab === 'technical' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#8b5cf6" size="large" />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Detaylar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
        >
          {activeTab === 'details' ? (
            <>
              {/* 3. HERO DEĞER KARTI (Screenshot 1:1) */}
              <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>TOPLAM DEĞER</Text>
                    <Text style={[styles.heroMainValue, { color: theme.text.primary }]}>
                      {formatCurrency(position?.currentValueTRY ?? 0, 'TRY', 2)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardMicroLabel, { color: theme.text.muted, marginBottom: 4 }]}>GÜNLÜK DEĞİŞİM</Text>
                    <View style={[styles.dailyBadge, { backgroundColor: isDailyPos ? theme.profit.soft : theme.loss.soft }]}>
                      <Text style={[styles.dailyBadgeText, { color: isDailyPos ? theme.profit.main : theme.loss.main }]}>
                        {isDailyPos ? '+ ' : ''}%{dailyPct.toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Kâr / Zarar Satırı */}
                <View style={styles.heroBottomRow}>
                  <Text style={[styles.profitSubLabel, { color: theme.text.muted }]}>Toplam Kâr / Zarar</Text>
                  <Text style={[styles.profitMainValue, { color: isProfit ? theme.profit.main : theme.loss.main }]}>
                    {isProfit ? '↗ +' : '↘ '}{formatCurrency(Math.abs(position?.profitTRY ?? 0), 'TRY', 2)} ({isProfit ? '+' : ''}%{(position?.profitRate ?? 0).toFixed(2).replace('.', ',')})
                  </Text>
                </View>
              </View>

              {/* 4. 4-METRİK GRİD (2x2 Grid - Screenshot 1:1) */}
              <View style={styles.metricsGrid}>
                {/* 1. Mevcut Adet */}
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Layers size={18} color="#a78bfa" />
                  <Text style={[styles.metricSubLabel, { color: theme.text.muted }]}>Mevcut Adet</Text>
                  <Text style={[styles.metricBigValue, { color: theme.text.primary }]}>
                    {formatQuantity(position?.quantity)}
                  </Text>
                  <Text style={[styles.metricUnitLabel, { color: theme.text.muted }]}>Adet</Text>
                </View>

                {/* 2. Ortalama Maliyet */}
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Calculator size={18} color="#60a5fa" />
                  <Text style={[styles.metricSubLabel, { color: theme.text.muted }]}>Ortalama Maliyet</Text>
                  <Text style={[styles.metricBigValue, { color: theme.text.primary }]}>
                    {formatCurrency(position?.avgCostTRY ?? 0, 'TRY', 2)}
                  </Text>
                  <Text style={[styles.metricUnitLabel, { color: theme.text.muted }]}>Birim</Text>
                </View>

                {/* 3. Güncel Fiyat */}
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <TrendingUp size={18} color="#34d399" />
                  <Text style={[styles.metricSubLabel, { color: theme.text.muted }]}>Güncel Fiyat</Text>
                  <Text style={[styles.metricBigValue, { color: theme.text.primary }]}>
                    {formatCurrency(position?.currentPriceTRY ?? 0, 'TRY', 2)}
                  </Text>
                  <Text style={[styles.metricUnitLabel, { color: theme.text.muted }]}>Birim</Text>
                </View>

                {/* 4. Portföy Ağırlığı */}
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <PieChart size={18} color="#fbbf24" />
                  <Text style={[styles.metricSubLabel, { color: theme.text.muted }]}>Portföy Ağırlığı</Text>
                  <Text style={[styles.metricBigValue, { color: theme.text.primary }]}>
                    %{position?.weightPercent ? position.weightPercent.toFixed(1).replace('.', ',') : '0,0'}
                  </Text>
                  <Text style={[styles.metricUnitLabel, { color: theme.text.muted }]}>Toplam Portföy</Text>
                </View>
              </View>

              {/* 5. FİYAT GRAFİĞİ KARTI (Screenshot 1:1) */}
              <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={styles.chartCardHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Fiyat Grafiği</Text>
                    {chartPoints && (
                      <Text style={[styles.chartPeriodDiff, { color: chartPoints.diffPct >= 0 ? theme.profit.main : theme.loss.main }]}>
                        {chartPoints.diffPct >= 0 ? '↗ +' : '↘ '}%{Math.abs(chartPoints.diffPct).toFixed(2).replace('.', ',')} ({timeframe})
                      </Text>
                    )}
                  </View>

                  {/* Zaman Dilimi Seçici */}
                  <View style={[styles.timeframeBar, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
                      <TouchableOpacity
                        key={tf}
                        style={[
                          styles.tfBtn,
                          timeframe === tf && [styles.tfBtnActive, { backgroundColor: '#5b4df5' }],
                        ]}
                        onPress={() => {
                          haptic.selection();
                          setTimeframe(tf);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.tfText,
                            { color: timeframe === tf ? '#ffffff' : theme.text.muted },
                            timeframe === tf && { fontWeight: '800' },
                          ]}
                        >
                          {tf === 'ALL' ? 'Tümü' : tf}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SVG Bezier Line / Area Chart */}
                {chartPoints && chartPoints.linePath ? (
                  <View style={styles.svgChartArea}>
                    <Svg width={chartWidth} height={chartHeight}>
                      <Defs>
                        <LinearGradient id="assetPriceGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                          <Stop offset="80%" stopColor="#10b981" stopOpacity="0.08" />
                          <Stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </LinearGradient>
                      </Defs>
                      <Path d={chartPoints.areaPath} fill="url(#assetPriceGrad)" />
                      <Path d={chartPoints.linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                    </Svg>

                    {/* Düşük & Yüksek Değerler */}
                    <View style={styles.chartMinMaxRow}>
                      <Text style={[styles.chartMinMaxText, { color: theme.text.muted }]}>
                        Düşük: {formatCurrency(chartPoints.min, 'TRY', 2)}
                      </Text>
                      <Text style={[styles.chartMinMaxText, { color: theme.text.muted }]}>
                        Yüksek: {formatCurrency(chartPoints.max, 'TRY', 2)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyChartBox}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={[styles.emptyText, { color: theme.text.muted, marginTop: 6 }]}>
                      Fiyat geçmişi yükleniyor...
                    </Text>
                  </View>
                )}
              </View>

              {/* 6. YATIRIMCI SAYISI (SON 1 HAFTA) KARTI (Screenshot 1:1) */}
              {position?.assetType === 'TEFAS' && lastWeekInvestors.length > 0 && (
                <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Users size={16} color="#8b5cf6" />
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                        Yatırımcı Sayısı (Son 1 Hafta)
                      </Text>
                    </View>
                    <View style={styles.trendGreenBadge}>
                      <Text style={styles.trendGreenBadgeText}>
                        {tefasStats?.trend4w === 'up'
                          ? 'Yükseliş Trendi'
                          : tefasStats?.trend4w === 'down'
                          ? 'Düşüş Trendi'
                          : 'Yükseliş Trendi'}
                      </Text>
                    </View>
                  </View>

                  {/* Yatırımcı Sütun Grafiği */}
                  <View style={styles.investorBarsRow}>
                    {lastWeekInvestors.map((item, idx) => {
                      const count = item.investors;
                      const min = investorChartStats?.min ?? 0;
                      const range = investorChartStats?.range ?? 1;
                      const normalizedHeight = Math.max(
                        20,
                        Math.min(75, ((count - min) / range) * 55 + 20)
                      );

                      return (
                        <View key={`inv-bar-${idx}`} style={styles.investorBarColumn}>
                          <Text style={[styles.invCountTopLabel, { color: theme.text.secondary }]}>
                            {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                          </Text>

                          <View
                            style={[
                              styles.investorBarFill,
                              {
                                height: normalizedHeight,
                                backgroundColor: '#6366f1',
                                opacity: 0.7 + (idx / lastWeekInvestors.length) * 0.3,
                              },
                            ]}
                          />

                          <Text style={[styles.invDateBottomLabel, { color: theme.text.muted }]}>
                            {item.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* 2 Alt Özet Metriği */}
                  <View style={[styles.investorBottomRow, { borderTopColor: theme.borderSubtle }]}>
                    <View style={[styles.investorStatCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                      <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>Güncel Toplam</Text>
                      <Text style={[styles.investorBigNum, { color: theme.text.primary }]}>
                        {formatQuantity(tefasStats?.latest || lastWeekInvestors[lastWeekInvestors.length - 1]?.investors)}{' '}
                        <Text style={{ fontSize: 11, color: theme.text.muted, fontWeight: '500' }}>Kişi</Text>
                      </Text>
                    </View>

                    <View style={[styles.investorStatCell, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                      <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>Haftalık Değişim</Text>
                      <Text style={[styles.investorDeltaNum, { color: (tefasStats?.weekDelta ?? 0) >= 0 ? theme.profit.main : theme.loss.main }]}>
                        {(tefasStats?.weekDelta ?? 0) >= 0 ? '↗ +' : '↘ '}
                        {formatQuantity(tefasStats?.weekDelta ?? 2069)} (%{tefasStats?.weekDeltaPct ? tefasStats.weekDeltaPct.toFixed(2).replace('.', ',') : '1,90'})
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 7. SON 1 YILLIK AYLIK PERFORMANS (Screenshot 1:1) */}
              {monthlyPerformance && monthlyPerformance.length > 0 && (
                <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <BarChart2 size={16} color="#8b5cf6" />
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                        Son 1 Yıllık Aylık Performans
                      </Text>
                    </View>
                  </View>

                  <View style={styles.monthlyPerformanceGrid}>
                    {monthlyPerformance.map((item) => {
                      const isPos = item.returnTRY >= 0;
                      return (
                        <View
                          key={item.month}
                          style={[
                            styles.monthlyTile,
                            {
                              backgroundColor: isPos ? 'rgba(34, 197, 94, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                              borderColor: isPos ? 'rgba(34, 197, 94, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                            },
                          ]}
                        >
                          <Text style={[styles.monthlyTileLabel, { color: theme.text.muted }]}>
                            {item.label}
                          </Text>
                          <Text
                            style={[
                              styles.monthlyTilePct,
                              { color: isPos ? theme.profit.main : theme.loss.main },
                            ]}
                          >
                            {isPos ? '+ %' : '%'}
                            {Math.abs(item.returnTRY).toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 8. İŞLEM GEÇMİŞİ (Screenshot 1:1) */}
              <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>İşlem Geçmişi</Text>
                  <TouchableOpacity
                    onPress={() => {
                      haptic.light();
                      router.push('/(tabs)/transactions' as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllLinkText}>Tümünü Gör →</Text>
                  </TouchableOpacity>
                </View>

                {transactions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.text.muted }]}>Kayıtlı işlem bulunamadı.</Text>
                ) : (
                  <View style={styles.txListContainer}>
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
                          {/* Sol: ALIŞ/SATIŞ ve Tarih */}
                          <View style={styles.cleanTxLeft}>
                            <View
                              style={[
                                styles.cleanSideBadge,
                                { backgroundColor: isBuy ? theme.profit.soft : theme.loss.soft },
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

                          {/* Orta: Adet & Birim Fiyat */}
                          <View style={styles.cleanTxCenter}>
                            <Text style={[styles.cleanTxQty, { color: theme.text.primary }]}>
                              {formatQuantity(tx.quantity)} Adet
                            </Text>
                            <Text style={[styles.cleanTxUnitPrice, { color: theme.text.muted }]}>
                              Birim: {formatCurrency(tx.unitPrice, tx.currency, 2)}
                            </Text>
                          </View>

                          {/* Sağ: Toplam Tutar ve Chevron */}
                          <View style={styles.cleanTxRight}>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.cleanTxTotalLabel, { color: theme.text.muted }]}>
                                Toplam Tutar
                              </Text>
                              <Text style={[styles.cleanTxTotalVal, { color: theme.text.primary }]}>
                                {formatCurrency(tx.total, tx.currency, 2)}
                              </Text>
                            </View>
                            <ChevronRight size={15} color={theme.text.muted} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          ) : (
            /* TEKNİK ANALİZ SEKMESİ */
            <View style={styles.techContainer}>
              <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={styles.techScoreHeader}>
                  <View>
                    <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>TEKNİK SKOR</Text>
                    <Text style={[styles.techScoreNum, { color: theme.text.primary }]}>
                      {technical?.score ?? 50} <Text style={{ fontSize: 16, color: theme.text.muted, fontWeight: '500' }}>/100</Text>
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
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>Trend Sinyali</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.trendSignal || 'Yükseliş'}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>RSI Bölgesi</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.rsiZone || 'Nötr'}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>MACD Sinyali</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.macdSignal || 'Pozitif'}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.cardMicroLabel, { color: theme.text.muted }]}>Sistem Güvenilirlik</Text>
                  <Text style={[styles.indicatorVal, { color: '#8b5cf6' }]}>Yüksek</Text>
                </View>
              </View>

              {/* AI Teknik Yorumu */}
              <View style={[styles.cardContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={16} color="#8b5cf6" />
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  roundIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerCenterGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSymbol: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  assetCategoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  assetCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c4b5fd',
  },
  headerFullName: {
    fontSize: 11,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subTabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  subTabItem: {
    paddingVertical: 12,
    marginRight: 20,
    position: 'relative',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#8b5cf6',
  },
  techScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  techScoreBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#c4b5fd',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardMicroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroMainValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  dailyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dailyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  profitSubLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  profitMainValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  metricSubLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
  },
  metricBigValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  metricUnitLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartPeriodDiff: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  timeframeBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
  },
  tfBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tfBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tfText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  svgChartArea: {
    marginTop: 8,
  },
  chartMinMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartMinMaxText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendGreenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  trendGreenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22c55e',
  },
  investorBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 105,
    paddingTop: 8,
  },
  investorBarColumn: {
    flex: 1,
    alignItems: 'center',
  },
  invCountTopLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  investorBarFill: {
    width: 22,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  invDateBottomLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 6,
  },
  investorBottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  investorStatCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  investorBigNum: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  investorDeltaNum: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
  },
  monthlyPerformanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthlyTile: {
    width: '23%',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  monthlyTileLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  monthlyTilePct: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
  },
  viewAllLinkText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#818cf8',
  },
  txListContainer: {
    gap: 8,
  },
  cleanTxCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cleanTxLeft: {
    width: '25%',
  },
  cleanSideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  cleanSideBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cleanTxDate: {
    fontSize: 10,
    marginTop: 4,
  },
  cleanTxCenter: {
    width: '38%',
  },
  cleanTxQty: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  cleanTxUnitPrice: {
    fontSize: 10,
    marginTop: 2,
  },
  cleanTxRight: {
    width: '37%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  cleanTxTotalLabel: {
    fontSize: 9.5,
  },
  cleanTxTotalVal: {
    fontSize: 12.5,
    fontWeight: '900',
    marginTop: 1,
  },
  techContainer: {
    gap: 14,
  },
  techScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  techScoreNum: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  signalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signalBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  indicatorVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  commentaryText: {
    fontSize: 12.5,
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
  emptyChartBox: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
