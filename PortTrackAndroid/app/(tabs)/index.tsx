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
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Coins,
  ChevronDown,
  Layers,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { formatCurrency, formatPercent, getAssetTypeLabel, getAssetTypeBadgeColor } from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';
import { PortfolioSummary, PortfolioPosition, AssetType } from '../../types';

const SECTION_ORDER: { type: AssetType; label: string }[] = [
  { type: 'TEFAS', label: 'Yatırım Fonları (TEFAS)' },
  { type: 'FOREIGN', label: 'Yabancı Hisseler' },
  { type: 'BIST', label: 'BIST Hisseleri' },
  { type: 'CRYPTO', label: 'Kripto Paralar' },
  { type: 'METAL', label: 'Kıymetli Madenler' },
  { type: 'FX', label: 'Döviz Varlıkları' },
  { type: 'BES', label: 'Bireysel Emeklilik (BES)' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
    setRefreshing(true);
    try {
      await api.post('/prices/refresh');
    } catch {}
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Kategori bazlı pozisyon gruplaması
  const positionsByType = useMemo(() => {
    const map: Record<string, PortfolioPosition[]> = {};
    if (!portfolio?.positions) return map;
    for (const pos of portfolio.positions) {
      if (!map[pos.assetType]) {
        map[pos.assetType] = [];
      }
      map[pos.assetType].push(pos);
    }
    return map;
  }, [portfolio]);

  const totalValue = portfolio?.totalValueTRY ?? 0;
  const totalCost = portfolio?.totalCostTRY ?? 0;
  const totalProfit = portfolio?.totalProfitTRY ?? 0;
  const profitRate = portfolio?.totalProfitPercent ?? 0;
  const dailyChange = portfolio?.dailyChangeTRY ?? 0;
  const dailyPercent = portfolio?.dailyChangePercent ?? 0;

  const isProfit = totalProfit >= 0;
  const isDailyPositive = dailyChange >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web ile Paralel Üst Header */}
      <View style={styles.topHeader}>
        <View style={styles.logoGroup}>
          <View style={styles.logoIcon}>
            <Wallet size={18} color="#ffffff" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.brandTitle}>PortTrack</Text>
              {user?.isDemo && (
                <View style={styles.demoBadge}>
                  <ShieldCheck size={10} color={colors.amber[400]} />
                  <Text style={styles.demoBadgeText}>Demo</Text>
                </View>
              )}
            </View>
            <Text style={styles.brandSubtitle}>Yatırım Takip</Text>
          </View>
        </View>

        {/* Sağ Butonlar: Para Birimi Toggle, Gizle/Göster, Yenile */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.currencyToggleBtn}
            onPress={() => setCurrency(currency === 'TRY' ? 'USD' : 'TRY')}
          >
            <Coins size={14} color={colors.emerald[400]} />
            <Text style={styles.currencyToggleText}>{currency}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowValues(!showValues)}
          >
            {showValues ? (
              <Eye size={18} color={colors.text.secondary} />
            ) : (
              <EyeOff size={18} color={colors.text.secondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={18}
              color={refreshing ? colors.emerald[400] : colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.emerald[400]} />
          <Text style={styles.loadingText}>Portföy verileri yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.emerald[400]}
              colors={[colors.emerald[400]]}
            />
          }
        >
          {/* 1. ANA KPI ÖZET KARTI (Net Worth) */}
          <View style={styles.mainKpiCard}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiTitle}>TOPLAM PORTFÖY DEĞERİ</Text>
              <Text style={styles.lastUpdatedText}>
                {portfolio?.lastUpdated
                  ? `Son: ${new Date(portfolio.lastUpdated).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Canlı'}
              </Text>
            </View>

            <Text style={styles.kpiMainValue}>
              {showValues ? formatCurrency(totalValue, currency) : '•••••••• ₺'}
            </Text>

            {/* Maliyet ve Getiri İstatistikleri */}
            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Toplam Yatırılan Maliyet</Text>
                <Text style={styles.statValWhite}>
                  {showValues ? formatCurrency(totalCost, currency) : '••••••'}
                </Text>
              </View>

              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Toplam Kâr / Zarar</Text>
                <View style={styles.profitWithIcon}>
                  {isProfit ? (
                    <TrendingUp size={14} color={colors.emerald[400]} />
                  ) : (
                    <TrendingDown size={14} color={colors.rose[400]} />
                  )}
                  <Text
                    style={[
                      styles.statValProfit,
                      { color: isProfit ? colors.emerald[400] : colors.rose[400] },
                    ]}
                  >
                    {showValues
                      ? `${formatCurrency(totalProfit, currency)} (${formatPercent(profitRate)})`
                      : '••••••'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Günlük Değişim Çubuğu */}
            <View style={styles.dailyBar}>
              <Text style={styles.dailyBarLabel}>Günlük Değişim:</Text>
              <Text
                style={[
                  styles.dailyBarVal,
                  { color: isDailyPositive ? colors.emerald[400] : colors.rose[400] },
                ]}
              >
                {showValues
                  ? `${formatCurrency(dailyChange, currency)} (${formatPercent(dailyPercent)})`
                  : '••••'}
              </Text>
            </View>
          </View>

          {/* Hızlı İşlem Eylemleri */}
          <View style={styles.quickBar}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/modals/add-transaction' as any)}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.primaryActionText}>Yeni İşlem Ekle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => router.push('/(tabs)/analysis')}
            >
              <Sparkles size={16} color={colors.purple[400]} />
              <Text style={styles.secondaryActionText}>AI Analizi</Text>
            </TouchableOpacity>
          </View>

          {/* 2. VARLIK DAĞILIMI (Asset Allocation) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color={colors.emerald[400]} />
                <Text style={styles.sectionCardTitle}>Varlık Dağılımı</Text>
              </View>
              <Text style={styles.sectionCardCount}>
                {portfolio?.positions?.length || 0} Varlık
              </Text>
            </View>

            {/* Renkli Dağılım Segmentleri */}
            {portfolio?.assetBreakdown && portfolio.assetBreakdown.length > 0 && (
              <View style={styles.allocationBarContainer}>
                <View style={styles.allocationBar}>
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
                      <View key={`chip-${item.type}-${idx}`} style={styles.breakdownChip}>
                        <View
                          style={[styles.chipDot, { backgroundColor: badge.text }]}
                        />
                        <Text style={styles.chipLabel}>{getAssetTypeLabel(item.type)}</Text>
                        <Text style={styles.chipPercent}>%{item.percent.toFixed(1)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 3. KATEGORİ BAZLI AÇIK POZİSYONLAR (Web İle Birebir Sıralı) */}
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesSectionTitle}>Açık Pozisyonlar</Text>

            {SECTION_ORDER.map((section) => {
              const items = positionsByType[section.type] || [];
              if (items.length === 0) return null;

              const isCollapsed = collapsedSections[section.type];
              const sectionTotalValue = items.reduce((acc, p) => acc + p.currentValueTRY, 0);
              const sectionTotalProfit = items.reduce((acc, p) => acc + p.profitTRY, 0);
              const badge = getAssetTypeBadgeColor(section.type);

              return (
                <View key={section.type} style={styles.categoryBlock}>
                  {/* Kategori Başlık Başlığı */}
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleSection(section.type)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.categoryBadgeText, { color: badge.text }]}>
                          {items.length}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.categoryTitle}>{section.label}</Text>
                        <Text style={styles.categorySubTotal}>
                          {showValues ? formatCurrency(sectionTotalValue) : '••••••'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.categoryHeaderRight}>
                      <Text
                        style={[
                          styles.categoryProfit,
                          { color: sectionTotalProfit >= 0 ? colors.emerald[400] : colors.rose[400] },
                        ]}
                      >
                        {showValues
                          ? `${sectionTotalProfit >= 0 ? '+' : ''}${formatCurrency(sectionTotalProfit)}`
                          : '••••'}
                      </Text>
                      <ChevronDown
                        size={18}
                        color={colors.text.muted}
                        style={{
                          transform: [{ rotate: isCollapsed ? '-90deg' : '0deg' }],
                          marginLeft: 6,
                        }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Kategori İçi Varlık Kartları */}
                  {!isCollapsed && (
                    <View style={styles.itemsList}>
                      {items.map((pos, pIdx) => {
                        const isPosProfit = pos.profitTRY >= 0;
                        return (
                          <TouchableOpacity
                            key={`${pos.symbol}-${pIdx}`}
                            style={styles.assetCard}
                            onPress={() => router.push(`/asset/${pos.symbol}` as any)}
                          >
                            <View style={styles.assetCardTop}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.assetSymbol}>{pos.symbol}</Text>
                                  {pos.currency !== 'TRY' && (
                                    <View style={styles.currencyPill}>
                                      <Text style={styles.currencyPillText}>{pos.currency}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.assetFullName} numberOfLines={1}>
                                  {pos.name || pos.symbol}
                                </Text>
                              </View>

                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.assetValue}>
                                  {showValues ? formatCurrency(pos.currentValueTRY) : '••••••'}
                                </Text>
                                <Text
                                  style={[
                                    styles.assetProfitPct,
                                    { color: isPosProfit ? colors.emerald[400] : colors.rose[400] },
                                  ]}
                                >
                                  {showValues ? formatPercent(pos.profitRate) : '••••'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.assetCardBottom}>
                              <Text style={styles.assetMeta}>
                                {pos.quantity.toLocaleString('tr-TR')} Adet • Maliyet: {formatCurrency(pos.avgCostTRY)}
                              </Text>
                              <Text style={styles.assetMeta}>
                                Güncel: {formatCurrency(pos.currentPriceTRY)}
                              </Text>
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
    backgroundColor: colors.bg.primary,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
    backgroundColor: colors.bg.secondary,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 18,
  },
  brandSubtitle: {
    fontSize: 10,
    color: colors.text.muted,
    lineHeight: 12,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.amber[400],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  currencyToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.emerald[400],
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 36,
    gap: 14,
  },
  mainKpiCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.8,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: colors.text.muted,
  },
  kpiMainValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
    marginVertical: 8,
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
    gap: 12,
  },
  statCell: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.muted,
    marginBottom: 3,
  },
  statValWhite: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profitWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValProfit: {
    fontSize: 12,
    fontWeight: '700',
  },
  dailyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
  },
  dailyBarLabel: {
    fontSize: 11,
    color: colors.text.muted,
  },
  dailyBarVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emerald[500],
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  secondaryActionText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionCardCount: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '600',
  },
  allocationBarContainer: {
    gap: 10,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.bg.tertiary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  breakdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categoriesSection: {
    gap: 10,
  },
  categoriesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
    marginLeft: 2,
    marginBottom: 2,
  },
  categoryBlock: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bg.secondary,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categorySubTotal: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 1,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProfit: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
  },
  assetCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  assetCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assetSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  currencyPill: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currencyPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.muted,
  },
  assetFullName: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  assetProfitPct: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  assetCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  assetMeta: {
    fontSize: 10,
    color: colors.text.muted,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
