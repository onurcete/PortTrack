import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
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
import { useCurrencyStore } from '../../stores/currencyStore';
import { SelectModal, SelectOption } from '../../components/SelectModal';
import { haptic } from '../../utils/haptics';
import { AssetType, PeriodReturns } from '../../types';

export type GrowthByType = Partial<Record<AssetType, { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number }>> & {
  [key: string]: { valueTRY: number; valueUSD: number; costTRY: number; costUSD: number } | undefined;
};

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

function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function formatCompactMoney(value: number, currency: 'TRY' | 'USD'): string {
  const sym = currency === 'TRY' ? '₺' : '$';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return `${value.toFixed(0)}`;
}

const ASSET_COLORS: Record<AssetType, string> = {
  BES: '#8b5cf6',
  BIST: '#3b82f6',
  TEFAS: '#10b981',
  FOREIGN: '#f59e0b',
  FX: '#06b6d4',
  METAL: '#eab308',
  CRYPTO: '#ec4899',
};

const ASSET_COLUMN_KEYS: { key: AssetType; label: string }[] = [
  { key: 'BES', label: 'BES' },
  { key: 'BIST', label: 'BIST' },
  { key: 'TEFAS', label: 'TEFAS FON' },
  { key: 'FOREIGN', label: 'YABANCI' },
  { key: 'FX', label: 'DÖVİZ' },
  { key: 'METAL', label: 'MADEN' },
  { key: 'CRYPTO', label: 'KRİPTO' },
];

