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
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
  BarChart2,
  PieChart,
  Layers,
  Coins,
  ChevronDown,
  DollarSign,
  Activity,
  Table,
} from 'lucide-react-native';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { useThemeStore } from '../../stores/themeStore';
import { AssetType, PeriodReturns } from '../../types';

interface GrowthByType {
  BES: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  BIST: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  TEFAS: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  FOREIGN: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  FX: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  METAL: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
  CRYPTO: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number };
}

interface GrowthPoint {
  month: string;
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  byType: GrowthByType;
  partialData?: boolean;
}

const SHORT_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
function getMonthShortLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return SHORT_MONTHS[(m || 1) - 1] ?? monthKey;
}

const ASSET_COLUMN_KEYS: { key: AssetType; label: string }[] = [
  { key: 'BES', label: 'BES' },
  { key: 'BIST', label: 'BIST' },
  { key: 'TEFAS', label: 'TEFAS FON' },
  { key: 'FOREIGN', label: 'YABANCI' },
  { key: 'FX', label: 'DÖVİZ' },
  { key: 'METAL', label: 'MADEN' },
  { key: 'CRYPTO', label: 'KRİPTO' },
];

export default function GrowthScreen() {
  const { theme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');

  // Grafik Seçenekleri
  const [chartMetric, setChartMetric] = useState<'return' | 'value' | 'allocation'>('return');
  const [chartYear, setChartYear] = useState<string>('ALL');

  // Aylık Dağılım Tablosu Seçenekleri
  const [monthlyViewMode, setMonthlyViewMode] = useState<'return' | 'amount' | 'share'>('return');
  const [tableYear, setTableYear] = useState<string>('2026');

  // Kümülatif Yıllık Başlangıç Filtresi
  const [cumulFromYear, setCumulFromYear] = useState<string>('ALL');

  const [series, setSeries] = useState<GrowthPoint[]>([]);
  const [periodReturns, setPeriodReturns] = useState<PeriodReturns | null>(null);

  const fetchGrowth = useCallback(async () => {
    try {
      const res = await api.get<{
        series: GrowthPoint[];
        periodReturns: PeriodReturns;
      }>('/growth/snapshots');

      if (res.data) {
        if (res.data.series) {
          setSeries(res.data.series);
          // Tablo yılı için serideki en son yılı seç
          const lastYear = res.data.series[res.data.series.length - 1]?.month.slice(0, 4);
          if (lastYear) {
            setTableYear(lastYear);
            setChartYear(lastYear);
          }
        }
        if (res.data.periodReturns) setPeriodReturns(res.data.periodReturns);
      }
    } catch (err) {
      console.error('Büyüme verisi hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGrowth();
  }, [fetchGrowth]);

  const isTRY = currency === 'TRY';

  // Mevcut Yıllar Listesi
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (const p of series) {
      const y = p.month.slice(0, 4);
      if (y) yearsSet.add(y);
    }
    return Array.from(yearsSet).sort();
  }, [series]);

  // Filtrelenmiş Grafik Verileri
  const chartData = useMemo(() => {
    const filtered =
      chartYear === 'ALL'
        ? series
        : series.filter((p) => p.month.startsWith(chartYear));

    return filtered.map((p, idx) => {
      const val = isTRY ? p.valueTRY : p.valueUSD;
      const prev = idx > 0 ? (isTRY ? filtered[idx - 1].valueTRY : filtered[idx - 1].valueUSD) : null;
      const returnPct = prev && prev > 0 ? ((val / prev) - 1) * 100 : 0;
      const [yStr, mStr] = p.month.split('-');
      const label = chartYear === 'ALL' ? `${yStr.slice(2)}.${mStr}` : getMonthShortLabel(p.month);

      return {
        month: p.month,
        label,
        value: val,
        cost: isTRY ? p.costTRY : p.costUSD,
        returnPct,
      };
    });
  }, [series, chartYear, isTRY]);

  // Dönem Özet Metrikleri (Hero)
  const periodSummary = useMemo(() => {
    if (chartData.length === 0) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const totalCurrentTRY = series[series.length - 1]?.valueTRY ?? 0;
    const totalCurrentUSD = series[series.length - 1]?.valueUSD ?? 0;

    const startVal = first.value;
    const endVal = last.value;
    const gainVal = endVal - startVal;
    const gainPct = startVal > 0 ? (gainVal / startVal) * 100 : 0;

    const [firstY, firstM] = first.month.split('-');
    const [lastY, lastM] = last.month.split('-');

    return {
      totalCurrentTRY,
      totalCurrentUSD,
      startDateLabel: `1 ${firstM}.${firstY}`,
      endDateLabel: `1 ${lastM}.${lastY}`,
      startVal,
      endVal,
      gainVal,
      gainPct,
      usdReturnPct: periodReturns?.oneYearUSD ?? 0,
    };
  }, [chartData, series, periodReturns]);

  // Kümülatif Yıllık Tablo Satırları (Screenshot 2 ile birebir)
  const cumulativeYearlyRows = useMemo(() => {
    const map = new Map<string, { start: GrowthPoint; end: GrowthPoint }>();
    for (const p of series) {
      const y = p.month.slice(0, 4);
      const existing = map.get(y);
      if (!existing) {
        map.set(y, { start: p, end: p });
      } else {
        existing.end = p;
      }
    }

    const rows: {
      year: string;
      startTRY: number;
      endTRY: number;
      startUSD: number;
      endUSD: number;
      returnTRY: number | null;
      returnUSD: number | null;
    }[] = [];

    const years = Array.from(map.keys()).sort();
    for (const y of years) {
      if (cumulFromYear !== 'ALL' && y !== cumulFromYear) continue;
      const data = map.get(y)!;
      const startTRY = data.start.valueTRY;
      const endTRY = data.end.valueTRY;
      const startUSD = data.start.valueUSD;
      const endUSD = data.end.valueUSD;

      const returnTRY = startTRY > 0 ? ((endTRY / startTRY) - 1) * 100 : 0;
      const returnUSD = startUSD > 0 ? ((endUSD / startUSD) - 1) * 100 : 0;

      rows.push({
        year: y,
        startTRY,
        endTRY,
        startUSD,
        endUSD,
        returnTRY,
        returnUSD,
      });
    }

    // Toplam Satırı (Sadece tüm yıllar listeleniyorsa)
    if (cumulFromYear === 'ALL' && rows.length > 1) {
      const firstRow = rows[0];
      const lastRow = rows[rows.length - 1];
      const totalRetTRY = firstRow.startTRY > 0 ? ((lastRow.endTRY / firstRow.startTRY) - 1) * 100 : 0;
      const totalRetUSD = firstRow.startUSD > 0 ? ((lastRow.endUSD / firstRow.startUSD) - 1) * 100 : 0;

      rows.push({
        year: 'TOPLAM',
        startTRY: firstRow.startTRY,
        endTRY: lastRow.endTRY,
        startUSD: firstRow.startUSD,
        endUSD: lastRow.endUSD,
        returnTRY: totalRetTRY,
        returnUSD: totalRetUSD,
      });
    }

    return rows;
  }, [series, cumulFromYear]);

  // Aylık Dağılım Tablosu Verileri (Screenshot 3 ile birebir)
  const monthlyTableData = useMemo(() => {
    const yearPoints = series.filter((p) => p.month.startsWith(tableYear));
    if (yearPoints.length === 0) return { rows: [], yearSummary: null };

    const rows = yearPoints.map((p, idx) => {
      const prev = idx > 0 ? yearPoints[idx - 1] : null;
      const totalVal = isTRY ? p.valueTRY : p.valueUSD;
      const prevTotal = prev ? (isTRY ? prev.valueTRY : prev.valueUSD) : null;
      const totalReturnPct = prevTotal && prevTotal > 0 ? ((totalVal / prevTotal) - 1) * 100 : null;

      const cells: Record<
        AssetType,
        { amount: number; returnPct: number | null; sharePct: number }
      > = {} as any;

      for (const item of ASSET_COLUMN_KEYS) {
        const typeData = p.byType?.[item.key];
        const prevTypeData = prev?.byType?.[item.key];

        const amount = typeData ? (isTRY ? typeData.valueTRY : typeData.valueUSD) : 0;
        const prevAmount = prevTypeData ? (isTRY ? prevTypeData.valueTRY : prevTypeData.valueUSD) : null;

        const returnPct = prevAmount && prevAmount > 0 && amount > 0 ? ((amount / prevAmount) - 1) * 100 : null;
        const sharePct = totalVal > 0 ? (amount / totalVal) * 100 : 0;

        cells[item.key] = { amount, returnPct, sharePct };
      }

      return {
        monthKey: p.month,
        totalVal,
        totalReturnPct,
        cells,
      };
    });

    // Yıl Sonu Toplamı Satırı
    const firstPoint = yearPoints[0];
    const lastPoint = yearPoints[yearPoints.length - 1];
    const totalStart = isTRY ? firstPoint.valueTRY : firstPoint.valueUSD;
    const totalEnd = isTRY ? lastPoint.valueTRY : lastPoint.valueUSD;
    const yearTotalReturn = totalStart > 0 ? ((totalEnd / totalStart) - 1) * 100 : 0;

    const summaryCells: Record<AssetType, { returnPct: number | null }> = {} as any;
    for (const item of ASSET_COLUMN_KEYS) {
      const sVal = firstPoint.byType?.[item.key] ? (isTRY ? firstPoint.byType[item.key].valueTRY : firstPoint.byType[item.key].valueUSD) : 0;
      const eVal = lastPoint.byType?.[item.key] ? (isTRY ? lastPoint.byType[item.key].valueTRY : lastPoint.byType[item.key].valueUSD) : 0;
      const ret = sVal > 0 && eVal > 0 ? ((eVal / sVal) - 1) * 100 : null;
      summaryCells[item.key] = { returnPct: ret };
    }

    return {
      rows,
      yearSummary: {
        year: tableYear,
        totalReturn: yearTotalReturn,
        cells: summaryCells,
      },
    };
  }, [series, tableYear, isTRY]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER (Tam Genişlik) */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Portföy Gelişimi</Text>
          <Text style={[styles.pageSubtitle, { color: theme.text.muted }]}>
            Aylık büyüme, getiri grafikleri ve yıllık özet
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.currencyToggleBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
          activeOpacity={0.8}
        >
          <Coins size={13} color={theme.brand.primary} />
          <Text style={[styles.currencyToggleText, { color: theme.brand.primary }]}>{currency}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Gelişim verileri yükleniyor...</Text>
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
          {/* 2. AYLIK PORTFÖY GETİRİSİ KARTI & GRAFİK (SCREENSHOT 1) */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            {/* Başlık ve Metrik Seçici Butonlar */}
            <View style={styles.chartHeaderBlock}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={16} color={theme.brand.primary} />
                  <Text style={[styles.sectionMainTitle, { color: theme.text.primary }]}>
                    {chartMetric === 'return'
                      ? 'Aylık Portföy Getirisi (%)'
                      : chartMetric === 'value'
                      ? 'Aylık Değer ve Maliyet'
                      : 'Varlık Bazında Değer'}
                  </Text>
                </View>
                <Text style={[styles.sectionSubTitle, { color: theme.text.muted }]}>
                  {chartMetric === 'return'
                    ? 'Her ayın yüzde kâr/zarar getiri oranları'
                    : 'Portföy büyüklüğü ve maliyet gelişimi'}
                </Text>
              </View>

              {/* 3 Görünüm Tab'ı */}
              <View style={[styles.chartTabsRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                <TouchableOpacity
                  style={[
                    styles.chartTabBtn,
                    chartMetric === 'return' && [styles.activeChartTabBtn, { backgroundColor: theme.surface }],
                  ]}
                  onPress={() => setChartMetric('return')}
                >
                  <Text
                    style={[
                      styles.chartTabText,
                      { color: chartMetric === 'return' ? theme.brand.primary : theme.text.muted },
                      chartMetric === 'return' && { fontWeight: '800' },
                    ]}
                  >
                    Aylık Getiri %
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chartTabBtn,
                    chartMetric === 'value' && [styles.activeChartTabBtn, { backgroundColor: theme.surface }],
                  ]}
                  onPress={() => setChartMetric('value')}
                >
                  <Text
                    style={[
                      styles.chartTabText,
                      { color: chartMetric === 'value' ? theme.brand.primary : theme.text.muted },
                      chartMetric === 'value' && { fontWeight: '800' },
                    ]}
                  >
                    Portföy Değeri
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Dönem İstatistikleri (Screenshot 1 üstündeki 4'lü kutu) */}
            {periodSummary && (
              <View style={[styles.periodHeroContainer, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                <View style={styles.periodHeroRow}>
                  {/* Toplam Portföy (TRY) */}
                  <View style={styles.periodHeroCell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.heroSubLabel, { color: theme.text.muted }]}>TOPLAM PORTFÖY</Text>
                      <View style={[styles.miniBadge, { backgroundColor: theme.brand.soft }]}>
                        <Text style={[styles.miniBadgeText, { color: theme.brand.strong }]}>TRY</Text>
                      </View>
                    </View>
                    <Text style={[styles.heroBigVal, { color: theme.text.primary }]}>
                      {formatCurrency(periodSummary.totalCurrentTRY, 'TRY')}
                    </Text>
                    <Text style={[styles.heroDateLabel, { color: theme.text.muted }]}>
                      {periodSummary.endDateLabel}
                    </Text>
                  </View>

                  {/* Dönem Getirisi */}
                  <View style={styles.periodHeroCell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.heroSubLabel, { color: theme.text.muted }]}>DÖNEM GETİRİSİ</Text>
                      <View style={[styles.miniBadge, { backgroundColor: theme.profit.soft }]}>
                        <Text style={[styles.miniBadgeText, { color: theme.profit.main }]}>
                          +{periodSummary.gainPct.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.heroMidVal, { color: theme.profit.main }]}>
                      +{formatCurrency(periodSummary.gainVal, currency)}
                    </Text>
                    <Text style={[styles.heroDateLabel, { color: theme.text.muted }]}>
                      Net kazanç / kayıp
                    </Text>
                  </View>
                </View>

                <View style={[styles.periodHeroRow, { borderTopWidth: 1, borderTopColor: theme.borderSubtle, paddingTop: 8, marginTop: 8 }]}>
                  {/* Dönem Başlangıç */}
                  <View style={styles.periodHeroCell}>
                    <Text style={[styles.heroSubLabel, { color: theme.text.muted }]}>DÖNEM BAŞLANGIÇ</Text>
                    <Text style={[styles.heroSubVal, { color: theme.text.secondary }]}>
                      {formatCurrency(periodSummary.startVal, currency)}
                    </Text>
                    <Text style={[styles.heroDateLabel, { color: theme.text.muted }]}>
                      {periodSummary.startDateLabel}
                    </Text>
                  </View>

                  {/* Toplam Portföy (USD) */}
                  <View style={styles.periodHeroCell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.heroSubLabel, { color: theme.text.muted }]}>TOPLAM ($)</Text>
                      <View style={[styles.miniBadge, { backgroundColor: theme.brand.soft }]}>
                        <Text style={[styles.miniBadgeText, { color: theme.brand.strong }]}>USD</Text>
                      </View>
                    </View>
                    <Text style={[styles.heroSubVal, { color: theme.text.primary }]}>
                      {formatCurrency(periodSummary.totalCurrentUSD, 'USD')}
                    </Text>
                    <Text style={[styles.heroDateLabel, { color: theme.brand.primary }]}>
                      USD Getiri: +{periodSummary.usdReturnPct.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Yıl Filtresi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }}>
              <Text style={[styles.chartRangeLabel, { color: theme.text.muted }]}>Dönem Filtresi:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {['ALL', ...availableYears].map((yr) => (
                  <TouchableOpacity
                    key={`chart-yr-${yr}`}
                    style={[
                      styles.chartYrBtn,
                      chartYear === yr
                        ? [styles.activeChartYrBtn, { backgroundColor: theme.brand.primary }]
                        : { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle, borderWidth: 1 },
                    ]}
                    onPress={() => setChartYear(yr)}
                  >
                    <Text
                      style={[
                        styles.chartYrBtnText,
                        { color: chartYear === yr ? '#ffffff' : theme.text.muted },
                      ]}
                    >
                      {yr === 'ALL' ? 'Tüm Zamanlar' : `${yr} Yılı`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ÇUBUK GRAFİK (BAR CHART) */}
            <View style={styles.barChartContainer}>
              {chartYear !== 'ALL' ? (
                <View style={styles.barChartRowSingleYear}>
                  {chartData.map((item, idx) => {
                    const isPos = item.returnPct >= 0;
                    const isZero = Math.abs(item.returnPct) < 0.05;
                    const barHeight = Math.max(4, Math.min(50, Math.abs(item.returnPct) * 2 + 4));

                    return (
                      <View key={`barchart-${item.month}-${idx}`} style={styles.barChartColSingleYear}>
                        {/* Üst Alan */}
                        <View style={styles.barTopHalf}>
                          {isPos && !isZero && (
                            <Text style={[styles.barPctLabelMini, { color: theme.profit.main }]}>
                              +{item.returnPct.toFixed(0)}%
                            </Text>
                          )}
                          {isPos && !isZero && (
                            <View
                              style={[
                                styles.barStickMini,
                                {
                                  height: barHeight,
                                  backgroundColor: theme.profit.main,
                                  borderTopLeftRadius: 2,
                                  borderTopRightRadius: 2,
                                },
                              ]}
                            />
                          )}
                        </View>

                        {/* Orta Sıfır Çizgisi Eksen */}
                        <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

                        {/* Alt Alan */}
                        <View style={styles.barBottomHalf}>
                          {!isPos && (
                            <View
                              style={[
                                styles.barStickMini,
                                {
                                  height: barHeight,
                                  backgroundColor: theme.loss.main,
                                  borderBottomLeftRadius: 2,
                                  borderBottomRightRadius: 2,
                                },
                              ]}
                            />
                          )}
                          {!isPos && (
                            <Text style={[styles.barPctLabelMini, { color: theme.loss.main, marginTop: 1 }]}>
                              {item.returnPct.toFixed(0)}%
                            </Text>
                          )}
                        </View>

                        {/* X Ekseni Tarih Etiketi */}
                        <Text style={[styles.barDateLabelMini, { color: theme.text.muted }]}>
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barChartScroll}>
                  {chartData.map((item, idx) => {
                    const isPos = item.returnPct >= 0;
                    const isZero = Math.abs(item.returnPct) < 0.05;
                    const barHeight = Math.max(6, Math.min(65, Math.abs(item.returnPct) * 2.5 + 4));

                    return (
                      <View key={`barchart-${item.month}-${idx}`} style={styles.barChartCol}>
                        {/* Üst Alan: Pozitif Yüzde ve Çubuk */}
                        <View style={styles.barTopHalf}>
                          {isPos && !isZero && (
                            <Text style={[styles.barPctLabel, { color: theme.profit.main }]}>
                              +{item.returnPct.toFixed(1)}%
                            </Text>
                          )}
                          {isPos && !isZero && (
                            <View
                              style={[
                                styles.barStick,
                                {
                                  height: barHeight,
                                  backgroundColor: theme.profit.main,
                                  borderTopLeftRadius: 3,
                                  borderTopRightRadius: 3,
                                },
                              ]}
                            />
                          )}
                        </View>

                        {/* Orta Sıfır Çizgisi Eksen */}
                        <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

                        {/* Alt Alan: Negatif Yüzde ve Çubuk */}
                        <View style={styles.barBottomHalf}>
                          {!isPos && (
                            <View
                              style={[
                                styles.barStick,
                                {
                                  height: barHeight,
                                  backgroundColor: theme.loss.main,
                                  borderBottomLeftRadius: 3,
                                  borderBottomRightRadius: 3,
                                },
                              ]}
                            />
                          )}
                          {!isPos && (
                            <Text style={[styles.barPctLabel, { color: theme.loss.main, marginTop: 2 }]}>
                              {item.returnPct.toFixed(1)}%
                            </Text>
                          )}
                        </View>

                        {/* X Ekseni Tarih Etiketi */}
                        <Text style={[styles.barDateLabel, { color: theme.text.muted }]}>
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          {/* 3. KÜMÜLATİF YILLIK ÖZET TABLOSU */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionMainTitle, { color: theme.text.primary }]}>
                  Kümülatif Yıllık Özet
                </Text>
                <Text style={[styles.sectionSubTitle, { color: theme.text.muted }]}>
                  Yıllara göre kümülatif büyüme ve net getiri
                </Text>
              </View>

              {/* Yıl Filtresi Dropdown */}
              <TouchableOpacity
                style={[styles.miniYearFilterBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={() => {
                  const allChoices = ['ALL', ...availableYears];
                  const nextIdx = (allChoices.indexOf(cumulFromYear) + 1) % allChoices.length;
                  setCumulFromYear(allChoices[nextIdx]);
                }}
              >
                <Text style={[styles.miniYearFilterText, { color: theme.text.primary }]}>
                  {cumulFromYear === 'ALL' ? 'Tüm Yıllar (Kümülatif)' : `${cumulFromYear} Yılı`}
                </Text>
                <ChevronDown size={12} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Yatay Kaydırılabilir Kümülatif Tablo */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={styles.fullDataTable}>
                {/* Tablo Başlıkları */}
                <View style={[styles.tableHeaderRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.thCell, { width: 55, color: theme.text.muted }]}>YIL</Text>
                  <Text style={[styles.thCell, { width: 95, textAlign: 'right', color: theme.text.muted }]}>BAŞLANGIÇ (₺)</Text>
                  <Text style={[styles.thCell, { width: 95, textAlign: 'right', color: theme.text.muted }]}>BİTİŞ (₺)</Text>
                  <Text style={[styles.thCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>BAŞLANGIÇ ($)</Text>
                  <Text style={[styles.thCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>BİTİŞ ($)</Text>
                  <Text style={[styles.thCell, { width: 100, textAlign: 'right', color: theme.text.muted }]}>KÜMÜLATİF (₺)</Text>
                  <Text style={[styles.thCell, { width: 95, textAlign: 'right', color: theme.text.muted }]}>KÜMÜLATİF ($)</Text>
                </View>

                {/* Tablo Satırları */}
                {cumulativeYearlyRows.map((row) => {
                  const isTotal = row.year === 'TOPLAM';
                  const isPosTRY = (row.returnTRY ?? 0) >= 0;
                  const isPosUSD = (row.returnUSD ?? 0) >= 0;

                  return (
                    <View
                      key={`cumul-row-${row.year}`}
                      style={[
                        styles.tableBodyRow,
                        { borderBottomColor: theme.borderSubtle },
                        isTotal && [styles.tableTotalRow, { backgroundColor: theme.surfaceMuted }],
                      ]}
                    >
                      <Text style={[styles.tdCell, { width: 55, fontWeight: isTotal ? '900' : '700', color: isTotal ? theme.brand.primary : theme.text.primary }]}>
                        {row.year}
                      </Text>
                      <Text style={[styles.tdCell, { width: 95, textAlign: 'right', color: theme.text.secondary }]}>
                        {formatCurrency(row.startTRY, 'TRY')}
                      </Text>
                      <Text style={[styles.tdCell, { width: 95, textAlign: 'right', fontWeight: '700', color: theme.text.primary }]}>
                        {formatCurrency(row.endTRY, 'TRY')}
                      </Text>
                      <Text style={[styles.tdCell, { width: 85, textAlign: 'right', color: theme.text.secondary }]}>
                        {formatCurrency(row.startUSD, 'USD')}
                      </Text>
                      <Text style={[styles.tdCell, { width: 85, textAlign: 'right', fontWeight: '700', color: theme.text.primary }]}>
                        {formatCurrency(row.endUSD, 'USD')}
                      </Text>
                      <Text
                        style={[
                          styles.tdCell,
                          {
                            width: 100,
                            textAlign: 'right',
                            fontWeight: '800',
                            color: isPosTRY ? theme.profit.main : theme.loss.main,
                          },
                        ]}
                      >
                        {formatPercent(row.returnTRY)}
                      </Text>
                      <Text
                        style={[
                          styles.tdCell,
                          {
                            width: 95,
                            textAlign: 'right',
                            fontWeight: '800',
                            color: isPosUSD ? theme.profit.main : theme.loss.main,
                          },
                        ]}
                      >
                        {formatPercent(row.returnUSD)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* 4. AYLIK DAĞILIM TABLOSU */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionMainTitle, { color: theme.text.primary }]}>
                  Aylık Dağılım
                </Text>
                <Text style={[styles.sectionSubTitle, { color: theme.text.muted }]}>
                  {monthlyViewMode === 'return'
                    ? 'Varlıkların bir önceki aya göre getiri yüzdesi (%)'
                    : monthlyViewMode === 'amount'
                    ? 'Varlıkların ay sonu toplam tutarları'
                    : 'Varlıkların portföy içindeki ağırlık payı (%)'}
                </Text>
              </View>

              {/* Yıl Seçici */}
              <TouchableOpacity
                style={[styles.miniYearFilterBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={() => {
                  const curIdx = availableYears.indexOf(tableYear);
                  const nextYear = availableYears[(curIdx + 1) % availableYears.length] || '2026';
                  setTableYear(nextYear);
                }}
              >
                <Text style={[styles.miniYearFilterText, { color: theme.text.primary }]}>
                  {tableYear} Yılı
                </Text>
                <ChevronDown size={12} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Mod Seçici (Tutar / Değişim % / Portföy Payı %) */}
            <View style={[styles.tableModeSegment, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.tableModeBtn,
                  monthlyViewMode === 'amount' && [styles.activeTableModeBtn, { backgroundColor: theme.surface }],
                ]}
                onPress={() => setMonthlyViewMode('amount')}
              >
                <Text
                  style={[
                    styles.tableModeBtnText,
                    { color: monthlyViewMode === 'amount' ? theme.brand.primary : theme.text.muted },
                    monthlyViewMode === 'amount' && { fontWeight: '800' },
                  ]}
                >
                  Tutar ({currency})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tableModeBtn,
                  monthlyViewMode === 'return' && [styles.activeTableModeBtn, { backgroundColor: theme.surface }],
                ]}
                onPress={() => setMonthlyViewMode('return')}
              >
                <Text
                  style={[
                    styles.tableModeBtnText,
                    { color: monthlyViewMode === 'return' ? theme.brand.primary : theme.text.muted },
                    monthlyViewMode === 'return' && { fontWeight: '800' },
                  ]}
                >
                  Değişim (%)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tableModeBtn,
                  monthlyViewMode === 'share' && [styles.activeTableModeBtn, { backgroundColor: theme.surface }],
                ]}
                onPress={() => setMonthlyViewMode('share')}
              >
                <Text
                  style={[
                    styles.tableModeBtnText,
                    { color: monthlyViewMode === 'share' ? theme.brand.primary : theme.text.muted },
                    monthlyViewMode === 'share' && { fontWeight: '800' },
                  ]}
                >
                  Portföy Payı (%)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Yatay Kaydırılabilir Aylık Dağılım Tablosu */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={styles.fullDataTable}>
                {/* Başlıklar */}
                <View style={[styles.tableHeaderRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.thCell, { width: 65, color: theme.text.muted }]}>AY</Text>
                  {ASSET_COLUMN_KEYS.map((col) => (
                    <Text key={col.key} style={[styles.thCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>
                      {col.label}
                    </Text>
                  ))}
                  <Text style={[styles.thCell, { width: 85, textAlign: 'right', color: theme.text.primary, fontWeight: '800' }]}>
                    TOPLAM
                  </Text>
                </View>

                {/* Aylık Satırlar */}
                {monthlyTableData.rows.map((row) => {
                  const isTotalPos = (row.totalReturnPct ?? 0) >= 0;

                  return (
                    <View key={row.monthKey} style={[styles.tableBodyRow, { borderBottomColor: theme.borderSubtle }]}>
                      <Text style={[styles.tdCell, { width: 65, fontWeight: '800', color: theme.text.primary }]}>
                        {row.monthKey.replace('-', '.')}
                      </Text>

                      {ASSET_COLUMN_KEYS.map((col) => {
                        const cellData = row.cells[col.key];
                        if (!cellData || cellData.amount <= 0) {
                          return (
                            <Text key={col.key} style={[styles.tdCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>
                              —
                            </Text>
                          );
                        }

                        if (monthlyViewMode === 'amount') {
                          return (
                            <Text key={col.key} style={[styles.tdCell, { width: 85, textAlign: 'right', color: theme.text.secondary }]}>
                              {formatCurrency(cellData.amount, currency)}
                            </Text>
                          );
                        }

                        if (monthlyViewMode === 'share') {
                          return (
                            <Text key={col.key} style={[styles.tdCell, { width: 85, textAlign: 'right', fontWeight: '700', color: theme.text.primary }]}>
                              %{cellData.sharePct.toFixed(1)}
                            </Text>
                          );
                        }

                        // Değişim % Modu
                        const ret = cellData.returnPct;
                        if (ret == null) {
                          return (
                            <Text key={col.key} style={[styles.tdCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>
                              —
                            </Text>
                          );
                        }

                        const isPos = ret >= 0;
                        return (
                          <Text
                            key={col.key}
                            style={[
                              styles.tdCell,
                              {
                                width: 85,
                                textAlign: 'right',
                                fontWeight: '700',
                                color: isPos ? theme.profit.main : theme.loss.main,
                              },
                            ]}
                          >
                            {isPos ? '▲ +' : '▼ '}{Math.abs(ret).toFixed(1)}%
                          </Text>
                        );
                      })}

                      {/* Toplam Kolonu */}
                      <View style={{ width: 85, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {monthlyViewMode === 'amount' ? (
                          <Text style={[styles.tdCell, { width: '100%', textAlign: 'right', fontWeight: '800', color: theme.text.primary }]}>
                            {formatCurrency(row.totalVal, currency)}
                          </Text>
                        ) : monthlyViewMode === 'share' ? (
                          <Text style={[styles.tdCell, { width: '100%', textAlign: 'right', fontWeight: '800', color: theme.text.primary }]}>
                            %100,0
                          </Text>
                        ) : (
                          <View
                            style={[
                              styles.totalRetPill,
                              { backgroundColor: isTotalPos ? theme.profit.soft : theme.loss.soft },
                            ]}
                          >
                            <Text
                              style={[
                                styles.totalRetPillText,
                                { color: isTotalPos ? theme.profit.main : theme.loss.main },
                              ]}
                            >
                              {isTotalPos ? '▲ +' : '▼ '}{Math.abs(row.totalReturnPct ?? 0).toFixed(1)}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Yıl Sonu Özet Satırı */}
                {monthlyTableData.yearSummary && (
                  <View style={[styles.tableBodyRow, styles.tableTotalRow, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.tdCell, { width: 65, fontWeight: '900', color: theme.brand.primary }]}>
                      {monthlyTableData.yearSummary.year} Getiri %
                    </Text>

                    {ASSET_COLUMN_KEYS.map((col) => {
                      const ret = monthlyTableData.yearSummary?.cells[col.key]?.returnPct;
                      if (ret == null) {
                        return (
                          <Text key={col.key} style={[styles.tdCell, { width: 85, textAlign: 'right', color: theme.text.muted }]}>
                            —
                          </Text>
                        );
                      }
                      const isPos = ret >= 0;
                      return (
                        <Text
                          key={col.key}
                          style={[
                            styles.tdCell,
                            {
                              width: 85,
                              textAlign: 'right',
                              fontWeight: '800',
                              color: isPos ? theme.profit.main : theme.loss.main,
                            },
                          ]}
                        >
                          {isPos ? '+' : ''}{ret.toFixed(2)}%
                        </Text>
                      );
                    })}

                    {/* Yıllık Toplam Getiri */}
                    <View style={{ width: 85, alignItems: 'flex-end', justifyContent: 'center' }}>
                      <View
                        style={[
                          styles.totalRetPill,
                          {
                            backgroundColor:
                              (monthlyTableData.yearSummary.totalReturn ?? 0) >= 0
                                ? theme.profit.soft
                                : theme.loss.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.totalRetPillText,
                            {
                              color:
                                (monthlyTableData.yearSummary.totalReturn ?? 0) >= 0
                                ? theme.profit.main
                                : theme.loss.main,
                            },
                          ]}
                        >
                          {(monthlyTableData.yearSummary.totalReturn ?? 0) >= 0 ? '▲ +' : '▼ '}
                          {Math.abs(monthlyTableData.yearSummary.totalReturn ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
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
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  currencyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 3,
    borderWidth: 1,
  },
  currencyToggleText: {
    fontSize: 11,
    fontWeight: '700',
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
  chartHeaderBlock: {
    gap: 10,
  },
  sectionMainTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  chartTabsRow: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  chartTabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeChartTabBtn: {
    shadowOpacity: 0.05,
  },
  chartTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  periodHeroContainer: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  periodHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodHeroCell: {
    flex: 1,
  },
  heroSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroBigVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  heroMidVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  heroSubVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  heroDateLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  miniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  chartRangeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartYrBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  activeChartYrBtn: {},
  chartYrBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  barChartContainer: {
    marginTop: 6,
    paddingTop: 6,
  },
  barChartRowSingleYear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 145,
    paddingHorizontal: 2,
  },
  barChartColSingleYear: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barStickMini: {
    width: '75%',
    maxWidth: 16,
  },
  barPctLabelMini: {
    fontSize: 7.5,
    fontWeight: '800',
    marginBottom: 1,
  },
  barDateLabelMini: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 3,
  },
  barChartScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    height: 165,
  },
  barChartCol: {
    alignItems: 'center',
    width: 44,
    height: '100%',
  },
  barTopHalf: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  zeroAxisLine: {
    width: '100%',
    height: 1.5,
  },
  barBottomHalf: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  barStick: {
    width: 20,
  },
  barPctLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 2,
  },
  barDateLabel: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniYearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  miniYearFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableModeSegment: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  tableModeBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTableModeBtn: {
    shadowOpacity: 0.05,
  },
  tableModeBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fullDataTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableTotalRow: {
    borderTopWidth: 1,
  },
  tdCell: {
    fontSize: 10,
    paddingHorizontal: 4,
  },
  totalRetPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  totalRetPillText: {
    fontSize: 9,
    fontWeight: '800',
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
