import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Sparkles,
  PieChart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useThemeStore } from '../../stores/themeStore';
import { haptic } from '../../utils/haptics';
import {
  TefasInvestorSummary,
  TefasFundInvestorStats,
} from '../../types';

type FundFilter = 'ALL' | 'RISING' | 'FALLING';

// Format number with thousand separators
function formatCount(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('tr-TR');
}

// Mini Sparkline SVG for trend column
function MiniSparkline({
  points,
  isPositive,
  width = 56,
  height = 26,
}: {
  points: { investors: number }[];
  isPositive: boolean;
  width?: number;
  height?: number;
}) {
  if (!points || points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const values = points.map((p) => p.investors);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const padY = 3;
  const plotH = height - padY * 2;

  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = padY + (1 - (p.investors - minVal) / range) * plotH;
    return { x, y };
  });

  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cX = prev.x + (curr.x - prev.x) / 2;
    linePath += ` C ${cX} ${prev.y}, ${cX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const strokeColor = isPositive ? '#22c55e' : '#f43f5e';
  const gradId = `sparkGrad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substring(2, 6)}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradId})`} />
      <Path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// 28-day Investor History Chart for Detail Modal
function FundDetailChart({
  points,
  theme,
  width,
}: {
  points: { date: string; investors: number }[];
  theme: any;
  width: number;
}) {
  if (!points || points.length < 2) return null;

  const chartHeight = 150;
  const paddingLeft = 14;
  const paddingRight = 14;
  const paddingTop = 20;
  const paddingBottom = 24;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const values = points.map((p) => p.investors);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const isPos = values[values.length - 1] >= values[0];
  const strokeColor = isPos ? '#22c55e' : '#f43f5e';

  const pts = points.map((p, i) => {
    const x = paddingLeft + (i / (points.length - 1)) * plotWidth;
    const y = paddingTop + (1 - (p.investors - minVal) / range) * plotHeight;
    return { x, y, ...p };
  });

  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cX = prev.x + (curr.x - prev.x) / 2;
    linePath += ` C ${cX} ${prev.y}, ${cX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${chartHeight - paddingBottom} L ${pts[0].x} ${chartHeight - paddingBottom} Z`;

  return (
    <Svg width={width} height={chartHeight}>
      <Defs>
        <LinearGradient id="modalFundGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>

      <Path
        d={`M ${paddingLeft} ${paddingTop} L ${width - paddingRight} ${paddingTop}`}
        stroke={theme.borderSubtle}
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      <Path
        d={`M ${paddingLeft} ${chartHeight - paddingBottom} L ${width - paddingRight} ${chartHeight - paddingBottom}`}
        stroke={theme.borderSubtle}
        strokeWidth="1"
      />

      <Path d={areaPath} fill="url(#modalFundGrad)" />
      <Path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.4" strokeLinecap="round" />

      {pts.map((p, i) => {
        const isFirst = i === 0;
        const isLast = i === pts.length - 1;
        const isHigh = p.investors === maxVal;
        const isLow = p.investors === minVal;

        if (!isFirst && !isLast && !isHigh && !isLow) return null;

        return (
          <React.Fragment key={`dot-${i}`}>
            <Circle cx={p.x} cy={p.y} r={isLast ? 4 : 3} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
            <SvgText
              x={p.x}
              y={p.y - 7}
              fill={strokeColor}
              fontSize="9"
              fontWeight="800"
              textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
            >
              {formatCount(p.investors)}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function AnalysisScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { width: screenWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<TefasInvestorSummary | null>(null);
  const [filter, setFilter] = useState<FundFilter>('ALL');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<TefasFundInvestorStats | null>(null);

  const fetchFundAnalysis = useCallback(async () => {
    try {
      const res = await api.get<{
        ok: boolean;
        tefasInvestors: TefasInvestorSummary | null;
        totalFunds: number;
      }>('/analysis/funds');

      if (res.data?.ok && res.data.tefasInvestors) {
        setSummary(res.data.tefasInvestors);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Fon analiz verisi yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFundAnalysis();
  }, [fetchFundAnalysis]);

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await fetchFundAnalysis();
    haptic.success();
  }, [fetchFundAnalysis]);

  const funds = useMemo(() => summary?.funds ?? [], [summary]);

  // Filtered funds
  const filteredFunds = useMemo(() => {
    return funds.filter((f) => {
      if (filter === 'RISING') return (f.weekDeltaPct ?? 0) > 0.05;
      if (filter === 'FALLING') return (f.weekDeltaPct ?? 0) < -0.05;
      return true;
    });
  }, [funds, filter]);

  // Sentiment bar calculations
  const totalFunds = funds.length;
  const risingCount = summary?.risingCount ?? 0;
  const fallingCount = summary?.fallingCount ?? 0;
  const flatCount = summary?.flatCount ?? 0;

  const risingPct = totalFunds > 0 ? (risingCount / totalFunds) * 100 : 40;
  const fallingPct = totalFunds > 0 ? (fallingCount / totalFunds) * 100 : 50;
  const flatPct = totalFunds > 0 ? (flatCount / totalFunds) * 100 : 10;

  const totalNetDelta = useMemo(() => {
    return funds.reduce((acc, f) => acc + (f.weekDelta ?? 0), 0);
  }, [funds]);

  const topInflowFund = useMemo(() => {
    if (!summary?.topInflow) return null;
    return funds.find((f) => f.symbol === summary.topInflow?.symbol) ?? null;
  }, [funds, summary?.topInflow]);

  const topOutflowFund = useMemo(() => {
    if (!summary?.topOutflow) return null;
    return funds.find((f) => f.symbol === summary.topOutflow?.symbol) ?? null;
  }, [funds, summary?.topOutflow]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST BAŞLIK & BİLGİ BUTONU */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text.primary }]}>Fon Analiz</Text>
          <Text style={[styles.pageSubtitle, { color: theme.text.muted }]}>
            Tüm fonların genel görünümü
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.infoBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}
          onPress={() => {
            haptic.selection();
            setInfoModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <Info size={18} color="#818cf8" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Fon analiz verileri yükleniyor...</Text>
        </View>
      ) : !summary || funds.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
            />
          }
        >
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <PieChart size={32} color="#818cf8" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Portföyde TEFAS Fonu Bulunamadı</Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.muted }]}>
              İşlemler sayfasından portföyünüze TEFAS veya Emeklilik (BES) Fonu eklediğinizde haftalık yatırımcı akışları ve talep dinamikleri otomatik olarak burada listelenecektir.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.brand.primary}
            />
          }
        >
          {/* 2. GENEL FON TALEP DENGESİ (Üstte Tek Kart / Tam Genişlik) */}
          <View style={[styles.bentoCardFull, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Users size={16} color="#818cf8" />
                <Text style={[styles.cardHeaderLabel, { color: theme.text.muted, fontSize: 10.5 }]}>
                  GENEL FON TALEP DENGESİ
                </Text>
              </View>
              <View
                style={[
                  styles.netBadge,
                  {
                    backgroundColor:
                      totalNetDelta >= 0
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(244, 63, 94, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.netBadgeText,
                    { color: totalNetDelta >= 0 ? '#22c55e' : '#f43f5e' },
                  ]}
                >
                  Net {totalNetDelta >= 0 ? `+${formatCount(totalNetDelta)}` : formatCount(totalNetDelta)}
                </Text>
              </View>
            </View>

            {/* Çok Segmentli Renk Barı */}
            <View style={styles.multiBarContainer}>
              <View style={[styles.multiBarSegment, { width: `${risingPct}%`, backgroundColor: '#22c55e' }]} />
              <View style={[styles.multiBarSegment, { width: `${flatPct}%`, backgroundColor: '#eab308' }]} />
              <View style={[styles.multiBarSegment, { width: `${fallingPct}%`, backgroundColor: '#f43f5e' }]} />
            </View>

            {/* Alt İstatistik Satırı */}
            <View style={styles.subStatsRow}>
              <View>
                <View style={styles.dotLabelRow}>
                  <View style={[styles.miniDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.subStatLabel, { color: theme.text.secondary }]}>
                    {risingCount} Fon Artışta
                  </Text>
                </View>
                <Text style={[styles.subStatPct, { color: '#22c55e' }]}>
                  %{risingPct.toFixed(0)}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <View style={styles.dotLabelRow}>
                  <View style={[styles.miniDot, { backgroundColor: '#f43f5e' }]} />
                  <Text style={[styles.subStatLabel, { color: theme.text.secondary }]}>
                    {fallingCount} Fon Azalışta
                  </Text>
                </View>
                <Text style={[styles.subStatPct, { color: '#f43f5e' }]}>
                  %{fallingPct.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. BENTO KARTLARI (Altta Yan Yana: TOP GİRİŞ & TOP ÇIKIŞ) */}
          <View style={styles.bentoRow}>
            {/* SOL KART: HAFTANIN TALEP LİDERİ (TOP GİRİŞ) */}
            <TouchableOpacity
              style={[
                styles.bentoCardHalf,
                { backgroundColor: theme.surface, borderColor: 'rgba(34, 197, 94, 0.35)' },
              ]}
              onPress={() => {
                if (topInflowFund) {
                  haptic.selection();
                  setSelectedFund(topInflowFund);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <TrendingUp size={13} color="#22c55e" />
                  <Text style={[styles.cardHeaderLabel, { color: '#22c55e', fontSize: 8.5 }]} numberOfLines={1}>
                    TALEP LİDERİ
                  </Text>
                </View>
                <View style={[styles.topBadge, { backgroundColor: 'rgba(34, 197, 94, 0.18)' }]}>
                  <Text style={[styles.topBadgeText, { color: '#22c55e' }]}>TOP GİRİŞ</Text>
                </View>
              </View>

              {topInflowFund ? (
                <View style={{ marginTop: 6 }}>
                  <View style={styles.symbolReturnRow}>
                    <Text style={[styles.bentoSymbolText, { color: theme.text.primary }]}>
                      {topInflowFund.symbol}
                    </Text>
                    <View style={styles.returnBadgeRow}>
                      <Text style={[styles.returnPctText, { color: '#22c55e' }]}>
                        +%{Math.abs(topInflowFund.weekDeltaPct ?? 0).toFixed(2).replace('.', ',')}
                      </Text>
                      <ArrowUpRight size={13} color="#22c55e" strokeWidth={2.5} />
                    </View>
                  </View>

                  <Text style={[styles.investorCountSub, { color: theme.text.muted }]}>
                    ({formatCount(topInflowFund.latest)} kişi)
                  </Text>

                  <Text style={[styles.deltaDescText, { color: theme.text.muted }]} numberOfLines={2}>
                    Haftalık net <Text style={{ color: '#22c55e', fontWeight: '800' }}>+{formatCount(topInflowFund.weekDelta)}</Text> yeni yatırımcı
                  </Text>
                </View>
              ) : (
                <View style={styles.noDataBox}>
                  <Text style={[styles.noDataText, { color: theme.text.muted }]}>Giriş verisi yok</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* SAĞ KART: EN YÜKSEK YATIRIMCI ÇIKIŞI (TOP ÇIKIŞ) */}
            <TouchableOpacity
              style={[
                styles.bentoCardHalf,
                { backgroundColor: theme.surface, borderColor: 'rgba(244, 63, 94, 0.35)' },
              ]}
              onPress={() => {
                if (topOutflowFund) {
                  haptic.selection();
                  setSelectedFund(topOutflowFund);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <TrendingDown size={13} color="#f43f5e" />
                  <Text style={[styles.cardHeaderLabel, { color: '#f43f5e', fontSize: 8.5 }]} numberOfLines={1}>
                    EN ÇOK ÇIKIŞ
                  </Text>
                </View>
                <View style={[styles.topBadge, { backgroundColor: 'rgba(244, 63, 94, 0.18)' }]}>
                  <Text style={[styles.topBadgeText, { color: '#f43f5e' }]}>TOP ÇIKIŞ</Text>
                </View>
              </View>

              {topOutflowFund ? (
                <View style={{ marginTop: 6 }}>
                  <View style={styles.symbolReturnRow}>
                    <Text style={[styles.bentoSymbolText, { color: theme.text.primary }]}>
                      {topOutflowFund.symbol}
                    </Text>
                    <View style={styles.returnBadgeRow}>
                      <Text style={[styles.returnPctText, { color: '#f43f5e' }]}>
                        -%{Math.abs(topOutflowFund.weekDeltaPct ?? 0).toFixed(2).replace('.', ',')}
                      </Text>
                      <ArrowDownRight size={13} color="#f43f5e" strokeWidth={2.5} />
                    </View>
                  </View>

                  <Text style={[styles.investorCountSub, { color: theme.text.muted }]}>
                    ({formatCount(topOutflowFund.latest)} kişi)
                  </Text>

                  <Text style={[styles.deltaDescText, { color: theme.text.muted }]} numberOfLines={2}>
                    Haftalık net <Text style={{ color: '#f43f5e', fontWeight: '800' }}>{formatCount(topOutflowFund.weekDelta)}</Text> ayrılan
                  </Text>
                </View>
              ) : (
                <View style={styles.noDataBox}>
                  <Text style={[styles.noDataText, { color: theme.text.muted }]}>Çıkış verisi yok</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 4. FİLTRE ÇİPLERİ (Tümü / Talep Artanlar / Talep Azalanlar) */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === 'ALL' ? '#5b4df5' : theme.surface,
                  borderColor: filter === 'ALL' ? '#5b4df5' : theme.borderSubtle,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setFilter('ALL');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, { color: filter === 'ALL' ? '#ffffff' : theme.text.secondary }]}>
                Tümü ({funds.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === 'RISING' ? 'rgba(34, 197, 94, 0.25)' : theme.surface,
                  borderColor: filter === 'RISING' ? '#22c55e' : theme.borderSubtle,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setFilter('RISING');
              }}
              activeOpacity={0.8}
            >
              <TrendingUp size={13} color={filter === 'RISING' ? '#22c55e' : theme.text.muted} />
              <Text style={[styles.filterPillText, { color: filter === 'RISING' ? '#22c55e' : theme.text.secondary }]}>
                Talep Artanlar ({risingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === 'FALLING' ? 'rgba(244, 63, 94, 0.25)' : theme.surface,
                  borderColor: filter === 'FALLING' ? '#f43f5e' : theme.borderSubtle,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setFilter('FALLING');
              }}
              activeOpacity={0.8}
            >
              <TrendingDown size={13} color={filter === 'FALLING' ? '#f43f5e' : theme.text.muted} />
              <Text style={[styles.filterPillText, { color: filter === 'FALLING' ? '#f43f5e' : theme.text.secondary }]}>
                Talep Azalanlar ({fallingCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* İpucu Bildirimi */}
          <View style={styles.hintNoticeRow}>
            <Info size={13} color="#818cf8" />
            <Text style={[styles.hintNoticeText, { color: theme.text.muted }]}>
              Grafiğini ve geçmişini görmek için fona tıklayın.
            </Text>
          </View>

          {/* 5. FON ANALİZ TABLOSU */}
          <View style={[styles.tableContainer, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Tablo Başlıkları */}
            <View style={[styles.tableHeader, { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle }]}>
              <Text style={[styles.thText, { width: '18%', textAlign: 'left', color: theme.text.muted }]} numberOfLines={2}>
                FON{'\n'}KODU
              </Text>
              <Text style={[styles.thText, { width: '22%', textAlign: 'left', color: theme.text.muted }]} numberOfLines={2}>
                TOPLAM{'\n'}YATIRIMCI
              </Text>
              <View style={{ width: '28%', alignItems: 'center' }}>
                <Text style={[styles.thText, { textAlign: 'center', color: theme.text.muted }]} numberOfLines={1}>
                  HAFTALIK DEĞİŞİM
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 2 }}>
                  <Text style={[styles.thSubText, { color: theme.text.muted }]}>
                    (KİŞİ)
                  </Text>
                  <Text style={[styles.thSubText, { color: theme.text.muted }]}>
                    (%)
                  </Text>
                </View>
              </View>
              <Text style={[styles.thText, { width: '16%', textAlign: 'center', color: theme.text.muted }]} numberOfLines={2}>
                4 HAFTALIK{'\n'}EĞİLİM
              </Text>
              <Text style={[styles.thText, { width: '16%', textAlign: 'center', color: theme.text.muted }]} numberOfLines={2}>
                TREND{'\n'}GRAFİĞİ
              </Text>
            </View>

            {/* Tablo Satırları */}
            {filteredFunds.map((fund, idx) => {
              const delta = fund.weekDelta ?? 0;
              const deltaPct = fund.weekDeltaPct ?? 0;
              const isPos = delta >= 0;
              const trend = fund.trend4w;

              return (
                <TouchableOpacity
                  key={fund.symbol || `fund-${idx}`}
                  style={[styles.tableRow, { borderBottomColor: theme.borderSubtle }]}
                  onPress={() => {
                    haptic.selection();
                    setSelectedFund(fund);
                  }}
                  activeOpacity={0.7}
                >
                  {/* Kolon 1: FON KODU */}
                  <View style={{ width: '18%', justifyContent: 'center' }}>
                    <Text style={[styles.fundSymbolText, { color: theme.text.primary }]} numberOfLines={1}>
                      {fund.symbol}
                    </Text>
                    <View style={[styles.tefasBadge, { backgroundColor: theme.surfaceMuted }]}>
                      <Text style={[styles.tefasBadgeText, { color: theme.text.muted }]}>TEFAS</Text>
                    </View>
                  </View>

                  {/* Kolon 2: TOPLAM YATIRIMCI */}
                  <View style={{ width: '22%', justifyContent: 'center' }}>
                    <Text style={[styles.totalInvestorsText, { color: theme.text.primary }]} numberOfLines={1}>
                      {formatCount(fund.latest)} kişi
                    </Text>
                  </View>

                  {/* Kolon 3: HAFTALIK DEĞİŞİM (Kişi ve %) */}
                  <View style={{ width: '28%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}>
                    <Text
                      style={[
                        styles.deltaValueText,
                        { color: isPos ? '#22c55e' : '#f43f5e' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {delta > 0 ? `+${formatCount(delta)}` : formatCount(delta)}
                    </Text>

                    <Text
                      style={[
                        styles.deltaPctText,
                        { color: isPos ? '#22c55e' : '#f43f5e' },
                      ]}
                      numberOfLines={1}
                    >
                      {isPos ? '+' : ''}%{Math.abs(deltaPct).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  {/* Kolon 4: 4 HAFTALIK EĞİLİM */}
                  <View style={{ width: '16%', alignItems: 'center', justifyContent: 'center' }}>
                    <View
                      style={[
                        styles.trendPill,
                        {
                          backgroundColor:
                            trend === 'up'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : trend === 'down'
                              ? 'rgba(244, 63, 94, 0.15)'
                              : theme.surfaceMuted,
                          borderColor:
                            trend === 'up'
                              ? 'rgba(34, 197, 94, 0.3)'
                              : trend === 'down'
                              ? 'rgba(244, 63, 94, 0.3)'
                              : theme.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trendPillText,
                          {
                            color:
                              trend === 'up'
                                ? '#22c55e'
                                : trend === 'down'
                                ? '#f43f5e'
                                : theme.text.muted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {trend === 'up' ? '↗ UP' : trend === 'down' ? '↘ DOWN' : '— FLAT'}
                      </Text>
                    </View>
                  </View>

                  {/* Kolon 5: TREND GRAFİĞİ (Mini Sparkline) */}
                  <View style={{ width: '16%', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <MiniSparkline points={fund.series} isPositive={isPos} width={48} height={22} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* DETAY MODALI (Fona Tıklandığında Açılan 28 Günlük Grafikli Pencere) */}
      <Modal
        visible={!!selectedFund}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFund(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  {selectedFund?.symbol}
                </Text>
                <View style={[styles.tefasBadge, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                  <Text style={[styles.tefasBadgeText, { color: '#818cf8' }]}>TEFAS FON</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
                onPress={() => setSelectedFund(null)}
              >
                <X size={16} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {selectedFund && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 3 Metrik Özeti */}
                <View style={styles.modalMetricsRow}>
                  <View style={[styles.modalMetricBox, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.modalMetricLabel, { color: theme.text.muted }]}>TOPLAM YATIRIMCI</Text>
                    <Text style={[styles.modalMetricValue, { color: theme.text.primary }]}>
                      {formatCount(selectedFund.latest)}
                    </Text>
                  </View>

                  <View style={[styles.modalMetricBox, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.modalMetricLabel, { color: theme.text.muted }]}>HAFTALIK DEĞİŞİM</Text>
                    <Text
                      style={[
                        styles.modalMetricValue,
                        { color: (selectedFund.weekDelta ?? 0) >= 0 ? '#22c55e' : '#f43f5e' },
                      ]}
                    >
                      {(selectedFund.weekDelta ?? 0) > 0 ? `+${formatCount(selectedFund.weekDelta)}` : formatCount(selectedFund.weekDelta)}
                    </Text>
                  </View>

                  <View style={[styles.modalMetricBox, { backgroundColor: theme.surfaceMuted }]}>
                    <Text style={[styles.modalMetricLabel, { color: theme.text.muted }]}>4H EĞİLİM</Text>
                    <Text
                      style={[
                        styles.modalMetricValue,
                        {
                          color:
                            selectedFund.trend4w === 'up'
                              ? '#22c55e'
                              : selectedFund.trend4w === 'down'
                              ? '#f43f5e'
                              : theme.text.muted,
                        },
                      ]}
                    >
                      {selectedFund.trend4w === 'up' ? 'YUKARI' : selectedFund.trend4w === 'down' ? 'AŞAĞI' : 'YATAY'}
                    </Text>
                  </View>
                </View>

                {/* 28 Günlük Yatırımcı Trend Grafiği */}
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.chartSectionTitle, { color: theme.text.secondary }]}>
                    Son 28 Günlük Yatırımcı Değişimi
                  </Text>
                  <View style={{ alignItems: 'center', marginTop: 8 }}>
                    <FundDetailChart
                      points={selectedFund.series}
                      theme={theme}
                      width={screenWidth - 80}
                    />
                  </View>
                </View>

                {/* Fon Detayına Git Butonu */}
                <TouchableOpacity
                  style={[styles.goToAssetBtn, { backgroundColor: '#5b4df5' }]}
                  onPress={() => {
                    const sym = selectedFund.symbol;
                    setSelectedFund(null);
                    router.push(`/asset/${sym}` as any);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.goToAssetText}>Fon Sayfasına Git</Text>
                  <ChevronRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* BİLGİ VE REHBER MODALI ((i) Butonu) */}
      <Modal
        visible={infoModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Info size={20} color="#818cf8" />
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  Fon Analizi Rehberi
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
                onPress={() => setInfoModalOpen(false)}
              >
                <X size={16} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.infoSectionBox}>
                <Text style={[styles.infoSectionTitle, { color: theme.text.primary }]}>
                  👥 Yatırımcı Sayısı Dinamikleri Nedir?
                </Text>
                <Text style={[styles.infoSectionBody, { color: theme.text.muted }]}>
                  TEFAS veritabanından alınan yatırımcı adedi değişimleri, fonlara olan kurumsal ve bireysel talep trendini yansıtır. Yatırımcı akışı artan fonlar piyasa ilgisini ve likiditeyi gösterir.
                </Text>
              </View>

              <View style={styles.infoSectionBox}>
                <Text style={[styles.infoSectionTitle, { color: theme.text.primary }]}>
                  📊 4 Haftalık Eğilim Nasıl Hesaplanır?
                </Text>
                <Text style={[styles.infoSectionBody, { color: theme.text.muted }]}>
                  Fonun son 28 günlük yatırımcı sayısı serisi incelenerek yön tayini yapılır. %0,5 ve üzeri artışlar UP (Yeşil), %0,5 üzeri azalışlar DOWN (Kırmızı) olarak etiketlenir.
                </Text>
              </View>

              <View style={styles.infoSectionBox}>
                <Text style={[styles.infoSectionTitle, { color: theme.text.primary }]}>
                  ⚠️ Yasal Bilgilendirme
                </Text>
                <Text style={[styles.infoSectionBody, { color: theme.text.muted }]}>
                  Bu sayfada yer alan analizler ve istatistiki hesaplamalar kişisel takip amaçlıdır. Yatırım tavsiyesi (YTD) niteliği taşımaz.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    gap: 12,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyScroll: {
    padding: 16,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoCardHalf: {
    flex: 1,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  bentoCardFull: {
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  cardHeaderLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  netBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  netBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  topBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  multiBarContainer: {
    height: 7,
    borderRadius: 3.5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#334155',
  },
  multiBarSegment: {
    height: '100%',
  },
  subStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subStatLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  subStatPct: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  symbolReturnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoSymbolText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  returnBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  returnPctText: {
    fontSize: 14,
    fontWeight: '900',
  },
  investorCountSub: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  deltaDescText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  noDataBox: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hintNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  hintNoticeText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  tableContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  thText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  thSubText: {
    fontSize: 7.5,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  fundSymbolText: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  tefasBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginTop: 2,
  },
  tefasBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  totalInvestorsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deltaValueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deltaPctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trendPill: {
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalMetricLabel: {
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },
  chartSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  goToAssetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 18,
    gap: 4,
  },
  goToAssetText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  infoSectionBox: {
    marginBottom: 14,
    gap: 4,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoSectionBody: {
    fontSize: 11.5,
    lineHeight: 17,
  },
});
