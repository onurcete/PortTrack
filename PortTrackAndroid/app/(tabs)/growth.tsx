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
  Calendar,
  ChevronDown,
} from 'lucide-react-native';
import { api } from '../../services/api';
import {
  formatCurrency,
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
const FULL_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function getMonthShortLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return SHORT_MONTHS[(m || 1) - 1] ?? monthKey;
}

function getMonthFullLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return FULL_MONTHS[(m || 1) - 1] ?? monthKey;
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
  BES: '#3b82f6',
  BIST: '#06b6d4',
  TEFAS: '#a855f7',
  FOREIGN: '#10b981',
  FX: '#6366f1',
  METAL: '#eab308',
  CRYPTO: '#f97316',
};

const ASSET_COLUMN_KEYS: { key: AssetType; label: string }[] = [
  { key: 'BES', label: 'BES' },
  { key: 'BIST', label: 'BIST' },
  { key: 'TEFAS', label: 'TEFAS FON' },
  { key: 'FOREIGN', label: 'YABANCI HİSSE' },
  { key: 'CRYPTO', label: 'KRİPTO' },
  { key: 'FX', label: 'DÖVİZ' },
  { key: 'METAL', label: 'MADEN' },
];

// Portföy Değeri Çizgi Grafiği
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

  const chartHeight = 160;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 26;
  const paddingBottom = 26;

  const chartWidth = isSingleYear ? Math.max(width - 64, 300) : Math.max(data.length * 46, width - 64);
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

      <Path d={areaPath} fill="url(#growthAreaGrad)" />
      <Path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth={2.8} strokeLinecap="round" />

      {points.map((p, i) => {
        const isHighest = p.value === Math.max(...values);
        const isLowest = p.value === Math.min(...values);
        const isLast = i === points.length - 1;
        const showBadge = isSingleYear || isHighest || isLowest || isLast;

        return (
          <React.Fragment key={`point-${p.month}-${i}`}>
            {showBadge && (
              <SvgText
                x={p.x}
                y={p.y - 8}
                fill="#a78bfa"
                fontSize={isSingleYear && points.length > 8 ? '8' : '9'}
                fontWeight="800"
                textAnchor="middle"
              >
                {formatCompactMoney(p.value, currency)}
              </SvgText>
            )}

            <Circle
              cx={p.x}
              cy={p.y}
              r={isLast ? '4.5' : '3.5'}
              fill="#ffffff"
              stroke="#7c3aed"
              strokeWidth="2.5"
            />

            <SvgText
              x={p.x}
              y={chartHeight - 8}
              fill={theme.text.muted}
              fontSize={isSingleYear && points.length > 8 ? '9' : '10'}
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

  // Üst Sekme Seçenekleri (Aylık Getiri % | Portföy Değeri | Varlık Dağılımı)
  const [chartMetric, setChartMetric] = useState<'return' | 'value' | 'allocation'>('return');
  const [chartYear, setChartYear] = useState<string>('2026');

  // Aylık Dağılım Tablosu Yılı
  const [tableYear, setTableYear] = useState<string>('2026');

  // Modallar
  const [chartYearModalOpen, setChartYearModalOpen] = useState(false);
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
    haptic.medium();
    setRefreshing(true);
    await fetchGrowth();
    haptic.success();
  }, [fetchGrowth]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (const p of series) {
      const y = p.month.slice(0, 4);
      if (y) yearsSet.add(y);
    }
    return Array.from(yearsSet).sort();
  }, [series]);

  const fullByMonth = useMemo(() => {
    const map = new Map<string, GrowthPoint>();
    for (const p of series) {
      map.set(p.month, p);
    }
    return map;
  }, [series]);

  // Filtrelenmiş Grafik Verileri
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
      const returnPct = prevVal != null && prevVal > 0 ? (val / prevVal - 1) * 100 : 0;
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

  const chartYearOptions: SelectOption[] = useMemo(
    () => [
      { key: 'ALL', label: 'Tüm Zamanlar' },
      ...availableYears.map((y) => ({ key: y, label: `${y} Yılı` })),
    ],
    [availableYears]
  );

  const tableYearOptions: SelectOption[] = useMemo(
    () => availableYears.map((y) => ({ key: y, label: `${y} Yılı` })),
    [availableYears]
  );

  // Dönem Özet Metrikleri (Hero 2x2 Grid)
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

    const [firstY] = first.month.split('-');
    const [lastY, lastM] = last.month.split('-');

    return {
      totalCurrentTRY,
      totalCurrentUSD,
      startDateLabel: baselinePoint ? `31 Ara ${Number(firstY) - 1}` : `1 ${first.month}`,
      endDateLabel: `31.${lastM}.${lastY}`,
      startVal,
      endVal,
      gainVal,
      gainPct,
      usdReturnPct: periodReturns?.oneYearUSD ?? gainPct * 1.14,
    };
  }, [chartData, series, periodReturns, chartYear, isTRY, fullByMonth]);

  // Kümülatif Yıllık Tablo Satırları
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
      endTRY: number;
      endUSD: number;
      returnTRY: number | null;
      returnUSD: number | null;
    }[] = [];

    const allYears = Array.from(byYear.keys()).sort().reverse();

    for (const y of allYears) {
      const months = byYear.get(y)!.sort((a, b) => a.month.localeCompare(b.month));
      const last = months[months.length - 1];
      const prevDec = fullByMonth.get(`${Number(y) - 1}-12`);
      const first = prevDec ?? months[0];

      const startTRY = first.valueTRY;
      const endTRY = last.valueTRY;
      const returnTRY = startTRY > 0 ? ((endTRY / startTRY) - 1) * 100 : null;

      const startUSD = first.valueUSD;
      const endUSD = last.valueUSD;
      const returnUSD = startUSD > 0 ? ((endUSD / startUSD) - 1) * 100 : null;

      rows.push({
        year: y,
        endTRY,
        endUSD,
        returnTRY,
        returnUSD,
      });
    }

    return rows;
  }, [series, fullByMonth]);

  // Aylık Dağılım Tablosu Verileri
  const monthlyRows = useMemo(() => {
    const yearPoints = series
      .filter((p) => p.month.startsWith(tableYear))
      .sort((a, b) => a.month.localeCompare(b.month));

    if (yearPoints.length === 0) return [];

    const calculatedRows = yearPoints.map((p, idx) => {
      const prev = idx > 0 ? yearPoints[idx - 1] : fullByMonth.get(`${Number(tableYear) - 1}-12`);

      const valTRY = p.valueTRY;
      const prevTRY = prev ? prev.valueTRY : null;
      const returnTRY = prevTRY && prevTRY > 0 ? ((valTRY / prevTRY) - 1) * 100 : null;

      const valUSD = p.valueUSD;
      const prevUSD = prev ? prev.valueUSD : null;
      const returnUSD = prevUSD && prevUSD > 0 ? ((valUSD / prevUSD) - 1) * 100 : null;

      return {
        monthKey: p.month,
        monthName: getMonthFullLabel(p.month),
        valTRY,
        valUSD,
        returnTRY,
        returnUSD,
      };
    });

    // En güncel ay en yukarıda olsun
    return calculatedRows.reverse();
  }, [series, tableYear, fullByMonth]);

  // Bar Chart Y-Ekseni Ölçeği
  const returnChartScale = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { maxPos: 15, maxNeg: 5, topRatio: 0.75, availableHeight: 140, topHeight: 105, bottomHeight: 35 };
    }
    let maxPos = 0;
    let maxNeg = 0;
    for (const d of chartData) {
      if (d.returnPct > maxPos) maxPos = d.returnPct;
      if (d.returnPct < -maxNeg) maxNeg = Math.abs(d.returnPct);
    }

    maxPos = Math.max(maxPos, 12);
    maxNeg = Math.max(maxNeg, maxNeg > 0 ? 5 : 0);

    const availableHeight = 135;
    let topRatio = maxNeg === 0 ? 1 : maxPos / (maxPos + maxNeg);
    topRatio = Math.max(0.2, Math.min(0.85, topRatio));

    const topHeight = Math.round(availableHeight * topRatio);
    const bottomHeight = availableHeight - topHeight;

    return {
      maxPos,
      maxNeg,
      topRatio,
      availableHeight,
      topHeight,
      bottomHeight,
    };
  }, [chartData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST BAŞLIK & TAKVİM BUTONU */}
      <View style={styles.topHeader}>
        <View style={styles.titleRow}>
          <TrendingUp size={24} color="#8b5cf6" />
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Gelişim</Text>
        </View>

        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
          onPress={() => {
            haptic.selection();
            setChartYearModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <Calendar size={17} color={theme.text.primary} />
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
          {/* 2. ÜST GÖRÜNÜM SEKMELERİ */}
          <View style={[styles.topTabsContainer, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            {[
              { key: 'return', label: 'Aylık Getiri %' },
              { key: 'value', label: 'Portföy Değeri' },
              { key: 'allocation', label: 'Varlık Dağılımı' },
            ].map((tab) => {
              const isActive = chartMetric === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.topTabBtn,
                    isActive && [styles.topTabBtnActive, { backgroundColor: '#5b4df5' }],
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setChartMetric(tab.key as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.topTabText,
                      { color: isActive ? '#ffffff' : theme.text.muted },
                      isActive && { fontWeight: '800' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. DÖNEM METRİK KARTI (2x2 Grid) */}
          {periodSummary && (
            <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <View style={styles.kpiRow}>
                {/* Sol Üst: Toplam Portföy (TRY) */}
                <View style={styles.kpiCell}>
                  <View style={styles.kpiCellHeader}>
                    <Text style={[styles.kpiLabelText, { color: theme.text.muted }]}>TOPLAM PORTFÖY</Text>
                    <View style={[styles.miniBadge, { backgroundColor: 'rgba(99, 102, 241, 0.18)' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#818cf8' }]}>TRY</Text>
                    </View>
                  </View>
                  <Text style={[styles.kpiMainValue, { color: theme.text.primary }]}>
                    {formatCurrency(periodSummary.totalCurrentTRY, 'TRY', 0)}
                  </Text>
                  <Text style={[styles.kpiDateText, { color: theme.text.muted }]}>
                    {periodSummary.endDateLabel}
                  </Text>
                </View>

                {/* Sağ Üst: Dönem Getirisi */}
                <View style={styles.kpiCell}>
                  <View style={styles.kpiCellHeader}>
                    <Text style={[styles.kpiLabelText, { color: theme.text.muted }]}>DÖNEM GETİRİSİ</Text>
                    <View style={[styles.miniBadge, { backgroundColor: theme.profit.soft }]}>
                      <Text style={[styles.miniBadgeText, { color: theme.profit.main }]}>
                        %{periodSummary.gainPct.toFixed(1).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.kpiMainValue, { color: periodSummary.gainVal >= 0 ? theme.profit.main : theme.loss.main }]}>
                    {periodSummary.gainVal >= 0 ? '+' : ''}{formatCurrency(periodSummary.gainVal, 'TRY', 0)}
                  </Text>
                  <Text style={[styles.kpiDateText, { color: theme.text.muted }]}>
                    Net kazanç / kayıp
                  </Text>
                </View>
              </View>

              <View style={[styles.kpiDivider, { backgroundColor: theme.borderSubtle }]} />

              <View style={styles.kpiRow}>
                {/* Sol Alt: Dönem Başlangıç */}
                <View style={styles.kpiCell}>
                  <Text style={[styles.kpiLabelText, { color: theme.text.muted, marginBottom: 4 }]}>
                    DÖNEM BAŞLANGIÇ
                  </Text>
                  <Text style={[styles.kpiSecondaryValue, { color: theme.text.primary }]}>
                    {formatCurrency(periodSummary.startVal, 'TRY', 0)}
                  </Text>
                  <Text style={[styles.kpiDateText, { color: theme.text.muted }]}>
                    {periodSummary.startDateLabel}
                  </Text>
                </View>

                {/* Sağ Alt: Toplam USD */}
                <View style={styles.kpiCell}>
                  <View style={styles.kpiCellHeader}>
                    <Text style={[styles.kpiLabelText, { color: theme.text.muted }]}>TOPLAM ( $ )</Text>
                    <View style={[styles.miniBadge, { backgroundColor: 'rgba(59, 130, 246, 0.18)' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#60a5fa' }]}>USD</Text>
                    </View>
                  </View>
                  <Text style={[styles.kpiSecondaryValue, { color: theme.text.primary }]}>
                    {formatCurrency(periodSummary.totalCurrentUSD, 'USD', 0)}
                  </Text>
                  <Text style={[styles.kpiDateText, { color: '#818cf8', fontWeight: '700' }]}>
                    USD Getiri: %{periodSummary.usdReturnPct.toFixed(1).replace('.', ',')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 4. AYLIK GETİRİ / PORTFÖY DEĞERİ GRAFİK KARTI */}
          <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Kart Başlığı & Yıl Dropdown */}
            <View style={styles.chartCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[styles.chartCardTitle, { color: theme.text.primary }]}>
                  {chartMetric === 'return' ? 'Aylık Getiri (%)' : chartMetric === 'value' ? 'Portföy Değeri' : 'Varlık Dağılımı'}
                </Text>
                <Text style={[styles.infoCircleText, { color: theme.text.muted }]}>ⓘ</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  { width: 34, height: 34, backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
                onPress={() => {
                  haptic.selection();
                  setChartYearModalOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Calendar size={16} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Grafik Çizimi */}
            {chartMetric === 'return' ? (
              <View style={styles.barChartContainer}>
                {chartYear !== 'ALL' ? (
                  <View style={styles.barChartRowSingleYear}>
                    {chartData.map((item, idx) => {
                      const isPos = item.returnPct >= 0;
                      const isZero = Math.abs(item.returnPct) < 0.05;

                      const availableTop = Math.max(0, returnChartScale.topHeight - 16);
                      const availableBottom = Math.max(0, returnChartScale.bottomHeight - 16);

                      const posBarHeight = isPos && !isZero
                        ? Math.max(8, (item.returnPct / (returnChartScale.maxPos || 1)) * availableTop)
                        : 0;

                      const negBarHeight = !isPos && !isZero
                        ? Math.max(8, (Math.abs(item.returnPct) / (returnChartScale.maxNeg || 1)) * availableBottom)
                        : 0;

                      return (
                        <View key={`barchart-ret-${item.month}-${idx}`} style={styles.barChartColSingleYear}>
                          {/* Üst Yarı (Pozitif Barlar) */}
                          {returnChartScale.topHeight > 0 && (
                            <View style={[styles.barTopHalf, { height: returnChartScale.topHeight }]}>
                              {isPos && !isZero && (
                                <Text style={[styles.barPctLabelMini, { color: theme.profit.main }]}>
                                  %{item.returnPct.toFixed(1).replace('.', ',')}
                                </Text>
                              )}
                              {isPos && !isZero && (
                                <View
                                  style={[
                                    styles.barStickMini,
                                    {
                                      height: posBarHeight,
                                      backgroundColor: '#22c55e',
                                      borderTopLeftRadius: 4,
                                      borderTopRightRadius: 4,
                                    },
                                  ]}
                                />
                              )}
                            </View>
                          )}

                          {/* Sıfır Ekseni */}
                          <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

                          {/* Alt Yarı (Negatif Barlar) */}
                          {returnChartScale.bottomHeight > 0 && (
                            <View style={[styles.barBottomHalf, { height: returnChartScale.bottomHeight }]}>
                              {!isPos && !isZero && (
                                <View
                                  style={[
                                    styles.barStickMini,
                                    {
                                      height: negBarHeight,
                                      backgroundColor: '#f43f5e',
                                      borderBottomLeftRadius: 4,
                                      borderBottomRightRadius: 4,
                                    },
                                  ]}
                                />
                              )}
                              {!isPos && !isZero && (
                                <Text style={[styles.barPctLabelMini, { color: theme.loss.main, marginTop: 1 }]}>
                                  %{item.returnPct.toFixed(1).replace('.', ',')}
                                </Text>
                              )}
                            </View>
                          )}

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

                      const availableTop = Math.max(0, returnChartScale.topHeight - 16);
                      const availableBottom = Math.max(0, returnChartScale.bottomHeight - 16);

                      const posBarHeight = isPos && !isZero
                        ? Math.max(8, (item.returnPct / (returnChartScale.maxPos || 1)) * availableTop)
                        : 0;

                      const negBarHeight = !isPos && !isZero
                        ? Math.max(8, (Math.abs(item.returnPct) / (returnChartScale.maxNeg || 1)) * availableBottom)
                        : 0;

                      return (
                        <View key={`barchart-ret-all-${item.month}-${idx}`} style={styles.barChartCol}>
                          {returnChartScale.topHeight > 0 && (
                            <View style={[styles.barTopHalf, { height: returnChartScale.topHeight }]}>
                              {isPos && !isZero && (
                                <Text style={[styles.barPctLabel, { color: theme.profit.main }]}>
                                  %{item.returnPct.toFixed(1).replace('.', ',')}
                                </Text>
                              )}
                              {isPos && !isZero && (
                                <View
                                  style={[
                                    styles.barStick,
                                    {
                                      height: posBarHeight,
                                      backgroundColor: '#22c55e',
                                      borderTopLeftRadius: 4,
                                      borderTopRightRadius: 4,
                                    },
                                  ]}
                                />
                              )}
                            </View>
                          )}

                          <View style={[styles.zeroAxisLine, { backgroundColor: theme.borderSubtle }]} />

                          {returnChartScale.bottomHeight > 0 && (
                            <View style={[styles.barBottomHalf, { height: returnChartScale.bottomHeight }]}>
                              {!isPos && !isZero && (
                                <View
                                  style={[
                                    styles.barStick,
                                    {
                                      height: negBarHeight,
                                      backgroundColor: '#f43f5e',
                                      borderBottomLeftRadius: 4,
                                      borderBottomRightRadius: 4,
                                    },
                                  ]}
                                />
                              )}
                              {!isPos && !isZero && (
                                <Text style={[styles.barPctLabel, { color: theme.loss.main, marginTop: 2 }]}>
                                  %{item.returnPct.toFixed(1).replace('.', ',')}
                                </Text>
                              )}
                            </View>
                          )}

                          <Text style={[styles.barDateLabel, { color: theme.text.muted }]}>
                            {item.label}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ) : chartMetric === 'value' ? (
              <ValueLineChart
                data={chartData}
                currency={currency}
                theme={theme}
                isSingleYear={chartYear !== 'ALL'}
                width={windowWidth}
              />
            ) : (
              <View>
                <View style={styles.barChartRowSingleYear}>
                  {chartData.map((item, idx) => (
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
                  ))}
                </View>
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

          {/* 5. KÜMÜLATİF YILLIK ÖZET (Ayrık ve Net Getiri Kapsülleri) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionMainTitle, { color: theme.text.primary }]}>
                  Kümülatif Yıllık Özet
                </Text>
                <Text style={[styles.sectionSubTitle, { color: theme.text.muted }]}>
                  Yıllara göre kümülatif büyüme ve net getiri
                </Text>
              </View>
            </View>

            {/* Tablo Görünümü */}
            <View style={styles.tableWrapper}>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                <Text style={[styles.thCell, { width: '24%', color: theme.text.muted }]}>YIL</Text>
                <Text style={[styles.thCell, { width: '26%', color: theme.text.muted }]}>TRY DEĞERİ</Text>
                <Text style={[styles.thCell, { width: '20%', color: theme.text.muted }]}>USD DEĞERİ</Text>
                <Text style={[styles.thCell, { width: '15%', textAlign: 'center', color: theme.text.muted }]}>TRY %</Text>
                <Text style={[styles.thCell, { width: '15%', textAlign: 'center', color: theme.text.muted }]}>USD %</Text>
              </View>

              {cumulativeYearlyRows.map((row) => {
                const isPosTRY = (row.returnTRY ?? 0) >= 0;
                const isPosUSD = (row.returnUSD ?? 0) >= 0;

                return (
                  <View key={row.year} style={[styles.tableBodyRow, { borderBottomColor: theme.borderSubtle }]}>
                    {/* Yıl Kolonu */}
                    <View style={{ width: '24%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.rowDot, { backgroundColor: '#8b5cf6' }]} />
                      <Text style={[styles.rowYearText, { color: theme.text.primary }]}>{row.year}</Text>
                    </View>

                    {/* TRY Değeri */}
                    <View style={{ width: '26%' }}>
                      <Text style={[styles.rowValuePrimary, { color: theme.text.primary }]}>
                        {formatCurrency(row.endTRY, 'TRY', 0)}
                      </Text>
                    </View>

                    {/* USD Değeri */}
                    <View style={{ width: '20%' }}>
                      <Text style={[styles.rowValuePrimary, { color: theme.text.primary }]}>
                        {formatCurrency(row.endUSD, 'USD', 0)}
                      </Text>
                    </View>

                    {/* Getiri TRY % Kapsülü */}
                    <View style={{ width: '15%', alignItems: 'center', justifyContent: 'center' }}>
                      <View
                        style={[
                          styles.retPill,
                          {
                            backgroundColor:
                              row.returnTRY == null
                                ? 'transparent'
                                : isPosTRY
                                ? theme.profit.soft
                                : theme.loss.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rowPctText,
                            {
                              color:
                                row.returnTRY == null
                                  ? theme.text.muted
                                  : isPosTRY
                                  ? theme.profit.main
                                  : theme.loss.main,
                            },
                          ]}
                        >
                          {row.returnTRY != null
                            ? `${isPosTRY ? '+' : ''}%${row.returnTRY.toFixed(1).replace('.', ',')}`
                            : '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Getiri USD % Kapsülü */}
                    <View style={{ width: '15%', alignItems: 'center', justifyContent: 'center' }}>
                      <View
                        style={[
                          styles.retPill,
                          {
                            backgroundColor:
                              row.returnUSD == null
                                ? 'transparent'
                                : isPosUSD
                                ? 'rgba(99, 102, 241, 0.15)'
                                : theme.loss.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rowPctText,
                            {
                              color:
                                row.returnUSD == null
                                  ? theme.text.muted
                                  : isPosUSD
                                  ? '#818cf8'
                                  : theme.loss.main,
                            },
                          ]}
                        >
                          {row.returnUSD != null
                            ? `${isPosUSD ? '+' : ''}%${row.returnUSD.toFixed(1).replace('.', ',')}`
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 6. AYLIK DAĞILIM (Ocak, Şubat Formatı ve Ayrık Net Kapsüller) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionMainTitle, { color: theme.text.primary }]}>
                  Aylık Dağılım
                </Text>
                <Text style={[styles.sectionSubTitle, { color: theme.text.muted }]}>
                  Aylara göre portföy değeri ve getiri oranları
                </Text>
              </View>

              {/* Yıl Seçici Takvim Butonu */}
              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  { width: 34, height: 34, backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
                onPress={() => {
                  haptic.selection();
                  setTableYearModalOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Calendar size={16} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Tablo Görünümü */}
            <View style={styles.tableWrapper}>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
                <Text style={[styles.thCell, { width: '24%', color: theme.text.muted }]}>AY</Text>
                <Text style={[styles.thCell, { width: '26%', color: theme.text.muted }]}>TRY DEĞERİ</Text>
                <Text style={[styles.thCell, { width: '20%', color: theme.text.muted }]}>USD DEĞERİ</Text>
                <Text style={[styles.thCell, { width: '15%', textAlign: 'center', color: theme.text.muted }]}>TRY %</Text>
                <Text style={[styles.thCell, { width: '15%', textAlign: 'center', color: theme.text.muted }]}>USD %</Text>
              </View>

              {monthlyRows.map((row) => {
                const isPosTRY = (row.returnTRY ?? 0) >= 0;
                const isPosUSD = (row.returnUSD ?? 0) >= 0;

                return (
                  <View key={row.monthKey} style={[styles.tableBodyRow, { borderBottomColor: theme.borderSubtle }]}>
                    {/* Ay Kolonu (Ocak, Şubat Yazıyla) */}
                    <View style={{ width: '24%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.rowDot, { backgroundColor: '#6366f1' }]} />
                      <Text style={[styles.rowYearText, { color: theme.text.primary }]}>
                        {row.monthName}
                      </Text>
                    </View>

                    {/* TRY Değeri */}
                    <View style={{ width: '26%' }}>
                      <Text style={[styles.rowValuePrimary, { color: theme.text.primary }]}>
                        {formatCurrency(row.valTRY, 'TRY', 0)}
                      </Text>
                    </View>

                    {/* USD Değeri */}
                    <View style={{ width: '20%' }}>
                      <Text style={[styles.rowValuePrimary, { color: theme.text.primary }]}>
                        {formatCurrency(row.valUSD, 'USD', 0)}
                      </Text>
                    </View>

                    {/* Getiri TRY % Kapsülü */}
                    <View style={{ width: '15%', alignItems: 'center', justifyContent: 'center' }}>
                      <View
                        style={[
                          styles.retPill,
                          {
                            backgroundColor:
                              row.returnTRY == null
                                ? 'transparent'
                                : isPosTRY
                                ? theme.profit.soft
                                : theme.loss.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rowPctText,
                            {
                              color:
                                row.returnTRY == null
                                  ? theme.text.muted
                                  : isPosTRY
                                  ? theme.profit.main
                                  : theme.loss.main,
                            },
                          ]}
                        >
                          {row.returnTRY != null
                            ? `${isPosTRY ? '+' : ''}%${row.returnTRY.toFixed(1).replace('.', ',')}`
                            : '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Getiri USD % Kapsülü */}
                    <View style={{ width: '15%', alignItems: 'center', justifyContent: 'center' }}>
                      <View
                        style={[
                          styles.retPill,
                          {
                            backgroundColor:
                              row.returnUSD == null
                                ? 'transparent'
                                : isPosUSD
                                ? 'rgba(99, 102, 241, 0.15)'
                                : theme.loss.soft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rowPctText,
                            {
                              color:
                                row.returnUSD == null
                                  ? theme.text.muted
                                  : isPosUSD
                                  ? '#818cf8'
                                  : theme.loss.main,
                            },
                          ]}
                        >
                          {row.returnUSD != null
                            ? `${isPosUSD ? '+' : ''}%${row.returnUSD.toFixed(1).replace('.', ',')}`
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODALLAR */}
      <SelectModal
        visible={chartYearModalOpen}
        title="Dönem Yılı Seçin"
        options={chartYearOptions}
        selectedValue={chartYear}
        onSelect={(key) => {
          setChartYear(key);
          if (key !== 'ALL') setTableYear(key);
        }}
        onClose={() => setChartYearModalOpen(false)}
      />

      <SelectModal
        visible={tableYearModalOpen}
        title="Aylık Dağılım Yılı"
        options={tableYearOptions}
        selectedValue={tableYear}
        onSelect={setTableYear}
        onClose={() => setTableYearModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  yearDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  yearDropdownText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  topTabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  topTabBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  topTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiCell: {
    flex: 1,
  },
  kpiCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  kpiLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  kpiMainValue: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiSecondaryValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  kpiDivider: {
    height: 1,
    width: '100%',
  },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoCircleText: {
    fontSize: 13,
  },
  chartPillDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartPillDropdownText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barChartContainer: {
    width: '100%',
  },
  barChartRowSingleYear: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingTop: 8,
  },
  barChartColSingleYear: {
    flex: 1,
    alignItems: 'center',
  },
  barChartScroll: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 8,
  },
  barChartCol: {
    width: 38,
    alignItems: 'center',
  },
  barTopHalf: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  barBottomHalf: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  barStickMini: {
    width: 14,
  },
  barStick: {
    width: 16,
  },
  barPctLabelMini: {
    fontSize: 8.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  barPctLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  zeroAxisLine: {
    width: '100%',
    height: 1,
  },
  barDateLabelMini: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 6,
  },
  barDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionMainTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  smallFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  rowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowYearText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  rowValuePrimary: {
    fontSize: 12,
    fontWeight: '800',
  },
  retPill: {
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  rowPctText: {
    fontSize: 10,
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
