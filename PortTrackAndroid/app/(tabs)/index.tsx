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

import { useCurrencyStore } from '../../stores/currencyStore';
import { PortTrackLogo } from '../../components/PortTrackLogo';

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

  // Açık Pozisyonlar: Adet > 0 olan ve portföy değeri bulunan varlıklar
  const openPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    return portfolio.positions.filter(
      (p) => p.quantity > 1e-9 && (p.currentValueTRY > 0 || p.totalCostTRY > 0)
    );
  }, [portfolio?.positions]);

  // Kapalı Pozisyonlar: Adet <= 0 olan (tamamı satılmış) varlıklar
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

  // Aktif sekmeye göre gösterilecek pozisyonlar
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
    ? (portfolio?.totalValueTRY ?? 0)
    : (portfolio?.totalValueUSD ?? ((portfolio?.totalValueTRY ?? 0) / (portfolio?.currentUsdTry || 1)));
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
        <TouchableOpacity
          style={styles.logoGroup}
          onPress={() => fetchPortfolio()}
          activeOpacity={0.8}
        >
          <PortTrackLogo size={28} variant="horizontal" showTagline={false} themeMode={mode} />
        </TouchableOpacity>

        {/* Sağ Butonlar */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
            onPress={() => {
              haptic.selection();
              toggleCurrency();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Coins size={13} color={theme.brand.primary} />
            <Text style={[styles.headerBtnText, { color: theme.brand.primary }]}>
              {currency === 'TRY' ? '₺ TL' : '$ USD'}
            </Text>
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
                onPress={() => {
                  haptic.selection();
                  toggleCurrency();
                }}
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
                {openPositions.length} Varlık
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

          {/* 4. POZİSYONLAR BÖLÜMÜ (AÇIK / KAPALI POZİSYONLAR SEÇİCİ) */}
          <View style={styles.positionsSection}>
            <View style={styles.positionsSectionHeader}>
              <View
                style={[
                  styles.posTabContainer,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.borderSubtle },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.posTabBtn,
                    positionTab === 'OPEN' && [
                      styles.posTabBtnActive,
                      { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                    ],
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
                      { color: positionTab === 'OPEN' ? theme.brand.primary : theme.text.muted },
                      positionTab === 'OPEN' && { fontWeight: '800' },
                    ]}
                  >
                    Açık Pozisyonlar ({openPositions.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.posTabBtn,
                    positionTab === 'CLOSED' && [
                      styles.posTabBtnActive,
                      { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                    ],
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
                      { color: positionTab === 'CLOSED' ? theme.brand.primary : theme.text.muted },
                      positionTab === 'CLOSED' && { fontWeight: '800' },
                    ]}
                  >
                    Kapalı Pozisyonlar ({closedPositions.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Kapalı Pozisyon Boş Durumu */}
            {positionTab === 'CLOSED' && closedPositions.length === 0 && (
              <View
                style={[
                  styles.emptyClosedCard,
                  { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                ]}
              >
                <Layers size={28} color={theme.text.muted} style={{ opacity: 0.5, marginBottom: 6 }} />
                <Text style={[styles.emptyClosedTitle, { color: theme.text.primary }]}>
                  Kapalı Pozisyon Yok
                </Text>
                <Text style={[styles.emptyClosedSub, { color: theme.text.muted }]}>
                  Henüz tamamen satılıp kapatılmış bir pozisyonunuz bulunmuyor.
                </Text>
              </View>
            )}

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
                      {positionTab === 'OPEN' ? (
                        <Text style={[styles.categoryValue, { color: theme.text.primary }]}>
                          {showValues ? formatCurrency(sectionTotalValue, currency, 0) : '••••••'}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.categoryValue,
                            { color: isSectionProfitPos ? theme.profit.main : theme.loss.main },
                          ]}
                        >
                          {showValues
                            ? (isSectionProfitPos ? '+' : '') +
                              formatCurrency(sectionTotalProfit, currency, 0)
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

                  {/* Kategori İçi Tablo Başlıkları & Varlık Satırları */}
                  {!isCollapsed && (
                    <View style={styles.itemsList}>
                      {/* Tablo Alt Başlığı */}
                      <View style={[styles.tableSubHeader, { backgroundColor: theme.surfaceMuted }]}>
                        <Text style={[styles.thText, { width: '28%', color: theme.text.muted }]}>
                          {positionTab === 'OPEN' ? 'Varlık / Adet' : 'Varlık'}
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '22%', textAlign: 'center', color: theme.text.muted },
                          ]}
                        >
                          {positionTab === 'OPEN' ? 'Fiyat' : 'Alış Maliyeti'}
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '20%', textAlign: 'center', color: theme.text.muted },
                          ]}
                        >
                          {positionTab === 'OPEN' ? 'Günlük %' : 'Getiri %'}
                        </Text>
                        <Text
                          style={[
                            styles.thText,
                            { width: '30%', textAlign: 'right', color: theme.text.muted },
                          ]}
                        >
                          {positionTab === 'OPEN' ? 'Tutar / Toplam K/Z' : 'Realize K/Z'}
                        </Text>
                      </View>

                      {/* Varlık Satırları */}
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
                            {/* Kolon 1: Üstte Sembol, Altta Durum/Adet */}
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
                              {positionTab === 'OPEN' ? (
                                <Text style={[styles.qtyText, { color: theme.text.muted }]}>
                                  {formatQuantity(pos.quantity)} Adet
                                </Text>
                              ) : (
                                <View style={[styles.closedMiniBadge, { backgroundColor: theme.surfaceMuted }]}>
                                  <Text style={[styles.closedMiniBadgeText, { color: theme.text.muted }]}>
                                    Kapatıldı
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Kolon 2: Güncel Fiyat veya Alış Maliyeti */}
                            <View style={styles.colPrice}>
                              <Text style={[styles.centerPrice, { color: theme.text.secondary }]}>
                                {positionTab === 'OPEN'
                                  ? formatCurrency(posPrice, currency)
                                  : formatCurrency(posCost, currency, 0)}
                              </Text>
                            </View>

                            {/* Kolon 3: Günlük % veya Realize Getiri % */}
                            <View style={styles.colDaily}>
                              {positionTab === 'OPEN' ? (
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

                            {/* Kolon 4: Tutar / Toplam K/Z veya Realize Net K/Z */}
                            <View style={styles.colTotal}>
                              {positionTab === 'OPEN' ? (
                                <>
                                  <Text style={[styles.rightValue, { color: theme.text.primary }]}>
                                    {showValues ? formatCurrency(posValue, currency, 0) : '••••••'}
                                  </Text>
                                  <Text style={[styles.totalProfitPctText, { color: totalProfitColor }]}>
                                    {showValues ? formatPercent(pos.profitRate) : '••••'}
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Text
                                    style={[
                                      styles.rightValue,
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
    paddingVertical: 10,
  },
  posTabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  posTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  posTabBtnActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  posTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyClosedCard: {
    marginHorizontal: 16,
    marginVertical: 14,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyClosedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyClosedSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  closedMiniBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  closedMiniBadgeText: {
    fontSize: 9,
    fontWeight: '600',
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
