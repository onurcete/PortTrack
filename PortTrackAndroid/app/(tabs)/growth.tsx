import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ShieldCheck, Calendar } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface MonthSnapshot {
  id: string;
  month: string;
  besTRY: number;
  bistTRY: number;
  tefasTRY: number;
  foreignTRY: number;
  cryptoTRY: number;
  totalTRY: number;
  totalUSD?: number;
}

export default function GrowthScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshots, setSnapshots] = useState<MonthSnapshot[]>([]);

  const fetchGrowth = useCallback(async () => {
    try {
      const res = await api.get<{ snapshots: MonthSnapshot[] }>('/growth/snapshots');
      if (res.data?.snapshots) {
        setSnapshots(res.data.snapshots);
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

  const latestSnapshot = snapshots[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Büyüme & BES Takibi</Text>
        <Text style={styles.headerSubtitle}>Aylık Portföy ve Birikim Gelişimi</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.emerald[400]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.emerald[400]}
            />
          }
        >
          {/* BES Kartı */}
          <View style={styles.besCard}>
            <View style={styles.besHeader}>
              <View style={styles.besIconCircle}>
                <ShieldCheck size={22} color={colors.amber[400]} />
              </View>
              <View>
                <Text style={styles.besTitle}>Bireysel Emeklilik (BES)</Text>
                <Text style={styles.besSubtitle}>Güncel BES Toplam Değeri</Text>
              </View>
            </View>
            <Text style={styles.besValue}>
              {formatCurrency(latestSnapshot?.besTRY ?? 0)}
            </Text>
          </View>

          {/* Aylık Dökümler */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ay Sonu Portföy Kapanışları</Text>
            {snapshots.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Henüz kayıtlı ay sonu bakiyesi bulunmuyor.
                </Text>
              </View>
            ) : (
              snapshots.map((snap) => (
                <View key={snap.id} style={styles.snapRow}>
                  <View style={styles.snapLeft}>
                    <View style={styles.snapDateRow}>
                      <Calendar size={14} color={colors.text.muted} />
                      <Text style={styles.snapMonth}>
                        {new Date(snap.month).toLocaleDateString('tr-TR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.snapSubBreakdown}>
                      BIST: {formatCurrency(snap.bistTRY)} • Fon: {formatCurrency(snap.tefasTRY)}
                    </Text>
                  </View>
                  <View style={styles.snapRight}>
                    <Text style={styles.snapTotal}>
                      {formatCurrency(snap.totalTRY)}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 16,
  },
  besCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  besHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  besIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  besTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  besSubtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  besValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.amber[400],
    marginTop: 14,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  snapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  snapLeft: {
    flex: 1,
  },
  snapDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  snapSubBreakdown: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
  },
  snapRight: {
    alignItems: 'flex-end',
  },
  snapTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.emerald[400],
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
  },
});
