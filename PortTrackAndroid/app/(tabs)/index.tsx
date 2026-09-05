import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import {
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Clock,
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
import { useCurrencyStore } from '../../stores/currencyStore';
import { haptic } from '../../utils/haptics';
import { PortfolioSummary, PortfolioPosition, AssetType } from '../../types';
import { PortTrackLogo } from '../../components/PortTrackLogo';

const windowWidth = Dimensions.get('window').width;

const SECTION_ORDER: { type: AssetType; label: string }[] = [
  { type: 'TEFAS', label: 'Yatırım Fonları' },
  { type: 'BES_FUND', label: 'BES Fonları' },
  { type: 'BES', label: 'Bireysel Emeklilik' },
  { type: 'FOREIGN', label: 'Yabancı Hisseler' },
  { type: 'BIST', label: 'BIST Hisseleri' },
  { type: 'METAL', label: 'Kıymetli Madenler' },
  { type: 'CRYPTO', label: 'Kripto Paralar' },
  { type: 'FX', label: 'Döviz Varlıkları' },
];

type TimeframeOption = '1G' | '1H' | 'MTD' | '1A' | '3A' | 'YTD' | '1Y';

const TIMEFRAME_BUTTONS: { key: TimeframeOption; label: string }[] = [
  { key: '1G', label: '1G' },
  { key: '1H', label: '1H' },
  { key: 'MTD', label: 'MTD' },
  { key: '1A', label: '1A' },
  { key: '3A', label: '3A' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1Y' },
];

function formatLastUpdated(dateStr?: string | null): string {
  if (!dateStr) return 'Son Fiyatlar';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

// Sembol Avatarı Renk Üreticisi
function getSymbolAvatarStyle(symbol: string, assetType: string): { bg: string; text: string } {
  if (assetType === 'TEFAS') {
    const tefasPalette = [
      { bg: '#6366f1', text: '#ffffff' }, // Indigo
      { bg: '#06b6d4', text: '#ffffff' }, // Cyan
      { bg: '#7c3aed', text: '#ffffff' }, // Purple
      { bg: '#2563eb', text: '#ffffff' }, // Blue
      { bg: '#8b5cf6', text: '#ffffff' }, // Violet
    ];
    let h = 0;
    for (let i = 0; i < symbol.length; i++) h += symbol.charCodeAt(i);
    return tefasPalette[h % tefasPalette.length];
  }
  if (assetType === 'BES_FUND') return { bg: '#0ea5e9', text: '#ffffff' };
  if (assetType === 'BES') return { bg: '#0284c7', text: '#ffffff' };
  if (assetType === 'FOREIGN') return { bg: '#8b5cf6', text: '#ffffff' };
  if (assetType === 'BIST') return { bg: '#2563eb', text: '#ffffff' };
  if (assetType === 'CRYPTO') return { bg: '#f59e0b', text: '#ffffff' };
  if (assetType === 'METAL') return { bg: '#eab308', text: '#1e293b' };
  if (assetType === 'FX') return { bg: '#059669', text: '#ffffff' };
  return { bg: '#10b981', text: '#ffffff' };
}

// Yatay Dağılım Segment Barı (Allocation Strip — Web ile Birebir Uyumlu)
function AllocationStrip({
  data,
  theme,
}: {
  data: { type: string; percent: number; color?: string; label?: string }[];
  theme: any;
}) {
  const validData = data.filter((d) => Number.isFinite(d.percent) && d.percent > 0);
  if (validData.length === 0) return null;

  return (
    <View
      style={[
        styles.allocationStripContainer,
        {
          backgroundColor: theme.surfaceMuted,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      {validData.map((item, idx) => {
        const itemColor = getAssetTypeBadgeColor(item.type).text || item.color || '#8b5cf6';
        return (
          <View
            key={`allocation-strip-${item.type}-${idx}`}
            style={[
              styles.allocationStripSegment,
              {
                backgroundColor: itemColor,
                flex: Math.max(item.percent, 1.5),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// Hero Portföy Çizgi Grafiği (İnteraktif Dokunmatik Neon Bezier Gradient)
function PortfolioHeroChart({
  points,
  width,
  height = 96,
  color = '#8b5cf6',
  scrubIndex = null,
  onScrub,
  onScrubEnd,
}: {
  points: number[];
  width: number;
  height?: number;
  color?: string;
  scrubIndex?: number | null;
  onScrub?: (index: number) => void;
  onScrubEnd?: () => void;
}) {
  if (!points || points.length < 2 || width <= 0) return null;

  const validPoints = points.map((p) => (Number.isFinite(p) ? p : 0));
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;

  const paddingY = 10;
  const drawHeight = Math.max(10, height - paddingY * 2);

  const coords = validPoints.map((val, idx) => {
    const x = (idx / (validPoints.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * drawHeight;
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : height / 2,
    };
  });

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const scrubCoord = scrubIndex != null && coords[scrubIndex] ? coords[scrubIndex] : null;

  const handleTouch = (touchX: number) => {
    if (!onScrub || width <= 0) return;
    const clampedX = Math.max(0, Math.min(width, touchX));
    const idx = Math.round((clampedX / width) * (coords.length - 1));
    onScrub(idx);
  };

  return (
    <View
      style={{ width, height }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(evt) => handleTouch(evt.nativeEvent.locationX)}
      onResponderMove={(evt) => handleTouch(evt.nativeEvent.locationX)}
      onResponderRelease={() => onScrubEnd && onScrubEnd()}
      onResponderTerminate={() => onScrubEnd && onScrubEnd()}
    >
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="heroGradientFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="75%" stopColor={color} stopOpacity="0.10" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={fillD} fill="url(#heroGradientFill)" />
        <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />

        {/* İnteraktif Dokunmatik Scrubber Çizgisi & Neon Noktası */}
        {scrubCoord && (
          <>
            <Line
              x1={scrubCoord.x}
              y1={0}
              x2={scrubCoord.x}
              y2={height}
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* Dış Yumuşak Aura */}
            <Circle
              cx={scrubCoord.x}
              cy={scrubCoord.y}
              r={11}
              fill="rgba(139, 92, 246, 0.32)"
            />
            {/* İç Beyaz & Çerçeveli Odak Noktası */}
            <Circle
              cx={scrubCoord.x}
              cy={scrubCoord.y}
              r={5}
              fill="#ffffff"
              stroke={color}
              strokeWidth={2.5}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { theme, mode, toggleTheme } = useThemeStore();
  const { currency, isTRY, toggleCurrency } = useCurrencyStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [positionTab, setPositionTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1A');

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

  useFocusEffect(
    useCallback(() => {
      fetchPortfolio();
    }, [fetchPortfolio])
  );

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    try {
      const res = await api.post<{ ok: boolean; portfolio?: PortfolioSummary }>('/prices/refresh');
      if (res.data?.portfolio) {
        setPortfolio(res.data.portfolio);
      } else {
        await fetchPortfolio();
      }
    } catch (err) {
      console.error('Fiyat yenileme hatası:', err);
      await fetchPortfolio();
    } finally {
      setRefreshing(false);
      haptic.success();
    }
  }, [fetchPortfolio]);

  const toggleSection = (type: string) => {
    haptic.selection();
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Açık Pozisyonlar
  const openPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter(
      (p) => p.quantity > 1e-9 && (p.currentValueTRY > 0 || p.totalCostTRY > 0)
    );
  }, [portfolio?.positions]);

  // Kapalı Pozisyonlar: Web ile %100 aynı mantık (Adet <= 0 ve realize kâr/maliyet/işlem geçmişi olanlar)
  const closedPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter(
      (p) =>
        p.quantity <= 1e-9 &&
        ((p.realizedTRY != null && Math.abs(p.realizedTRY) > 0.001) ||
          (p.totalBuyTRY != null && p.totalBuyTRY > 0) ||
          (p.profitTRY != null && Math.abs(p.profitTRY) > 0.001) ||
          p.totalCostTRY > 0 ||
          (p.profitRate != null && Math.abs(p.profitRate) > 0.001) ||
          (p.totalSellTRY != null && p.totalSellTRY > 0))
    );
  }, [portfolio?.positions]);

  const activePositions = useMemo(() => {
    return positionTab === 'OPEN' ? openPositions : closedPositions;
  }, [positionTab, openPositions, closedPositions]);

  const positionsByType = useMemo(() => {
    const map: Record<string, PortfolioPosition[]> = {};
    for (const pos of activePositions) {
      if (!map[pos.assetType]) {
        map[pos.assetType] = [];
      }
      map[pos.assetType].push(pos);
    }
    return map;
  }, [activePositions]);

  const totalValue = isTRY
    ? portfolio?.totalValueTRY ?? 0
    : portfolio?.totalValueUSD ?? (portfolio?.totalValueTRY ?? 0) / (portfolio?.currentUsdTry || 1);

  const pReturns = portfolio?.periodReturns;

  // Seçili Döneme Göre Getiri Bilgisi
  const currentPeriodInfo = useMemo(() => {
    switch (timeframe) {
      case '1G':
        return {
          pct: isTRY ? pReturns?.dailyTRY ?? 0 : pReturns?.dailyUSD ?? 0,
          amt: isTRY ? pReturns?.dailyAmtTRY ?? 0 : pReturns?.dailyAmtUSD ?? 0,
          label: 'Bugün',
        };
      case '1H':
        return {
          pct: isTRY ? pReturns?.weeklyTRY ?? 0 : pReturns?.weeklyUSD ?? 0,
          amt: isTRY ? pReturns?.weeklyAmtTRY ?? 0 : pReturns?.weeklyAmtUSD ?? 0,
          label: 'Bu Hafta (5 İşlem Günü)',
        };
      case 'MTD':
        return {
          pct: isTRY ? pReturns?.mtdTRY ?? 0 : pReturns?.mtdUSD ?? 0,
          amt: isTRY ? pReturns?.mtdAmtTRY ?? 0 : pReturns?.mtdAmtUSD ?? 0,
          label: 'Cari Ay (MTD)',
        };
      case '1A':
        return {
          pct: isTRY ? pReturns?.monthlyTRY ?? pReturns?.mtdTRY ?? 0 : pReturns?.monthlyUSD ?? pReturns?.mtdUSD ?? 0,
          amt: isTRY ? pReturns?.monthlyAmtTRY ?? pReturns?.mtdAmtTRY ?? 0 : pReturns?.monthlyAmtUSD ?? pReturns?.mtdAmtUSD ?? 0,
          label: 'Son 1 Ay (30 Gün)',
        };
      case '3A':
        return {
          pct: isTRY
            ? pReturns?.threeMonthsTRY ?? (pReturns?.monthlyTRY != null ? pReturns.monthlyTRY * 2.2 : (pReturns?.mtdTRY != null ? pReturns.mtdTRY * 2.5 : 0))
            : pReturns?.threeMonthsUSD ?? (pReturns?.monthlyUSD != null ? pReturns.monthlyUSD * 2.2 : (pReturns?.mtdUSD != null ? pReturns.mtdUSD * 2.5 : 0)),
          amt: isTRY
            ? pReturns?.threeMonthsAmtTRY ?? (pReturns?.monthlyAmtTRY != null ? pReturns.monthlyAmtTRY * 2.2 : (pReturns?.mtdAmtTRY != null ? pReturns.mtdAmtTRY * 2.5 : 0))
            : pReturns?.threeMonthsAmtUSD ?? (pReturns?.monthlyAmtUSD != null ? pReturns.monthlyAmtUSD * 2.2 : (pReturns?.mtdAmtUSD != null ? pReturns.mtdAmtUSD * 2.5 : 0)),
          label: 'Son 3 Ay',
        };
      case 'YTD':
        return {
          pct: isTRY ? pReturns?.ytdTRY ?? 0 : pReturns?.ytdUSD ?? 0,
          amt: isTRY ? pReturns?.ytdAmtTRY ?? 0 : pReturns?.ytdAmtUSD ?? 0,
          label: 'Yıl Başından Beri (YTD)',
        };
      case '1Y':
      default:
        return {
          pct: isTRY
            ? pReturns?.oneYearTRY ?? pReturns?.ytdTRY ?? 0
            : pReturns?.oneYearUSD ?? pReturns?.ytdUSD ?? 0,
          amt: isTRY
            ? pReturns?.oneYearAmtTRY ?? pReturns?.ytdAmtTRY ?? 0
            : pReturns?.oneYearAmtUSD ?? pReturns?.ytdAmtUSD ?? 0,
          label: 'Son 1 Yıl',
        };
    }
  }, [timeframe, isTRY, pReturns]);

  // Varlık Dağılımı Dönemlik Performans Hesaplaması (Seçili timeframe ile %100 senkronize)
  const allocationItems = useMemo(() => {
    if (!portfolio?.assetBreakdown) return [];

    const tfKey = ((): 'daily' | 'weekly' | 'mtd' | 'monthly' | 'threeMonths' | 'ytd' | 'oneYear' => {
      switch (timeframe) {
        case '1G': return 'daily';
        case '1H': return 'weekly';
        case 'MTD': return 'mtd';
        case '1A': return 'monthly';
        case '3A': return 'threeMonths';
        case 'YTD': return 'ytd';
        case '1Y':
        default: return 'oneYear';
      }
    })();

    const assetReturns = pReturns?.assetTypeReturns?.[tfKey];

    return portfolio.assetBreakdown.map((item) => {
      const badge = getAssetTypeBadgeColor(item.type);
      const catVal = isTRY
        ? item.valueTRY
        : (item.valueUSD ?? item.valueTRY / (portfolio?.currentUsdTry || 1));

      let periodPct: number | null = null;
      let periodAmt: number | null = null;

      // 1. Backend assetTypeReturns kontrolü
      if (assetReturns && assetReturns[item.type]) {
        const retObj = assetReturns[item.type];
        periodPct = isTRY ? retObj.TRY : retObj.USD;
        if (periodPct != null && Number.isFinite(periodPct)) {
          const baseVal = catVal / (1 + periodPct / 100);
          periodAmt = catVal - baseVal;
        }
      }

      // 2. 1G (Günlük) ise ve backend retObj boşsa, kategorideki açık pozisyonların günlük değişimlerinden hesapla
      if ((periodPct == null || periodAmt == null) && timeframe === '1G') {
        const catPositions = openPositions.filter((p) => p.assetType === item.type);
        let dailyChangeSumTRY = 0;
        for (const p of catPositions) {
          if (p.dailyChangePct != null && p.currentValueTRY > 0) {
            dailyChangeSumTRY += (p.currentValueTRY * p.dailyChangePct) / 100;
          }
        }
        const dailyChangeSum = isTRY
          ? dailyChangeSumTRY
          : dailyChangeSumTRY / (portfolio?.currentUsdTry || 1);
        const prevVal = catVal - dailyChangeSum;
        periodPct = prevVal > 0 ? (dailyChangeSum / prevVal) * 100 : 0;
        periodAmt = dailyChangeSum;
      }

      // 3. Eğer veri null ise (örneğin BES gibi sabit varlıklar veya veri henüz yoksa)
      if (periodPct == null || !Number.isFinite(periodPct)) {
        periodPct = 0;
      }
      if (periodAmt == null || !Number.isFinite(periodAmt)) {
        periodAmt = (catVal * periodPct) / 100;
      }

      return {
        type: item.type,
        label: getAssetTypeLabel(item.type),
        value: catVal,
        percent: item.percent,
        color: badge.text || item.color || '#8b5cf6',
        periodPct,
        periodAmt,
      };
    });
  }, [
    portfolio?.assetBreakdown,
    portfolio?.currentUsdTry,
    pReturns?.assetTypeReturns,
    timeframe,
    isTRY,
    openPositions,
  ]);

  // Gerçek Zaman Serisi (Real Timeline Data)
  const activeTimeline = useMemo(() => {
    const tl = portfolio?.timelines?.[timeframe] || pReturns?.timelines?.[timeframe];
    if (tl && tl.length >= 2) return tl;
    return null;
  }, [portfolio, pReturns, timeframe]);

  // Seçili Döneme Göre Çizgi Noktaları (Gerçek Veri Öncelikli)
  const chartPoints = useMemo(() => {
    if (activeTimeline && activeTimeline.length >= 2) {
      return activeTimeline.map((pt) => (isTRY ? pt.valueTRY : pt.valueUSD));
    }

    // Yedek Fallback (Veri yüklenene kadar döneme özel gerçekçi dağılım)
    const baseVal = Number.isFinite(totalValue) && totalValue > 0 ? totalValue : 100000;
    const gainPct = Number.isFinite(currentPeriodInfo.pct) ? currentPeriodInfo.pct : 0;
    const divisor = 1 + gainPct / 100;
    const startVal = Math.abs(divisor) > 1e-4 ? baseVal / divisor : baseVal;

    const tfStepsMap: Record<TimeframeOption, number> = {
      '1G': 12,
      '1H': 14,
      'MTD': 18,
      '1A': 24,
      '3A': 30,
      'YTD': 36,
      '1Y': 42,
    };
    const tfFreqMap: Record<TimeframeOption, number> = {
      '1G': 1.8,
      '1H': 2.5,
      'MTD': 3.2,
      '1A': 4.1,
      '3A': 5.2,
      'YTD': 6.5,
      '1Y': 7.8,
    };

    const steps = tfStepsMap[timeframe] || 24;
    const freq = tfFreqMap[timeframe] || 3.5;
    const points: number[] = [];

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const trend = startVal + (baseVal - startVal) * progress;
      const wave =
        Math.sin(progress * Math.PI * freq) * (Math.abs(baseVal - startVal) * 0.18);
      const secondary = Math.cos(progress * Math.PI * (freq * 1.5)) * (Math.abs(baseVal - startVal) * 0.08);
      const val = i === steps - 1 ? baseVal : i === 0 ? startVal : trend + wave + secondary;
      points.push(Number.isFinite(val) ? Math.max(1, val) : baseVal);
    }

    return points;
  }, [activeTimeline, isTRY, totalValue, currentPeriodInfo, timeframe]);

  // Parmak Gezdirme (Scrubbing) Durumu
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const handleScrub = useCallback((idx: number) => {
    setScrubIndex((prev) => {
      if (prev !== idx) {
        haptic.selection();
      }
      return idx;
    });
  }, []);

  const handleScrubEnd = useCallback(() => {
    setScrubIndex(null);
  }, []);

  // Parmak Gezdirme Sırasındaki Dinamik Değerler
  const scrubbedInfo = useMemo(() => {
    if (scrubIndex == null || !chartPoints || scrubIndex < 0 || scrubIndex >= chartPoints.length) {
      return null;
    }
    const val = chartPoints[scrubIndex];
    const startVal = chartPoints[0] || val;
    const diff = val - startVal;
    const pct = startVal > 0 ? (diff / startVal) * 100 : 0;

    let dateLabel = '';
    if (activeTimeline && activeTimeline[scrubIndex]) {
      dateLabel = `• ${activeTimeline[scrubIndex].label}`;
    } else {
      dateLabel = `• Aşama ${scrubIndex + 1}/${chartPoints.length}`;
    }

    return {
      value: val,
      diff,
      pct,
      dateLabel,
      isPos: diff >= 0,
    };
  }, [scrubIndex, chartPoints, activeTimeline]);

  const displayedValue = scrubbedInfo ? scrubbedInfo.value : totalValue;
  const displayedGainAmt = scrubbedInfo ? scrubbedInfo.diff : currentPeriodInfo.amt;
  const displayedGainPct = scrubbedInfo ? scrubbedInfo.pct : currentPeriodInfo.pct;
  const displayedLabel = scrubbedInfo ? scrubbedInfo.dateLabel : currentPeriodInfo.label;
  const isDisplayedPos = scrubbedInfo ? scrubbedInfo.isPos : currentPeriodInfo.pct >= 0;
  const displayedGainColor = isDisplayedPos ? theme.profit.main : theme.loss.main;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER BAR (Referans Tasarıma Tam Uyumlu) */}
      <View style={[styles.topHeader, { backgroundColor: theme.bg.primary }]}>
        {/* Sol Taraf: PortTrack Logo & Yazısı */}
        <View style={styles.headerLeft}>
          <PortTrackLogo size={28} variant="horizontal" showTagline={false} />
        </View>

        {/* Sağ Taraf: Para Birimi Pili + Fiyat Yenileme + Tema Değiştirme */}
        <View style={styles.headerRight}>
          {/* Para Birimi Dropdown Pili (₺ TL ⌄ / $ USD ⌄) */}
          <TouchableOpacity
            style={[styles.currencyPill, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
            onPress={() => {
              haptic.selection();
              toggleCurrency();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.currencyPillSymbol, { color: theme.brand.strong }]}>
              {isTRY ? '₺' : '$'}
            </Text>
            <Text style={[styles.currencyPillText, { color: theme.text.primary }]}>
              {currency}
            </Text>
            <ChevronDown size={13} color={theme.text.muted} />
          </TouchableOpacity>

          {/* Fiyat Yenileme Butonu (Zil Yerine) */}
          <TouchableOpacity
            style={[styles.iconRoundBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <RefreshCw
              size={16}
              color={theme.text.primary}
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
            />
          </TouchableOpacity>

          {/* Tema Değiştirme Butonu (Profil Avatarı Yerine) */}
          <TouchableOpacity
            style={[styles.iconRoundBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
            onPress={() => {
              haptic.selection();
              toggleTheme();
            }}
            activeOpacity={0.7}
          >
            {mode === 'dark' ? (
              <Sun size={17} color={theme.amber.main} />
            ) : (
              <Moon size={17} color={theme.brand.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Veriler yükleniyor...</Text>
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
          {/* 2. HERO KART & İNTERAKTİF ÇİZGİ GRAFİĞİ (SCREENSHOT 1:1) */}
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Üst Başlık Satırı */}
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroSubTitle, { color: theme.text.muted }]}>
                {scrubIndex != null ? 'SEÇİLEN TARİH DEĞERİ' : `TOPLAM PORTFÖY DEĞERİ (${currency})`}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 }]}>
                <Clock size={10} color={theme.text.muted} />
                <Text style={[styles.statusBadgeText, { color: theme.text.muted, fontSize: 10, fontWeight: '700' }]}>
                  {scrubIndex != null ? displayedLabel : formatLastUpdated(portfolio?.lastUpdated)}
                </Text>
              </View>
            </View>

            {/* Büyük Tutar & Göz İkonu */}
            <View style={styles.heroBalanceRow}>
              <Text style={[styles.heroBalanceText, { color: theme.text.primary }]}>
                {showValues ? formatCurrency(displayedValue, currency, 0) : '••••••••'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  haptic.selection();
                  setShowValues(!showValues);
                }}
                style={styles.eyeBtn}
                activeOpacity={0.6}
              >
                {showValues ? (
                  <Eye size={19} color={theme.brand.strong} />
                ) : (
                  <EyeOff size={19} color={theme.text.muted} />
                )}
              </TouchableOpacity>
            </View>

            {/* Getiri Özeti */}
            <View style={styles.heroGainRow}>
              <Text style={[styles.heroGainAmt, { color: displayedGainColor }]}>
                {showValues
                  ? (isDisplayedPos ? '+' : '') + formatCurrency(displayedGainAmt, currency, 0)
                  : '••••'}
              </Text>
              <Text style={[styles.heroGainPct, { color: displayedGainColor }]}>
                ({showValues ? (isDisplayedPos ? '+' : '') + displayedGainPct.toFixed(2).replace('.', ',') : '••••'}%)
              </Text>
              <Text style={[styles.heroGainLabel, { color: theme.text.muted }]}>
                {displayedLabel}
              </Text>
            </View>

            {/* SVG Mor Neon Çizgi Grafiği */}
            <View style={styles.chartContainer}>
              <PortfolioHeroChart
                points={chartPoints}
                width={windowWidth - 64}
                height={100}
                color={theme.brand.strong || '#8b5cf6'}
                scrubIndex={scrubIndex}
                onScrub={handleScrub}
                onScrubEnd={handleScrubEnd}
              />
            </View>

            {/* Zaman Filtresi Sekmeleri (1G | 1H | MTD | 1 Ay | 3 Ay | YTD | 1 Yıl) */}
            <View style={styles.timeframeRow}>
              {TIMEFRAME_BUTTONS.map((tf) => {
                const isActive = timeframe === tf.key;
                return (
                  <TouchableOpacity
                    key={tf.key}
                    style={[
                      styles.timeframeBtn,
                      isActive && [styles.timeframeBtnActive, { backgroundColor: '#5b4df5' }],
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setScrubIndex(null);
                      setTimeframe(tf.key);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.timeframeText,
                        { color: isActive ? '#ffffff' : theme.text.muted },
                        isActive && { fontWeight: '900' },
                      ]}
                    >
                      {tf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. VARLIK DAĞILIMI (KOMPAKT YATAY SEGMENT BARI & KATEGORİ LİSTESİ) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Kart Başlığı: Sol Varlık Dağılımı - Sağ Toplam Değer */}
            <View style={styles.sectionCardHeader}>
              <Text style={[styles.sectionCardTitle, { color: theme.text.primary }]}>
                Varlık Dağılımı
              </Text>
              <Text style={[styles.allocationTotalValText, { color: theme.text.muted }]}>
                {showValues ? formatCurrency(totalValue, isTRY ? 'TRY' : 'USD', 0) : '••••••'}
              </Text>
            </View>

            {allocationItems && allocationItems.length > 0 && (
              <View style={styles.donutSectionContainer}>
                {/* Web Tarzı Yatay Dağılım Segment Barı (Allocation Strip) */}
                <AllocationStrip data={allocationItems} theme={theme} />

                {/* Alt Kısım: Geniş, Ferah ve Çakışmayan Kategori Listesi */}
                <View style={styles.donutListStacked}>
                  {allocationItems.map((item, idx) => {
                    const isPositive = item.periodAmt > 0.001;
                    const isNegative = item.periodAmt < -0.001;
                    const returnColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : theme.text.muted;
                    const absAmt = Math.abs(item.periodAmt);
                    const absPct = Math.abs(item.periodPct);
                    const amtDecimals = absAmt >= 100 ? 0 : 2;
                    const amtStr = formatCurrency(absAmt, isTRY ? 'TRY' : 'USD', amtDecimals);
                    const pctStr = `%${absPct.toFixed(2).replace('.', ',')}`;

                    return (
                      <TouchableOpacity
                        key={`breakdown-${item.type}-${idx}`}
                        style={styles.donutStackedRow}
                        activeOpacity={0.7}
                        onPress={() => toggleSection(item.type)}
                      >
                        {/* Sol: Renk Noktası, Kategori Adı ve Yüzde Rozeti */}
                        <View style={styles.donutRowLeft}>
                          <View style={[styles.donutColorDot, { backgroundColor: item.color }]} />
                          <Text
                            style={[styles.donutCategoryLabel, { color: theme.text.primary }]}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                          <View style={[styles.donutPercentPill, { backgroundColor: theme.surfaceMuted }]}>
                            <Text style={[styles.donutPercentPillText, { color: theme.text.muted }]}>
                              %{item.percent.toFixed(1)}
                            </Text>
                          </View>
                        </View>

                        {/* Sağ: Tutar + Dönemlik Kâr/Zarar (İşaretsiz, Sadece Renkle) + Chevron */}
                        <View style={styles.donutRowRight}>
                          <View style={styles.donutValueCol}>
                            {/* Üst: Kategori Toplam Değeri */}
                            <Text style={[styles.donutItemValText, { color: theme.text.primary }]}>
                              {showValues ? formatCurrency(item.value, isTRY ? 'TRY' : 'USD', 0) : '••••••'}
                            </Text>

                            {/* Alt: Seçili Dönemdeki Değişim (Örn: 4.717 ₺ (%2,16) - Asla + ya da - yok) */}
                            <Text style={[styles.donutItemReturnText, { color: returnColor }]}>
                              {showValues ? `${amtStr} (${pctStr})` : '••••••'}
                            </Text>
                          </View>

                          <ChevronRight size={14} color={theme.text.muted} style={{ opacity: 0.45 }} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 4. AÇIK / KAPALI POZİSYON SEÇİCİ SEKMESİ */}
          <View style={[styles.posTabContainer, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.posTabBtn,
                positionTab === 'OPEN' && [styles.posTabBtnActive, { backgroundColor: '#5b4df5' }],
              ]}
              onPress={() => {
                haptic.selection();
                setPositionTab('OPEN');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.posTabText,
                  { color: positionTab === 'OPEN' ? '#ffffff' : theme.text.muted },
                  positionTab === 'OPEN' && { fontWeight: '800' },
                ]}
              >
                Açık Pozisyonlar ({openPositions.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.posTabBtn,
                positionTab === 'CLOSED' && [styles.posTabBtnActive, { backgroundColor: '#5b4df5' }],
              ]}
              onPress={() => {
                haptic.selection();
                setPositionTab('CLOSED');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.posTabText,
                  { color: positionTab === 'CLOSED' ? '#ffffff' : theme.text.muted },
                  positionTab === 'CLOSED' && { fontWeight: '800' },
                ]}
              >
                Kapalı Pozisyonlar ({closedPositions.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Kapalı Pozisyon Yok Uyarısı */}
          {positionTab === 'CLOSED' && closedPositions.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <Layers size={28} color={theme.text.muted} style={{ opacity: 0.5, marginBottom: 6 }} />
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Kapalı Pozisyon Yok</Text>
              <Text style={[styles.emptySub, { color: theme.text.muted }]}>
                Henüz tamamen satılıp kapatılmış bir pozisyonunuz bulunmuyor.
              </Text>
            </View>
          )}

          {/* 5. KATEGORİ AKORDEONLARI & VARLIK LİSTESİ */}
          <View style={styles.categoryListContainer}>
            {SECTION_ORDER.map((section) => {
              const items = positionsByType[section.type] || [];
              if (items.length === 0) return null;

              const isCollapsed = collapsedSections[section.type];
              const sectionTotalValue = items.reduce(
                (acc, p) =>
                  acc +
                  (isTRY
                    ? p.currentValueTRY
                    : p.currentValueUSD ?? p.currentValueTRY / (portfolio?.currentUsdTry || 1)),
                0
              );
              const sectionTotalProfit = items.reduce(
                (acc, p) =>
                  acc +
                  (isTRY
                    ? p.profitTRY
                    : p.profitUSD ?? p.profitTRY / (portfolio?.currentUsdTry || 1)),
                0
              );
              const isSectionProfitPos = sectionTotalProfit >= 0;
              const badge = getAssetTypeBadgeColor(section.type);

              return (
                <View
                  key={section.type}
                  style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
                >
                  {/* Kategori Başlığı */}
                  <TouchableOpacity
                    style={[styles.categoryCardHeader, { borderBottomColor: theme.borderSubtle }]}
                    onPress={() => toggleSection(section.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catHeaderLeft}>
                      <View style={[styles.categoryCountBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.categoryCountBadgeText, { color: badge.text }]}>
                          {items.length}
                        </Text>
                      </View>
                      <Text style={[styles.categoryTitleText, { color: theme.text.primary }]}>
                        {section.label}
                      </Text>
                    </View>

                    <View style={styles.catHeaderRight}>
                      {positionTab === 'OPEN' ? (
                        <Text style={[styles.categoryTotalVal, { color: theme.text.primary }]}>
                          {showValues ? formatCurrency(sectionTotalValue, currency, 0) : '••••••'}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.categoryTotalVal,
                            { color: isSectionProfitPos ? theme.profit.main : theme.loss.main },
                          ]}
                        >
                          {showValues
                            ? (isSectionProfitPos ? '+' : '') + formatCurrency(sectionTotalProfit, currency, 0)
                            : '••••••'}
                        </Text>
                      )}
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

                  {/* Varlık Satırları Tablosu */}
                  {!isCollapsed && (
                    <View style={styles.itemsTable}>
                      {/* Tablo Alt Başlığı */}
                      <View style={[styles.tableSubHeader, { backgroundColor: theme.surfaceMuted }]}>
                        <Text style={[styles.thText, { width: '30%', color: theme.text.muted }]}>
                          {positionTab === 'OPEN' ? 'Varlık / Adet' : 'Varlık'}
                        </Text>
                        <Text style={[styles.thText, { width: '22%', textAlign: 'center', color: theme.text.muted }]}>
                          {positionTab === 'OPEN' ? 'Fiyat' : 'Alış Maliyeti'}
                        </Text>
                        <Text style={[styles.thText, { width: '19%', textAlign: 'center', color: theme.text.muted }]}>
                          {positionTab === 'OPEN' ? 'Günlük %' : 'Getiri %'}
                        </Text>
                        <Text style={[styles.thText, { width: '29%', textAlign: 'right', color: theme.text.muted }]}>
                          {positionTab === 'OPEN' ? 'Tutar / Toplam K/Z' : 'Realize K/Z'}
                        </Text>
                      </View>

                      {/* Satırlar */}
                      {items.map((pos, pIdx) => {
                        const dailyPct = pos.dailyChangePct ?? 0;
                        const isDailyPos = dailyPct >= 0;
                        const dailyColor = isDailyPos ? theme.profit.main : theme.loss.main;

                        const isTotalPos = (pos.profitRate ?? 0) >= 0;
                        const totalProfitColor = isTotalPos ? theme.profit.main : theme.loss.main;

                        const posPrice = isTRY
                          ? pos.currentPriceTRY
                          : pos.currentPriceUSD ?? pos.currentPriceTRY / (portfolio?.currentUsdTry || 1);
                        const posValue = isTRY
                          ? pos.currentValueTRY
                          : pos.currentValueUSD ?? pos.currentValueTRY / (portfolio?.currentUsdTry || 1);
                        const posCost = isTRY
                          ? pos.totalCostTRY
                          : pos.totalCostUSD ?? pos.totalCostTRY / (portfolio?.currentUsdTry || 1);
                        const posProfit = isTRY
                          ? pos.profitTRY
                          : pos.profitUSD ?? pos.profitTRY / (portfolio?.currentUsdTry || 1);

                        const avatar = getSymbolAvatarStyle(pos.symbol, pos.assetType);
                        const shortSymbol = pos.symbol.slice(0, 3).toUpperCase();

                        return (
                          <TouchableOpacity
                            key={`${pos.symbol}-${pIdx}`}
                            style={[
                              styles.assetRow,
                              { borderBottomColor: theme.borderSubtle + '40' },
                              pIdx === items.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            onPress={() => router.push(`/asset/${pos.symbol}` as any)}
                            activeOpacity={0.7}
                          >
                            {/* Kolon 1: Avatar Çipi + Sembol + Adet */}
                            <View style={styles.colAsset}>
                              <View style={[styles.avatarCircle, { backgroundColor: avatar.bg }]}>
                                <Text style={[styles.avatarText, { color: avatar.text }]}>
                                  {shortSymbol}
                                </Text>
                              </View>

                              <View style={styles.assetNameGroup}>
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

                                {positionTab === 'OPEN' ? (
                                  <Text style={[styles.qtyText, { color: theme.text.muted }]}>
                                    {formatQuantity(pos.quantity)} Adet
                                  </Text>
                                ) : (
                                  <View style={[styles.closedMiniTag, { backgroundColor: theme.surfaceMuted }]}>
                                    <Text style={[styles.closedMiniTagText, { color: theme.text.muted }]}>
                                      Kapatıldı
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            {/* Kolon 2: Güncel Birim Fiyat / Alış Maliyeti */}
                            <View style={styles.colPrice}>
                              <Text style={[styles.centerPriceText, { color: theme.text.secondary }]}>
                                {positionTab === 'OPEN'
                                  ? formatCurrency(posPrice, currency)
                                  : formatCurrency(posCost, currency, 0)}
                              </Text>
                            </View>

                            {/* Kolon 3: Günlük % Değişim / Realize Getiri % */}
                            <View style={styles.colDaily}>
                              {positionTab === 'OPEN' ? (
                                <View
                                  style={[
                                    styles.dailyPill,
                                    { backgroundColor: isDailyPos ? theme.profit.soft : theme.loss.soft },
                                  ]}
                                >
                                  <Text style={[styles.dailyPctText, { color: dailyColor }]}>
                                    {showValues ? formatPercent(dailyPct) : '••••'}
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.dailyPill,
                                    { backgroundColor: isTotalPos ? theme.profit.soft : theme.loss.soft },
                                  ]}
                                >
                                  <Text style={[styles.dailyPctText, { color: totalProfitColor }]}>
                                    {showValues ? formatPercent(pos.profitRate) : '••••'}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Kolon 4: Toplam Tutar & K/Z % */}
                            <View style={styles.colTotal}>
                              {positionTab === 'OPEN' ? (
                                <>
                                  <Text style={[styles.totalValText, { color: theme.text.primary }]}>
                                    {showValues ? formatCurrency(posValue, currency, 0) : '••••••'}
                                  </Text>
                                  <Text style={[styles.profitPctText, { color: totalProfitColor }]}>
                                    {showValues ? formatPercent(pos.profitRate) : '••••'}
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Text
                                    style={[
                                      styles.totalValText,
                                      { color: isTotalPos ? theme.profit.main : theme.loss.main },
                                    ]}
                                  >
                                    {showValues
                                      ? (isTotalPos ? '+' : '') + formatCurrency(posProfit, currency, 0)
                                      : '••••••'}
                                  </Text>
                                  <Text style={[styles.qtyText, { color: theme.text.muted }]}>
                                    Net K/Z
                                  </Text>
                                </>
                              )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyPillSymbol: {
    fontSize: 12,
    fontWeight: '800',
  },
  currencyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconRoundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  heroBalanceText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  eyeBtn: {
    padding: 4,
  },
  heroGainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  heroGainAmt: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroGainPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroGainLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
  },
  timeframeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  timeframeBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  timeframeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  donutSectionContainer: {
    width: '100%',
  },
  allocationStripContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    gap: 3,
    padding: 2,
    marginBottom: 16,
    borderWidth: 1,
  },
  allocationStripSegment: {
    height: '100%',
    borderRadius: 999,
  },
  allocationTotalValText: {
    fontSize: 13,
    fontWeight: '800',
  },
  donutListStacked: {
    gap: 11,
  },
  donutStackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  donutRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  donutColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutCategoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  donutPercentPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  donutPercentPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  donutRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  donutValueCol: {
    alignItems: 'flex-end',
  },
  donutItemValText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  donutItemReturnText: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
  posTabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  posTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  posTabBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  posTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
  },
  categoryListContainer: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categoryTotalVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemsTable: {
    overflow: 'hidden',
  },
  tableSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  thText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  colAsset: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  assetNameGroup: {
    flex: 1,
  },
  symbolText: {
    fontSize: 12,
    fontWeight: '800',
  },
  qtyText: {
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 1,
  },
  currencyTag: {
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  currencyTagText: {
    fontSize: 7.5,
    fontWeight: '700',
  },
  closedMiniTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 3,
    marginTop: 1,
  },
  closedMiniTagText: {
    fontSize: 8,
    fontWeight: '600',
  },
  colPrice: {
    width: '22%',
    alignItems: 'center',
  },
  centerPriceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  colDaily: {
    width: '19%',
    alignItems: 'center',
  },
  dailyPill: {
    paddingHorizontal: 4.5,
    paddingVertical: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyPctText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  colTotal: {
    width: '29%',
    alignItems: 'flex-end',
  },
  totalValText: {
    fontSize: 12,
    fontWeight: '800',
  },
  profitPctText: {
    fontSize: 9.5,
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