function ValueLineChart({
  data,
  currency,
  theme,
  isSingleYear,
  width,
}: {
  data: { month: string; label: string; value: number; cost: number }[];
  currency: 'TRY' | 'USD';
  theme: any;
  isSingleYear: boolean;
  width: number;
}) {
  if (!data || data.length === 0) return null;

  const chartHeight = 155;
  const paddingLeft = 20;
  const paddingRight = 20;
  const paddingTop = 26;
  const paddingBottom = 28;

  const chartWidth = isSingleYear ? Math.max(width - 48, 300) : Math.max(data.length * 46, width - 48);
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values) * 0.96;
  const maxVal = Math.max(...values) * 1.04;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = paddingLeft + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
    const y = paddingTop + (1 - (d.value - minVal) / range) * plotHeight;
    return { x, y, ...d };
  });

  // Smooth SVG Path with Bezier curves
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

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

  const ChartSvg = (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
          <Stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.05" />
          <Stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
        </LinearGradient>
      </Defs>

      {/* Grid Lines */}
      <Path
        d={`M ${paddingLeft} ${paddingTop} L ${chartWidth - paddingRight} ${paddingTop}`}
        stroke={theme.borderSubtle}
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      <Path
        d={`M ${paddingLeft} ${paddingTop + plotHeight / 2} L ${chartWidth - paddingRight} ${paddingTop + plotHeight / 2}`}
        stroke={theme.borderSubtle}
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      <Path
        d={`M ${paddingLeft} ${chartHeight - paddingBottom} L ${chartWidth - paddingRight} ${chartHeight - paddingBottom}`}
        stroke={theme.borderSubtle}
        strokeWidth="1"
      />

      {/* Filled Area */}
      <Path d={areaPath} fill="url(#growthAreaGrad)" />

      {/* Main Line */}
      <Path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />

      {/* Data Points and Labels */}
      {points.map((p, i) => {
        const isHighest = p.value === Math.max(...values);
        const isLowest = p.value === Math.min(...values);
        const isLast = i === points.length - 1;
        const showBadge = isSingleYear || isHighest || isLowest || isLast;

        return (
          <React.Fragment key={`point-${p.month}-${i}`}>
            {/* Top Value Badge */}
            {showBadge && (
              <SvgText
                x={p.x}
                y={p.y - 8}
                fill="#a78bfa"
                fontSize={isSingleYear && points.length > 8 ? "8" : "9"}
                fontWeight="800"
                textAnchor="middle"
              >
                {formatCompactMoney(p.value, currency)}
              </SvgText>
            )}

            {/* Point Dot */}
            <Circle
              cx={p.x}
              cy={p.y}
              r={isLast ? "4.5" : "3.5"}
              fill="#ffffff"
              stroke="#7c3aed"
              strokeWidth="2.5"
            />

            {/* Bottom Month Label */}
            <SvgText
              x={p.x}
              y={chartHeight - 8}
              fill={theme.text.muted}
              fontSize={isSingleYear && points.length > 8 ? "9" : "10"}
              fontWeight="700"
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );

  if (isSingleYear) {
    return <View style={{ alignItems: 'center', width: '100%' }}>{ChartSvg}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
      {ChartSvg}
    </ScrollView>
  );
}

export default function GrowthScreen() {
  const { theme } = useThemeStore();
  const { currency, isTRY } = useCurrencyStore();
  const { width: windowWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Grafik Seçenekleri
  const [chartMetric, setChartMetric] = useState<'return' | 'value' | 'allocation'>('return');
  const [chartYear, setChartYear] = useState<string>('ALL');

  // Aylık Dağılım Tablosu Seçenekleri
  const [monthlyViewMode, setMonthlyViewMode] = useState<'return' | 'amount' | 'share'>('return');
  const [tableYear, setTableYear] = useState<string>('2026');

  // Kümülatif Yıllık Başlangıç Filtresi
  const [cumulFromYear, setCumulFromYear] = useState<string>('ALL');

  // Listbox Modalları
  const [chartYearModalOpen, setChartYearModalOpen] = useState(false);
  const [cumulYearModalOpen, setCumulYearModalOpen] = useState(false);
  const [tableYearModalOpen, setTableYearModalOpen] = useState(false);

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

  // Mevcut Yıllar Listesi
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (const p of series) {
      const y = p.month.slice(0, 4);
      if (y) yearsSet.add(y);
    }
    return Array.from(yearsSet).sort();
  }, [series]);

  // Ay bazında lookup map
  const fullByMonth = useMemo(() => {
    const map = new Map<string, GrowthPoint>();
    for (const p of series) {
      map.set(p.month, p);
    }
    return map;
  }, [series]);

  // Filtrelenmiş Grafik Verileri (Web ile %100 Birebir Hesaplama)
  const chartData = useMemo(() => {
    const filtered =
      chartYear === 'ALL'
        ? series
        : series.filter((p) => p.month.startsWith(chartYear));

    const sorted = filtered.slice().sort((a, b) => a.month.localeCompare(b.month));

    return sorted.map((p, idx) => {
      const val = isTRY ? p.valueTRY : p.valueUSD;
      let prev = idx > 0 ? sorted[idx - 1] : null;
      if (!prev) {
        const pk = prevMonthKey(p.month);
        prev = pk ? (fullByMonth.get(pk) ?? null) : null;
      }
      const prevVal = prev ? (isTRY ? prev.valueTRY : prev.valueUSD) : null;
      const returnPct = prevVal != null && prevVal > 0 ? ((val / prevVal) - 1) * 100 : 0;
      const [yStr, mStr] = p.month.split('-');
      const label = chartYear === 'ALL' ? `${yStr.slice(2)}.${mStr}` : getMonthShortLabel(p.month);

      return {
        month: p.month,
        label,
        value: val,
        cost: isTRY ? p.costTRY : p.costUSD,
        returnPct,
        byType: p.byType,
      };
    });
  }, [series, chartYear, isTRY, fullByMonth]);

  // Listbox Seçenekleri
  const chartYearOptions: SelectOption[] = useMemo(() => [
    { key: 'ALL', label: 'Tüm Zamanlar' },
    ...availableYears.map((y) => ({ key: y, label: `${y} Yılı` })),
  ], [availableYears]);

  const cumulYearOptions: SelectOption[] = useMemo(() => [
    { key: 'ALL', label: 'Tüm Yıllar (Kümülatif)', subLabel: 'Bütün yılları ve genel toplamı listeler' },
    ...availableYears.map((y) => ({ key: y, label: `${y} Yılı`, subLabel: `${y} yılı başlangıç ve bitiş getirisi` })),
  ], [availableYears]);

  const tableYearOptions: SelectOption[] = useMemo(() => [
    ...availableYears.map((y) => ({ key: y, label: `${y} Yılı` })),
  ], [availableYears]);

  // Dönem Özet Metrikleri (Hero)
  const periodSummary = useMemo(() => {
    if (chartData.length === 0) return null;
    const sorted = chartData.slice().sort((a, b) => a.month.localeCompare(b.month));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalCurrentTRY = series[series.length - 1]?.valueTRY ?? 0;
    const totalCurrentUSD = series[series.length - 1]?.valueUSD ?? 0;

    let baselinePoint: GrowthPoint | null = null;
    if (chartYear !== 'ALL') {
      baselinePoint = fullByMonth.get(`${Number(chartYear) - 1}-12`) ?? null;
    }

    const startVal = baselinePoint ? (isTRY ? baselinePoint.valueTRY : baselinePoint.valueUSD) : first.value;
    const endVal = last.value;
    const gainVal = endVal - startVal;
    const gainPct = startVal > 0 ? (gainVal / startVal) * 100 : 0;

    const [firstY, firstM] = first.month.split('-');
    const [lastY, lastM] = last.month.split('-');

    return {
      totalCurrentTRY,
      totalCurrentUSD,
      startDateLabel: baselinePoint ? `31 Ara ${Number(firstY) - 1}` : `1 ${firstM}.${firstY}`,
      endDateLabel: `31 ${firstM}.${lastY}`,
      startVal,
      endVal,
      gainVal,
      gainPct,
      usdReturnPct: periodReturns?.oneYearUSD ?? 0,
    };
  }, [chartData, series, periodReturns, chartYear, isTRY, fullByMonth]);

  // Kümülatif Yıllık Tablo Satırları (Web ile %100 Birebir Aralık Sonu Karşılaştırması)
  const cumulativeYearlyRows = useMemo(() => {
    const byYear = new Map<string, GrowthPoint[]>();
    for (const p of series) {
      if (p.partialData && !p.valueTRY) continue;
      const y = p.month.slice(0, 4);
      const arr = byYear.get(y) ?? [];
      arr.push(p);
      byYear.set(y, arr);
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

    const allYears = Array.from(byYear.keys()).sort();
    let totalStartPoint: GrowthPoint | null = null;

    for (const y of allYears) {
      if (cumulFromYear !== 'ALL' && y !== cumulFromYear) continue;

      const months = byYear.get(y)!.sort((a, b) => a.month.localeCompare(b.month));
      const last = months[months.length - 1];

      // Web ile birebir: Yılın başlangıcı = Bir önceki yılın 31 Aralık sonu
      const prevDec = fullByMonth.get(`${Number(y) - 1}-12`);
      const startPoint = prevDec ?? months[0];

      if (!totalStartPoint) totalStartPoint = startPoint;

      const startTRY = startPoint.valueTRY;
      const endTRY = last.valueTRY;
      const startUSD = startPoint.valueUSD;
      const endUSD = last.valueUSD;

      const returnTRY = startTRY > 0 ? ((endTRY / startTRY) - 1) * 100 : null;
      const returnUSD = startUSD > 0 ? ((endUSD / startUSD) - 1) * 100 : null;

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
    if (cumulFromYear === 'ALL' && rows.length > 1 && totalStartPoint) {
      const allMonths = series.slice().sort((a, b) => a.month.localeCompare(b.month));
      const totalLast = allMonths[allMonths.length - 1];

      const startTRY = totalStartPoint.valueTRY;
      const endTRY = totalLast.valueTRY;
      const startUSD = totalStartPoint.valueUSD;
      const endUSD = totalLast.valueUSD;

      const totalRetTRY = startTRY > 0 ? ((endTRY / startTRY) - 1) * 100 : null;
      const totalRetUSD = startUSD > 0 ? ((endUSD / startUSD) - 1) * 100 : null;

      rows.push({
        year: 'TOPLAM',
        startTRY,
        endTRY,
        startUSD,
        endUSD,
        returnTRY: totalRetTRY,
        returnUSD: totalRetUSD,
      });
    }

    return rows;
  }, [series, cumulFromYear, fullByMonth]);

  // Aylık Dağılım Tablosu Verileri (Web ile %100 Birebir)
  const monthlyTableData = useMemo(() => {
    const yearPoints = series
      .filter((p) => p.month.startsWith(tableYear))
      .sort((a, b) => a.month.localeCompare(b.month));

    if (yearPoints.length === 0) return { rows: [], yearSummary: null };

    const rows = yearPoints.map((p, idx) => {
      // Ocak ayı için bir önceki yılın Aralık ayını al
      const prev = idx > 0 ? yearPoints[idx - 1] : fullByMonth.get(`${Number(tableYear) - 1}-12`);

      const totalVal = isTRY ? p.valueTRY : p.valueUSD;
      const prevTotal = prev ? (isTRY ? prev.valueTRY : prev.valueUSD) : null;
      const totalReturnPct = (totalVal > 0 && prevTotal && prevTotal > 0)
        ? ((totalVal / prevTotal) - 1) * 100
        : null;

      const cells: Record<
        AssetType,
        { amount: number; returnPct: number | null; sharePct: number }
      > = {} as any;

      for (const item of ASSET_COLUMN_KEYS) {
        const typeData = p.byType?.[item.key];
        const prevTypeData = prev?.byType?.[item.key];

        const amount = typeData ? (isTRY ? typeData.valueTRY : typeData.valueUSD) : 0;
        const prevAmount = prevTypeData ? (isTRY ? prevTypeData.valueTRY : prevTypeData.valueUSD) : null;

        const returnPct =
          prevAmount && prevAmount > 0 && amount > 0
            ? ((amount / prevAmount) - 1) * 100
            : null;
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

    // Yıl Sonu Toplam Getirisi Satırı (Aralık sonu vs önceki yıl Aralık sonu)
    const firstPoint = yearPoints[0];
    const lastPoint = yearPoints[yearPoints.length - 1];
    const prevDecPoint = fullByMonth.get(`${Number(tableYear) - 1}-12`);
    const startPoint = prevDecPoint ?? firstPoint;

    const totalStart = isTRY ? startPoint.valueTRY : startPoint.valueUSD;
    const totalEnd = isTRY ? lastPoint.valueTRY : lastPoint.valueUSD;
    const yearTotalReturn = (totalStart > 0 && totalEnd > 0) ? ((totalEnd / totalStart) - 1) * 100 : 0;

    const summaryCells: Record<AssetType, { returnPct: number | null }> = {} as any;
    for (const item of ASSET_COLUMN_KEYS) {
      const sItem = startPoint.byType?.[item.key];
      const eItem = lastPoint.byType?.[item.key];
      const sVal = sItem ? (isTRY ? sItem.valueTRY : sItem.valueUSD) : 0;
      const eVal = eItem ? (isTRY ? eItem.valueTRY : eItem.valueUSD) : 0;
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
  }, [series, tableYear, isTRY, fullByMonth]);

  const maxValInChart = useMemo(() => {
    return Math.max(...chartData.map((d) => d.value), 1);
  }, [chartData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
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
                  onPress={() => {
                    haptic.selection();
                    setChartMetric('return');
                  }}
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
                  onPress={() => {
                    haptic.selection();
                    setChartMetric('value');
                  }}
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

                <TouchableOpacity
                  style={[
                    styles.chartTabBtn,
                    chartMetric === 'allocation' && [styles.activeChartTabBtn, { backgroundColor: theme.surface }],
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setChartMetric('allocation');
                  }}
                >
                  <Text
                    style={[
                      styles.chartTabText,
                      { color: chartMetric === 'allocation' ? theme.brand.primary : theme.text.muted },
                      chartMetric === 'allocation' && { fontWeight: '800' },
                    ]}
                  >
                    Varlık Dağılımı
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

            {/* Yıl Filtresi Dropdown (Listbox) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }}>
              <Text style={[styles.chartRangeLabel, { color: theme.text.muted }]}>Dönem Filtresi:</Text>
              <TouchableOpacity
                style={[
                  styles.chartYearSelectBtn,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
                onPress={() => setChartYearModalOpen(true)}
                activeOpacity={0.8}
              >
                <Calendar size={13} color={theme.brand.primary} />
                <Text style={[styles.chartYearSelectText, { color: theme.text.primary }]}>
                  {chartYear === 'ALL' ? 'Tüm Zamanlar' : `${chartYear} Yılı`}
                </Text>
                <ChevronDown size={13} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* ÇUBUK GRAFİK (BAR CHART - DİNAMİK METRİK DESTEĞİ) */}
            <View style={styles.barChartContainer}>
              {chartMetric === 'return' ? (
                /* 1. METRİK: AYLIK GETİRİ YÜZDESİ GRAFİĞİ */
                chartYear !== 'ALL' ? (
                  <View style={styles.barChartRowSingleYear}>
                    {chartData.map((item, idx) => {
                      const isPos = item.returnPct >= 0;
                      const isZero = Math.abs(item.returnPct) < 0.05;
                      const barHeight = Math.max(4, Math.min(50, Math.abs(item.returnPct) * 2 + 4));

                      return (
                        <View key={`barchart-ret-${item.month}-${idx}`} style={styles.barChartColSingleYear}>
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

                          <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

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
                        <View key={`barchart-ret-all-${item.month}-${idx}`} style={styles.barChartCol}>
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

                          <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

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

                          <Text style={[styles.barDateLabel, { color: theme.text.muted }]}>
                            {item.label}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                )
              ) : chartMetric === 'value' ? (
                /* 2. METRİK: PORTFÖY DEĞERİ ÇİZGİ GRAFİĞİ (LINE / AREA CHART) */
                <ValueLineChart
                  data={chartData}
                  currency={currency}
                  theme={theme}
                  isSingleYear={chartYear !== 'ALL'}
                  width={windowWidth}
                />
              ) : (
                /* 3. METRİK: VARLIK DAĞILIMI (STACKED BAR) */
                <View>
                  {chartYear !== 'ALL' ? (
                    <View style={styles.barChartRowSingleYear}>
                      {chartData.map((item, idx) => {
                        return (
                          <View key={`barchart-alloc-${item.month}-${idx}`} style={styles.barChartColSingleYear}>
                            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                              <View style={[styles.barStickMini, { height: 95, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.surfaceMuted }]}>
                                {ASSET_COLUMN_KEYS.map((col) => {
                                  const byTypeItem = item.byType?.[col.key];
                                  const typeVal = byTypeItem ? (isTRY ? byTypeItem.valueTRY : byTypeItem.valueUSD) : 0;
                                  const segHeight = item.value > 0 ? (typeVal / item.value) * 95 : 0;
                                  if (segHeight <= 0) return null;
                                  return (
                                    <View
                                      key={col.key}
                                      style={{
                                        height: segHeight,
                                        width: '100%',
                                        backgroundColor: ASSET_COLORS[col.key],
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            </View>
                            <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle, marginTop: 2 }]} />
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
                        return (
                          <View key={`barchart-alloc-all-${item.month}-${idx}`} style={styles.barChartCol}>
                            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                              <View style={[styles.barStick, { height: 110, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.surfaceMuted }]}>
                                {ASSET_COLUMN_KEYS.map((col) => {
                                  const byTypeItem = item.byType?.[col.key];
                                  const typeVal = byTypeItem ? (isTRY ? byTypeItem.valueTRY : byTypeItem.valueUSD) : 0;
                                  const segHeight = item.value > 0 ? (typeVal / item.value) * 110 : 0;
                                  if (segHeight <= 0) return null;
                                  return (
                                    <View
                                      key={col.key}
                                      style={{
                                        height: segHeight,
                                        width: '100%',
                                        backgroundColor: ASSET_COLORS[col.key],
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            </View>
                            <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle, marginTop: 2 }]} />
                            <Text style={[styles.barDateLabel, { color: theme.text.muted }]}>
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Varlık Lejantı */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 10 }}>
                    {ASSET_COLUMN_KEYS.map((col) => (
                      <View key={`legend-${col.key}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: ASSET_COLORS[col.key] }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.text.muted }}>{col.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
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

              {/* Yıl Filtresi Dropdown (Listbox) */}
              <TouchableOpacity
                style={[styles.miniYearFilterBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={() => setCumulYearModalOpen(true)}
                activeOpacity={0.8}
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

              {/* Yıl Seçici (Listbox) */}
              <TouchableOpacity
                style={[styles.miniYearFilterBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
                onPress={() => setTableYearModalOpen(true)}
                activeOpacity={0.8}
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

      {/* 1. Grafik Dönem Filtresi Modalı */}
      <SelectModal
        visible={chartYearModalOpen}
        title="Grafik Dönemi Seçin"
        options={chartYearOptions}
        selectedValue={chartYear}
        onSelect={(val) => setChartYear(val)}
        onClose={() => setChartYearModalOpen(false)}
      />

      {/* 2. Kümülatif Yıllık Özet Filtresi Modalı */}
      <SelectModal
        visible={cumulYearModalOpen}
        title="Kümülatif Başlangıç Yılı"
        options={cumulYearOptions}
        selectedValue={cumulFromYear}
        onSelect={(val) => setCumulFromYear(val)}
        onClose={() => setCumulYearModalOpen(false)}
      />

      {/* 3. Aylık Dağılım Yılı Filtresi Modalı */}
      <SelectModal
        visible={tableYearModalOpen}
        title="Aylık Dağılım Yılı"
        options={tableYearOptions}
        selectedValue={tableYear}
        onSelect={(val) => setTableYear(val)}
        onClose={() => setTableYearModalOpen(false)}
      />
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
    fontSize: 11,
    fontWeight: '600',
  },
  chartYearSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  chartYearSelectText: {
    fontSize: 11,
    fontWeight: '700',
  },
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
