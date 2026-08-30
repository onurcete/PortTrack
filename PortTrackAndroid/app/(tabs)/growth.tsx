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
  Sparkles,
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

const ASSET_TYPE_KEYS: AssetType[] = [
  'BES',
  'BIST',
  'TEFAS',
  'FOREIGN',
  'FX',
  'METAL',
  'CRYPTO',
];

export default function GrowthScreen() {
  const { theme } = useThemeStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'return' | 'allocation'>('value');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const [series, setSeries] = useState<GrowthPoint[]>([]);
  const [periodReturns, setPeriodReturns] = useState<PeriodReturns | null>(null);

  const fetchGrowth = useCallback(async () => {
    try {
      const res = await api.get<{
        series: GrowthPoint[];
        periodReturns: PeriodReturns;
      }>('/growth/snapshots');

      if (res.data) {
        if (res.data.series) setSeries(res.data.series);
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
    return ['ALL', ...Array.from(yearsSet).sort().reverse()];
  }, [series]);

  // Filtrelenmiş Seri
  const filteredSeries = useMemo(() => {
    if (selectedYear === 'ALL') return series;
    return series.filter((p) => p.month.startsWith(selectedYear));
  }, [series, selectedYear]);

  // En güncel ve ilk veri noktaları
  const latestPoint = series.length > 0 ? series[series.length - 1] : null;
  const prevPoint = series.length > 1 ? series[series.length - 2] : null;

  const currentValue = latestPoint ? (isTRY ? latestPoint.valueTRY : latestPoint.valueUSD) : 0;
  const currentCost = latestPoint ? (isTRY ? latestPoint.costTRY : latestPoint.costUSD) : 0;
  const totalProfit = currentValue - currentCost;
  const totalProfitRate = currentCost > 0 ? (totalProfit / currentCost) * 100 : 0;

  const besValue = latestPoint?.byType?.BES ? (isTRY ? latestPoint.byType.BES.valueTRY : latestPoint.byType.BES.valueUSD) : 0;

  // Grafiğe Göre Çubuk Verileri
  const chartBars = useMemo(() => {
    if (filteredSeries.length === 0) return [];

    const values = filteredSeries.map((p) => (isTRY ? p.valueTRY : p.valueUSD));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    return filteredSeries.map((p, idx) => {
      const val = isTRY ? p.valueTRY : p.valueUSD;
      const prev = idx > 0 ? (isTRY ? filteredSeries[idx - 1].valueTRY : filteredSeries[idx - 1].valueUSD) : null;
      const retPct = prev && prev > 0 ? ((val / prev) - 1) * 100 : 0;
      const height = Math.max(12, Math.min(85, ((val - minVal) / valRange) * 75 + 10));

      const [yStr, mStr] = p.month.split('-');
      const label = `${mStr}/${yStr.slice(2)}`;

      return {
        month: p.month,
        label,
        value: val,
        cost: isTRY ? p.costTRY : p.costUSD,
        retPct,
        height,
      };
    });
  }, [filteredSeries, isTRY]);

  // Yıllık Kümülatif Getiri Tablosu
  const yearRows = useMemo(() => {
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

    const rows: { year: string; startVal: number; endVal: number; retPct: number }[] = [];
    for (const [y, data] of map.entries()) {
      const start = isTRY ? data.start.valueTRY : data.start.valueUSD;
      const end = isTRY ? data.end.valueTRY : data.end.valueUSD;
      const retPct = start > 0 ? ((end / start) - 1) * 100 : 0;
      rows.push({ year: y, startVal: start, endVal: end, retPct });
    }
    return rows.reverse();
  }, [series, isTRY]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER (Tam Genişlik) */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Portföy Gelişimi</Text>
          <Text style={[styles.pageSubtitle, { color: theme.text.muted }]}>
            Aylık büyüme ve varlık kırılımları
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
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Gelişim verileri hesaplanıyor...</Text>
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
          {/* 2. HERO KPI KARTLARI (3'lü Grid - Tam Genişlik) */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.kpiRow}>
              {/* Toplam Portföy Değeri */}
              <View style={[styles.kpiBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>GÜNCEL DEĞER</Text>
                <Text style={[styles.kpiBigVal, { color: theme.text.primary }]}>
                  {formatCurrency(currentValue, currency)}
                </Text>
                <View style={styles.kpiBottomRow}>
                  <Text style={[styles.kpiSubText, { color: theme.text.muted }]}>Toplam Maliyet:</Text>
                  <Text style={[styles.kpiCostText, { color: theme.text.secondary }]}>
                    {formatCurrency(currentCost, currency)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.kpiRow, { marginTop: 8 }]}>
              {/* Toplam Kâr / Getiri */}
              <View style={[styles.kpiBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle, flex: 1 }]}>
                <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>TOPLAM GETİRİ</Text>
                <Text
                  style={[
                    styles.kpiMidVal,
                    { color: totalProfit >= 0 ? theme.profit.main : theme.loss.main },
                  ]}
                >
                  {formatPercent(totalProfitRate)}
                </Text>
                <Text style={[styles.kpiProfitAmt, { color: totalProfit >= 0 ? theme.profit.main : theme.loss.main }]}>
                  {formatCurrency(totalProfit, currency)}
                </Text>
              </View>

              {/* BES Birikimi */}
              <View style={[styles.kpiBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle, flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={13} color={theme.amber.main} />
                  <Text style={[styles.kpiLabel, { color: theme.text.muted }]}>BES BİRİKİMİ</Text>
                </View>
                <Text style={[styles.kpiMidVal, { color: theme.amber.main }]}>
                  {formatCurrency(besValue, currency)}
                </Text>
                <Text style={[styles.kpiSubText, { color: theme.text.muted }]}>Emeklilik Fonları</Text>
              </View>
            </View>
          </View>

          {/* 3. GELİŞİM GRAFİĞİ & METRİK SEÇİCİ (Tam Genişlik) */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={16} color={theme.brand.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Büyüme Grafiği
                </Text>
              </View>

              {/* Yıl Filtresi */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                {availableYears.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearBtn,
                      selectedYear === yr && [styles.activeYearBtn, { backgroundColor: theme.brand.primary }],
                      selectedYear !== yr && { backgroundColor: theme.surfaceMuted },
                    ]}
                    onPress={() => setSelectedYear(yr)}
                  >
                    <Text
                      style={[
                        styles.yearBtnText,
                        { color: selectedYear === yr ? '#ffffff' : theme.text.muted },
                      ]}
                    >
                      {yr === 'ALL' ? 'Tümü' : yr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Metrik Butonları (Değer / Aylık Getiri) */}
            <View style={[styles.metricSegment, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <TouchableOpacity
                style={[
                  styles.metricBtn,
                  selectedMetric === 'value' && [styles.activeMetricBtn, { backgroundColor: theme.surface }],
                ]}
                onPress={() => setSelectedMetric('value')}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    { color: selectedMetric === 'value' ? theme.brand.primary : theme.text.muted },
                    selectedMetric === 'value' && { fontWeight: '800' },
                  ]}
                >
                  Portföy Değeri
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricBtn,
                  selectedMetric === 'return' && [styles.activeMetricBtn, { backgroundColor: theme.surface }],
                ]}
                onPress={() => setSelectedMetric('return')}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    { color: selectedMetric === 'return' ? theme.brand.primary : theme.text.muted },
                    selectedMetric === 'return' && { fontWeight: '800' },
                  ]}
                >
                  Aylık Getiri (%)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Çubuk Grafik Alanı */}
            {chartBars.length > 0 ? (
              <View style={styles.chartWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartBarsScroll}>
                  {chartBars.map((bar, bIdx) => {
                    const isPos = bar.retPct >= 0;
                    const barColor =
                      selectedMetric === 'value'
                        ? theme.brand.primary
                        : isPos
                        ? theme.profit.main
                        : theme.loss.main;

                    return (
                      <View key={`growth-bar-${bIdx}`} style={styles.chartColumn}>
                        {/* Üst Yüzde / Değer Etiketi */}
                        <Text style={[styles.chartTopLabel, { color: theme.text.muted }]}>
                          {selectedMetric === 'value'
                            ? (bar.value >= 1000 ? `${Math.round(bar.value / 1000)}k` : Math.round(bar.value))
                            : formatPercent(bar.retPct)}
                        </Text>

                        {/* Bar Çubuğu */}
                        <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: selectedMetric === 'value' ? bar.height : Math.max(10, Math.min(80, Math.abs(bar.retPct) * 4 + 10)),
                              backgroundColor: barColor,
                              opacity: 0.75 + (bIdx / chartBars.length) * 0.25,
                            },
                          ]}
                        />

                        {/* Ay Etiketi */}
                        <Text style={[styles.chartMonthLabel, { color: theme.text.muted }]}>
                          {bar.label}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: theme.text.muted }]}>Grafik verisi bulunamadı.</Text>
              </View>
            )}
          </View>

          {/* 4. YILLIK KÜMÜLATİF GETİRİLER TABLOSU */}
          {yearRows.length > 0 && (
            <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={16} color={theme.profit.main} />
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                    Yıllık Kümülatif Getiriler
                  </Text>
                </View>
              </View>

              <View style={styles.yearTable}>
                <View style={[styles.yearTableHeader, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.thYearText, { color: theme.text.muted, width: '22%' }]}>Yıl</Text>
                  <Text style={[styles.thYearText, { color: theme.text.muted, width: '26%', textAlign: 'center' }]}>Başlangıç</Text>
                  <Text style={[styles.thYearText, { color: theme.text.muted, width: '26%', textAlign: 'center' }]}>Kapanış</Text>
                  <Text style={[styles.thYearText, { color: theme.text.muted, width: '26%', textAlign: 'right' }]}>Getiri %</Text>
                </View>

                {yearRows.map((row) => {
                  const isPos = row.retPct >= 0;
                  return (
                    <View key={row.year} style={[styles.yearTableRow, { borderBottomColor: theme.borderSubtle }]}>
                      <Text style={[styles.tdYearText, { color: theme.text.primary, width: '22%' }]}>
                        {row.year}
                      </Text>
                      <Text style={[styles.tdValText, { color: theme.text.secondary, width: '26%', textAlign: 'center' }]}>
                        {formatCurrency(row.startVal, currency)}
                      </Text>
                      <Text style={[styles.tdValText, { color: theme.text.primary, width: '26%', textAlign: 'center', fontWeight: '700' }]}>
                        {formatCurrency(row.endVal, currency)}
                      </Text>
                      <View style={{ width: '26%', alignItems: 'flex-end' }}>
                        <View style={[styles.retBadge, { backgroundColor: isPos ? theme.profit.soft : theme.loss.soft }]}>
                          <Text style={[styles.retBadgeText, { color: isPos ? theme.profit.main : theme.loss.main }]}>
                            {formatPercent(row.retPct)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* 5. AY SONU KAPANIKLARI & VARLIK DAĞILIMI DÖKÜMÜ */}
          <View style={[styles.fullWidthSection, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color={theme.brand.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  Aylık Kapanış Dökümleri
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: theme.text.muted }]}>
                {series.length} Ay
              </Text>
            </View>

            <View style={styles.monthlyListContainer}>
              {[...series].reverse().map((point, pIdx) => {
                const total = isTRY ? point.valueTRY : point.valueUSD;
                const cost = isTRY ? point.costTRY : point.costUSD;
                const [yStr, mStr] = point.month.split('-');

                return (
                  <View
                    key={`month-card-${point.month}-${pIdx}`}
                    style={[
                      styles.monthlyCard,
                      { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                    ]}
                  >
                    {/* Ay Kartı Başlığı */}
                    <View style={styles.monthlyCardHeader}>
                      <View style={styles.monthBadge}>
                        <Text style={[styles.monthBadgeText, { color: theme.brand.primary }]}>
                          {mStr}.{yStr}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.monthCardTotal, { color: theme.text.primary }]}>
                          {formatCurrency(total, currency)}
                        </Text>
                        <Text style={[styles.monthCardCost, { color: theme.text.muted }]}>
                          Maliyet: {formatCurrency(cost, currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Varlık Kırılım Çipleri */}
                    {point.byType && (
                      <View style={[styles.typesGrid, { borderTopColor: theme.borderSubtle, borderTopWidth: 1, paddingTop: 8, marginTop: 8 }]}>
                        {ASSET_TYPE_KEYS.map((typeKey) => {
                          const item = point.byType[typeKey];
                          const itemVal = item ? (isTRY ? item.valueTRY : item.valueUSD) : 0;
                          if (itemVal <= 0) return null;
                          const badge = getAssetTypeBadgeColor(typeKey);

                          return (
                            <View key={typeKey} style={[styles.typeChipCell, { backgroundColor: theme.surface }]}>
                              <View style={[styles.typeMiniDot, { backgroundColor: badge.text }]} />
                              <Text style={[styles.typeChipLabel, { color: theme.text.muted }]}>
                                {getAssetTypeLabel(typeKey)}:
                              </Text>
                              <Text style={[styles.typeChipVal, { color: theme.text.primary }]}>
                                {formatCurrency(itemVal, currency)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
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
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kpiBigVal: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  kpiMidVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  kpiProfitAmt: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  kpiBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  kpiSubText: {
    fontSize: 10,
    fontWeight: '500',
  },
  kpiCostText: {
    fontSize: 10,
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
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  yearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  activeYearBtn: {},
  yearBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricSegment: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  metricBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeMetricBtn: {
    shadowOpacity: 0.05,
  },
  metricBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartWrapper: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  chartBarsScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 10,
    paddingHorizontal: 4,
  },
  chartColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    width: 44,
  },
  chartTopLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  chartBarFill: {
    width: 24,
    borderRadius: 4,
  },
  chartMonthLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
  },
  yearTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  yearTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  thYearText: {
    fontSize: 10,
    fontWeight: '700',
  },
  yearTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  tdYearText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tdValText: {
    fontSize: 11,
  },
  retBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  monthlyListContainer: {
    gap: 8,
  },
  monthlyCard: {
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  monthCardTotal: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthCardCost: {
    fontSize: 10,
    marginTop: 1,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChipCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 4,
  },
  typeMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typeChipLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  typeChipVal: {
    fontSize: 9,
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
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
});
