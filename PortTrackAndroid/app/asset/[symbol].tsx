import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatPercent,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { PortfolioPosition } from '../../types';

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<PortfolioPosition | null>(null);

  useEffect(() => {
    async function fetchAsset() {
      try {
        const res = await api.get<{ position: PortfolioPosition }>(
          `/portfolio/asset?symbol=${symbol}`
        );
        if (res.data?.position) {
          setPosition(res.data.position);
        }
      } catch (err) {
        console.error('Varlık detayı hatası:', err);
      } finally {
        setLoading(false);
      }
    }
    if (symbol) {
      fetchAsset();
    }
  }, [symbol]);

  const badge = position ? getAssetTypeBadgeColor(position.assetType) : null;
  const isProfit = (position?.profitTRY ?? 0) >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Üst Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSymbol}>{symbol}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {getAssetTypeLabel(position!.assetType)}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.emerald[400]} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Fiyat ve Değer Kartı */}
          <View style={styles.mainCard}>
            <Text style={styles.label}>TOPLAM VARLIK DEĞERİ</Text>
            <Text style={styles.mainValue}>
              {formatCurrency(position?.currentValueTRY ?? 0)}
            </Text>

            <View style={styles.profitRow}>
              {isProfit ? (
                <TrendingUp size={16} color={colors.emerald[400]} />
              ) : (
                <TrendingDown size={16} color={colors.rose[400]} />
              )}
              <Text
                style={[
                  styles.profitText,
                  { color: isProfit ? colors.emerald[400] : colors.rose[400] },
                ]}
              >
                {formatCurrency(position?.profitTRY ?? 0)} ({formatPercent(position?.profitRate ?? 0)})
              </Text>
            </View>
          </View>

          {/* İstatistikler */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Sahip Olunan Adet</Text>
              <Text style={styles.statVal}>
                {(position?.quantity ?? 0).toLocaleString('tr-TR')} Adet
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Ortalama Maliyet</Text>
              <Text style={styles.statVal}>
                {formatCurrency(position?.avgCostTRY ?? 0)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Güncel Birim Fiyat</Text>
              <Text style={styles.statVal}>
                {formatCurrency(position?.currentPriceTRY ?? 0)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Toplam Yatırılan Tutar</Text>
              <Text style={styles.statVal}>
                {formatCurrency(position?.totalCostTRY ?? 0)}
              </Text>
            </View>

            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.statLabel}>Portföydeki Ağırlığı</Text>
              <Text style={[styles.statVal, { color: colors.emerald[400] }]}>
                %{((position?.weightPercent ?? 0) * 100).toFixed(1)}
              </Text>
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
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  mainCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.8,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginVertical: 8,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.borderSubtle,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
