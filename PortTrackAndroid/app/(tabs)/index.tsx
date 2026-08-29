import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { useAuthStore } from '../../stores/authStore';
import { PortfolioSummary } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await api.get<PortfolioSummary>('/portfolio');
      if (res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error('Portföy yüklenemedi:', err);
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
    // Önce canlı fiyatları yenile, sonra portföyü çek
    try {
      await api.post('/prices/refresh');
    } catch {}
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const totalValue = portfolio?.totalValueTRY ?? 0;
  const totalProfit = portfolio?.totalProfitTRY ?? 0;
  const profitRate = portfolio?.totalProfitPercent ?? 0;
  const dailyChange = portfolio?.dailyChangeTRY ?? 0;
  const dailyPercent = portfolio?.dailyChangePercent ?? 0;

  const isProfit = totalProfit >= 0;
  const isDailyPositive = dailyChange >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Hoş Geldiniz</Text>
          <Text style={styles.headerTitle}>
            {user?.name || user?.email?.split('@')[0] || 'PortTrack'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowValues(!showValues)}
          >
            {showValues ? (
              <Eye size={20} color={colors.text.secondary} />
            ) : (
              <EyeOff size={20} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={20}
              color={refreshing ? colors.emerald[400] : colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

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
        {/* Ana Bakiye Kartı */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Text style={styles.mainCardLabel}>TOPLAM PORTFÖY DEĞERİ</Text>
            {user?.isDemo && (
              <View style={styles.demoBadge}>
                <ShieldCheck size={12} color={colors.amber[400]} />
                <Text style={styles.demoBadgeText}>Demo</Text>
              </View>
            )}
          </View>

          <Text style={styles.mainCardValue}>
            {showValues ? formatCurrency(totalValue, 'TRY') : '•••••••• ₺'}
          </Text>

          {/* Günlük & Toplam Getiri Satırı */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Günlük Değişim</Text>
              <View style={styles.statValueRow}>
                {isDailyPositive ? (
                  <TrendingUp size={14} color={colors.emerald[400]} />
                ) : (
                  <TrendingDown size={14} color={colors.rose[400]} />
                )}
                <Text
                  style={[
                    styles.statValue,
                    { color: isDailyPositive ? colors.emerald[400] : colors.rose[400] },
                  ]}
                >
                  {showValues
                    ? `${formatCurrency(dailyChange)} (${formatPercent(dailyPercent)})`
                    : '••••••'}
                </Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Toplam Kâr/Zarar</Text>
              <View style={styles.statValueRow}>
                {isProfit ? (
                  <TrendingUp size={14} color={colors.emerald[400]} />
                ) : (
                  <TrendingDown size={14} color={colors.rose[400]} />
                )}
                <Text
                  style={[
                    styles.statValue,
                    { color: isProfit ? colors.emerald[400] : colors.rose[400] },
                  ]}
                >
                  {showValues
                    ? `${formatCurrency(totalProfit)} (${formatPercent(profitRate)})`
                    : '••••••'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Hızlı İşlem Butonları */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.emerald[500] }]}
            onPress={() => router.push('/modals/add-transaction' as any)}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.quickActionTextPrimary}>İşlem Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.bg.secondary }]}
            onPress={() => router.push('/(tabs)/analysis')}
          >
            <Sparkles size={18} color={colors.purple[400]} />
            <Text style={styles.quickActionTextSecondary}>AI Görüşü</Text>
          </TouchableOpacity>
        </View>

        {/* Varlık Dağılımı Özeti */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Varlık Dağılımı</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio')}>
              <Text style={styles.sectionLink}>Tümü</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.emerald[400]} style={{ marginVertical: 20 }} />
          ) : portfolio?.positions && portfolio.positions.length > 0 ? (
            <View style={styles.positionsCard}>
              {portfolio.positions.slice(0, 5).map((pos, idx) => (
                <TouchableOpacity
                  key={`${pos.symbol}-${idx}`}
                  style={styles.positionRow}
                  onPress={() => router.push(`/asset/${pos.symbol}` as any)}
                >
                  <View style={styles.posLeft}>
                    <Text style={styles.posSymbol}>{pos.symbol}</Text>
                    <Text style={styles.posName} numberOfLines={1}>
                      {pos.name || pos.assetType}
                    </Text>
                  </View>

                  <View style={styles.posRight}>
                    <Text style={styles.posValue}>
                      {showValues ? formatCurrency(pos.currentValueTRY) : '••••••'}
                    </Text>
                    <Text
                      style={[
                        styles.posProfit,
                        { color: pos.profitRate >= 0 ? colors.emerald[400] : colors.rose[400] },
                      ]}
                    >
                      {showValues ? formatPercent(pos.profitRate) : '••••'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.text.muted} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Henüz portföyünüzde varlık bulunmuyor.</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/modals/add-transaction' as any)}
              >
                <Text style={styles.emptyBtnText}>İlk Varlığınızı Ekleyin</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  mainCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    marginTop: 8,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.8,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber[400],
  },
  mainCardValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text.primary,
    marginVertical: 12,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.bg.borderSubtle,
    marginHorizontal: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  quickActionTextPrimary: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickActionTextSecondary: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.emerald[400],
    fontWeight: '500',
  },
  positionsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    overflow: 'hidden',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  posLeft: {
    flex: 1,
  },
  posSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  posName: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  posRight: {
    alignItems: 'flex-end',
  },
  posValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  posProfit: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
    marginBottom: 14,
  },
  emptyBtn: {
    backgroundColor: colors.emerald[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
