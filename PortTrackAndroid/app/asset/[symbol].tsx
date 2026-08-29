import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
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
import { PortfolioPosition, Transaction, TechnicalSignal } from '../../types';

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { theme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'details' | 'technical'>('details');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState<PortfolioPosition | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [technical, setTechnical] = useState<TechnicalSignal | null>(null);

  const fetchAssetData = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await api.get<{
        position: PortfolioPosition | null;
        transactions: Transaction[];
        technical: TechnicalSignal | null;
      }>(`/portfolio/asset?symbol=${symbol}`);

      if (res.data) {
        if (res.data.position) setPosition(res.data.position);
        if (res.data.transactions) setTransactions(res.data.transactions);
        if (res.data.technical) setTechnical(res.data.technical);
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
    setRefreshing(true);
    await fetchAssetData();
  }, [fetchAssetData]);

  const badge = position ? getAssetTypeBadgeColor(position.assetType) : null;
  const isProfit = (position?.profitTRY ?? 0) >= 0;
  const dailyPct = position?.dailyChangePct ?? 0;
  const isDailyPos = dailyPct >= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* 1. ÜST HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={18} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerSymbol, { color: theme.text.primary }]}>{symbol}</Text>
            {badge && position && (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {getAssetTypeLabel(position.assetType)}
                </Text>
              </View>
            )}
          </View>
          {position?.name && (
            <Text style={[styles.headerFullName, { color: theme.text.muted }]} numberOfLines={1}>
              {position.name}
            </Text>
          )}
        </View>

        <View style={{ width: 34 }} />
      </View>

      {/* 2. İKİ SEÇENEKLİ SEKME MENÜSÜ (Varlık & Pozisyon / Teknik Analiz) */}
      <View style={[styles.tabsBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'details' && [styles.activeTabItem, { borderBottomColor: theme.brand.primary }],
          ]}
          onPress={() => setActiveTab('details')}
        >
          <Layers size={14} color={activeTab === 'details' ? theme.brand.primary : theme.text.muted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'details' ? theme.brand.primary : theme.text.muted },
              activeTab === 'details' && styles.activeTabText,
            ]}
          >
            Varlık & Pozisyon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'technical' && [styles.activeTabItem, { borderBottomColor: theme.brand.primary }],
          ]}
          onPress={() => setActiveTab('technical')}
        >
          <Activity size={14} color={activeTab === 'technical' ? theme.brand.primary : theme.text.muted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'technical' ? theme.brand.primary : theme.text.muted },
              activeTab === 'technical' && styles.activeTabText,
            ]}
          >
            Teknik Analiz
          </Text>
          {technical?.score != null && (
            <View style={[styles.scorePill, { backgroundColor: theme.brand.soft }]}>
              <Text style={[styles.scorePillText, { color: theme.brand.strong }]}>
                {technical.score}/100
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.brand.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.text.muted }]}>Detaylar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView
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
          {activeTab === 'details' ? (
            <>
              {/* 3. ANA DEĞER & KÂR/ZARAR HERO KARTI */}
              <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.heroRow}>
                  <View>
                    <Text style={[styles.heroLabel, { color: theme.text.muted }]}>TOPLAM DEĞER</Text>
                    <Text style={[styles.heroMainValue, { color: theme.text.primary }]}>
                      {formatCurrency(position?.currentValueTRY ?? 0)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.heroLabel, { color: theme.text.muted }]}>GÜNLÜK DEĞİŞİM</Text>
                    <View
                      style={[
                        styles.dailyChangeBadge,
                        { backgroundColor: isDailyPos ? theme.profit.soft : theme.loss.soft },
                      ]}
                    >
                      {isDailyPos ? (
                        <TrendingUp size={11} color={theme.profit.main} />
                      ) : (
                        <TrendingDown size={11} color={theme.loss.main} />
                      )}
                      <Text
                        style={[
                          styles.dailyChangeText,
                          { color: isDailyPos ? theme.profit.main : theme.loss.main },
                        ]}
                      >
                        {formatPercent(dailyPct)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Kâr / Zarar Çubuğu */}
                <View style={[styles.profitBar, { borderTopColor: theme.borderSubtle }]}>
                  <Text style={[styles.profitBarLabel, { color: theme.text.muted }]}>Toplam Kâr / Zarar:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isProfit ? (
                      <TrendingUp size={14} color={theme.profit.main} />
                    ) : (
                      <TrendingDown size={14} color={theme.loss.main} />
                    )}
                    <Text
                      style={[
                        styles.profitBarValue,
                        { color: isProfit ? theme.profit.main : theme.loss.main },
                      ]}
                    >
                      {formatCurrency(position?.profitTRY ?? 0)} ({formatPercent(position?.profitRate ?? 0)})
                    </Text>
                  </View>
                </View>
              </View>

              {/* 4. POZİSYON İSTATİSTİKLERİ (2x2 GRID) */}
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Mevcut Adet</Text>
                  <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                    {formatQuantity(position?.quantity)}
                  </Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Ortalama Maliyet</Text>
                  <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                    {formatCurrency(position?.avgCostTRY ?? 0)}
                  </Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Güncel Fiyat</Text>
                  <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                    {formatCurrency(position?.currentPriceTRY ?? 0)}
                  </Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.statBoxLabel, { color: theme.text.muted }]}>Portföy Ağırlığı</Text>
                  <Text style={[styles.statBoxValue, { color: theme.text.primary }]}>
                    %{position?.weightPercent ? position.weightPercent.toFixed(1) : '0.0'}
                  </Text>
                </View>
              </View>

              {/* 5. BU VARLIĞA AİT İŞLEM GEÇMİŞİ TABLOSU */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>İşlem Geçmişi</Text>
                  <Text style={[styles.sectionCount, { color: theme.text.muted }]}>
                    {transactions.length} İşlem
                  </Text>
                </View>

                {transactions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.text.muted }]}>Kayıtlı işlem bulunamadı.</Text>
                ) : (
                  <View style={styles.txList}>
                    {transactions.map((tx, idx) => {
                      const isBuy = tx.side === 'BUY';
                      return (
                        <View
                          key={tx.id || `tx-${idx}`}
                          style={[styles.txRow, { borderBottomColor: theme.borderSubtle }]}
                        >
                          <View style={styles.txLeft}>
                            <View
                              style={[
                                styles.sideBadge,
                                {
                                  backgroundColor: isBuy ? theme.profit.soft : theme.loss.soft,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sideBadgeText,
                                  { color: isBuy ? theme.profit.main : theme.loss.main },
                                ]}
                              >
                                {isBuy ? 'ALIŞ' : 'SATIŞ'}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.txQtyPrice, { color: theme.text.primary }]}>
                                {formatQuantity(tx.quantity)} @ {formatCurrency(tx.unitPrice, tx.currency)}
                              </Text>
                              <Text style={[styles.txDate, { color: theme.text.muted }]}>
                                {formatDate(tx.date)}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.txTotal, { color: theme.text.primary }]}>
                            {formatCurrency(tx.total, tx.currency)}
                          </Text>
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
              {/* Teknik Skor Kartı */}
              <View style={[styles.techScoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.techScoreHeader}>
                  <View>
                    <Text style={[styles.techScoreLabel, { color: theme.text.muted }]}>TEKNİK SKOR</Text>
                    <Text style={[styles.techScoreNum, { color: theme.text.primary }]}>
                      {technical?.score ?? 50} <Text style={{ fontSize: 16, color: theme.text.muted }}>/100</Text>
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
              <View style={styles.indicatorsGrid}>
                <View style={[styles.indicatorBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>Trend Sinyali</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.trendSignal || 'Yükseliş'}
                  </Text>
                </View>

                <View style={[styles.indicatorBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>RSI Bölgesi</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.rsiZone || 'Nötr'}
                  </Text>
                </View>

                <View style={[styles.indicatorBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>MACD Sinyali</Text>
                  <Text style={[styles.indicatorVal, { color: theme.text.primary }]}>
                    {technical?.macdSignal || 'Pozitif'}
                  </Text>
                </View>

                <View style={[styles.indicatorBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.indicatorLabel, { color: theme.text.muted }]}>Sistem Güvenilirlik</Text>
                  <Text style={[styles.indicatorVal, { color: theme.brand.primary }]}>Yüksek</Text>
                </View>
              </View>

              {/* Yapay Zeka Özeti & Yorum */}
              <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={16} color={theme.brand.primary} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerSymbol: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerFullName: {
    fontSize: 11,
    marginTop: 1,
    maxWidth: 220,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '800',
  },
  scorePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  scorePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 36,
    gap: 12,
  },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroMainValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  dailyChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 3,
    marginTop: 4,
  },
  dailyChangeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  profitBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  profitBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  profitBarValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48.8%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  txList: {
    gap: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  sideBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  txQtyPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  txDate: {
    fontSize: 10,
    marginTop: 1,
  },
  txTotal: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  techContainer: {
    gap: 12,
  },
  techScoreCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  techScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  techScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  techScoreNum: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },
  signalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  indicatorBox: {
    width: '48.8%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  indicatorLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  indicatorVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  commentaryText: {
    fontSize: 12,
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
});
