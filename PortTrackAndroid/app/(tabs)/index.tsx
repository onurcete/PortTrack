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
import { useRouter } from 'expo-router';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import {
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Layers,
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
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { haptic } from '../../utils/haptics';
import { PortfolioSummary, PortfolioPosition, AssetType } from '../../types';
import { PortTrackLogo } from '../../components/PortTrackLogo';

const windowWidth = Dimensions.get('window').width;

const SECTION_ORDER: { type: AssetType; label: string }[] = [
  { type: 'TEFAS', label: 'Yatırım Fonları' },
  { type: 'BES', label: 'Bireysel Emeklilik' },
  { type: 'FOREIGN', label: 'Yabancı Hisseler' },
  { type: 'BIST', label: 'BIST Hisseleri' },
  { type: 'METAL', label: 'Kıymetli Madenler' },
  { type: 'CRYPTO', label: 'Kripto Paralar' },
  { type: 'FX', label: 'Döviz Varlıkları' },
];

type TimeframeOption = '1G' | '1H' | '1A' | '3A' | '1Y' | 'ALL';

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
  if (assetType === 'BES') return { bg: '#0284c7', text: '#ffffff' };
  if (assetType === 'FOREIGN') return { bg: '#8b5cf6', text: '#ffffff' };
  if (assetType === 'BIST') return { bg: '#2563eb', text: '#ffffff' };
  if (assetType === 'CRYPTO') return { bg: '#f59e0b', text: '#ffffff' };
  if (assetType === 'METAL') return { bg: '#eab308', text: '#1e293b' };
  if (assetType === 'FX') return { bg: '#059669', text: '#ffffff' };
  return { bg: '#10b981', text: '#ffffff' };
}

// Donut Grafik Bileşeni (SVG Donut Chart)
function DonutChart({
  data,
  size = 114,
  strokeWidth = 14,
}: {
  data: { type: string; percent: number; color?: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const validData = data.filter((d) => d.percent > 0);
  const total = validData.reduce((sum, d) => sum + d.percent, 0) || 100;

  let cumulativePercent = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Boş Halka Arka Planı */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {validData.map((item, idx) => {
        const itemPercent = (item.percent / total) * 100;
        const strokeDashoffset = circumference - (cumulativePercent / 100) * circumference;
        const strokeDasharray = `${(itemPercent / 100) * circumference} ${circumference}`;
        cumulativePercent += itemPercent;
        const sliceColor = item.color || getAssetTypeBadgeColor(item.type).text;

        return (
          <Circle
            key={`donut-slice-${item.type}-${idx}`}
            cx={center}
            cy={center}
            r={radius}
            stroke={sliceColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            fill="transparent"
            originX={center}
            originY={center}
            rotation="-90"
          />
        );
      })}
    </Svg>
  );
}

// Hero Portföy Çizgi Grafiği (Neon Bezier Gradient Line)
function PortfolioHeroChart({
  points,
  width,
  height = 92,
  color = '#8b5cf6',
}: {
  points: number[];
  width: number;
  height?: number;
  color?: string;
}) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const paddingY = 8;
  const drawHeight = height - paddingY * 2;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * drawHeight;
    return { x, y };
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

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="heroGradientFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <Stop offset="75%" stopColor={color} stopOpacity="0.10" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </SvgLinearGradient>
      </Defs>
      <Path d={fillD} fill="url(#heroGradientFill)" />
      <Path d={pathD} stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </Svg>
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

  // Açık Pozisyonlar
  const openPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter(
      (p) => p.quantity > 1e-9 && (p.currentValueTRY > 0 || p.totalCostTRY > 0)
    );
  }, [portfolio?.positions]);

  // Kapalı Pozisyonlar
  const closedPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter(
      (p) =>
        p.quantity <= 1e-9 &&
        ((p.profitTRY != null && Math.abs(p.profitTRY) > 0.001) ||
          p.totalCostTRY > 0 ||
          (p.profitRate != null && Math.abs(p.profitRate) > 0.001))
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
          label: 'Bu hafta',
        };
      case '1A':
        return {
          pct: isTRY ? pReturns?.mtdTRY ?? 0 : pReturns?.mtdUSD ?? 0,
          amt: isTRY ? pReturns?.mtdAmtTRY ?? 0 : pReturns?.mtdAmtUSD ?? 0,
          label: 'Bu ay (MTD)',
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
      case '1Y':
        return {
          pct: isTRY
            ? pReturns?.oneYearTRY ?? pReturns?.ytdTRY ?? 0
            : pReturns?.oneYearUSD ?? pReturns?.ytdUSD ?? 0,
          amt: isTRY
            ? pReturns?.oneYearAmtTRY ?? pReturns?.ytdAmtTRY ?? 0
            : pReturns?.oneYearAmtUSD ?? pReturns?.ytdAmtUSD ?? 0,
          label: 'Son 1 Yıl',
        };
      case 'ALL':
      default:
        return {
          pct: portfolio?.totalProfitPercent ?? 0,
          amt: isTRY
            ? portfolio?.totalProfitTRY ?? 0
            : portfolio?.totalProfitUSD ?? (portfolio?.totalProfitTRY ?? 0) / (portfolio?.currentUsdTry || 1),
          label: 'Toplam Kâr/Zarar',
        };
    }
  }, [timeframe, isTRY, pReturns, portfolio]);

  // Seçili Döneme Göre Sentetik / Akıcı Çizgi Noktaları
  const chartPoints = useMemo(() => {
    const baseVal = totalValue || 100000;
    const gainPct = currentPeriodInfo.pct || 5.0;
    const startVal = baseVal / (1 + gainPct / 100);

    const steps = 24;
    const points: number[] = [];

    // Gerçekçi akıcı piyasa eğrisi üretimi
    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const trend = startVal + (baseVal - startVal) * progress;
      const wave = Math.sin(progress * Math.PI * 3.5) * (Math.abs(baseVal - startVal) * 0.15 + baseVal * 0.015);
      const micro = (Math.cos(i * 1.8) * (baseVal * 0.008));
      const val = i === steps - 1 ? baseVal : i === 0 ? startVal : trend + wave + micro;
      points.push(Math.max(1, val));
    }

    return points;
  }, [totalValue, currentPeriodInfo]);

  const isPeriodPos = currentPeriodInfo.pct >= 0;
  const periodGainColor = isPeriodPos ? theme.profit.main : theme.loss.main;

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
                TOPLAM PORTFÖY DEĞERİ ({currency})
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.profit.soft }]}>
                <View style={[styles.statusDot, { backgroundColor: theme.profit.main }]} />
                <Text style={[styles.statusBadgeText, { color: theme.profit.main }]}>Güncel</Text>
              </View>
            </View>

            {/* Büyük Tutar & Göz İkonu */}
            <View style={styles.heroBalanceRow}>
              <Text style={[styles.heroBalanceText, { color: theme.text.primary }]}>
                {showValues ? formatCurrency(totalValue, currency, 0) : '••••••••'}
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
              <Text style={[styles.heroGainAmt, { color: periodGainColor }]}>
                {showValues
                  ? (isPeriodPos ? '+' : '') + formatCurrency(currentPeriodInfo.amt, currency, 0)
                  : '••••'}
              </Text>
              <Text style={[styles.heroGainPct, { color: periodGainColor }]}>
                ({showValues ? (isPeriodPos ? '+' : '') + currentPeriodInfo.pct.toFixed(2).replace('.', ',') : '••••'}%)
              </Text>
              <Text style={[styles.heroGainLabel, { color: theme.text.muted }]}>
                {currentPeriodInfo.label}
              </Text>
            </View>

            {/* SVG Mor Neon Çizgi Grafiği */}
            <View style={styles.chartContainer}>
              <PortfolioHeroChart
                points={chartPoints}
                width={windowWidth - 64}
                height={100}
                color={theme.brand.strong || '#8b5cf6'}
              />
            </View>

            {/* Zaman Filtresi Sekmeleri (1G | 1H | 1A | 3A | 1Y | Tümü) */}
            <View style={styles.timeframeRow}>
              {(['1G', '1H', '1A', '3A', '1Y', 'ALL'] as TimeframeOption[]).map((tf) => {
                const isActive = timeframe === tf;
                const label = tf === 'ALL' ? 'Tümü' : tf;
                return (
                  <TouchableOpacity
                    key={tf}
                    style={[
                      styles.timeframeBtn,
                      isActive && [styles.timeframeBtnActive, { backgroundColor: '#5b4df5' }],
                    ]}
                    onPress={() => {
                      haptic.selection();
                      setTimeframe(tf);
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
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. VARLIK DAĞILIMI (DONUT CHART & DETAYLI LİSTE) */}
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Kart Başlığı */}
            <View style={styles.sectionCardHeader}>
              <Text style={[styles.sectionCardTitle, { color: theme.text.primary }]}>
                Varlık Dağılımı
              </Text>
              <View style={styles.sectionCardRightBadge}>
                <Text style={[styles.sectionCountText, { color: theme.text.muted }]}>
                  {openPositions.length} Varlık
                </Text>
                <ChevronDown size={14} color={theme.text.muted} />
              </View>
            </View>

            {/* Donut Grafik ve Liste Yan Yana */}
            {portfolio?.assetBreakdown && portfolio.assetBreakdown.length > 0 && (
              <View style={styles.donutSectionBody}>
                {/* Sol: Donut Grafik */}
                <View style={styles.donutLeft}>
                  <DonutChart data={portfolio.assetBreakdown} size={110} strokeWidth={15} />
                </View>

                {/* Sağ: Kategori Dağılım Listesi */}
                <View style={styles.donutListRight}>
                  {portfolio.assetBreakdown.map((item, idx) => {
                    const badge = getAssetTypeBadgeColor(item.type);
                    return (
                      <View key={`breakdown-${item.type}-${idx}`} style={styles.donutListItem}>
                        <View style={styles.donutItemLeft}>
                          <View style={[styles.donutColorDot, { backgroundColor: badge.text }]} />
                          <Text style={[styles.donutItemLabel, { color: theme.text.secondary }]}>
                            {getAssetTypeLabel(item.type)}
                          </Text>
                        </View>
                        <Text style={[styles.donutItemPercent, { color: theme.text.primary }]}>
                          %{item.percent.toFixed(1)}
                        </Text>
                      </View>
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

                        const isTotalPos = pos.profitRate >= 0;
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeframeBtnActive: {
    shadowColor: '#5b4df5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  timeframeText: {
    fontSize: 11,
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
  sectionCardRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  donutSectionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  donutLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutListRight: {
    flex: 1,
    gap: 7,
    paddingLeft: 4,
  },
  donutListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  donutColorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  donutItemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  donutItemPercent: {
    fontSize: 11,
    fontWeight: '800',
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
