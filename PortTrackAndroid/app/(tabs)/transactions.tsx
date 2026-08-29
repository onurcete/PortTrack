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
import { Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import {
  formatCurrency,
  formatDate,
  getAssetTypeLabel,
  getAssetTypeBadgeColor,
} from '../../utils/formatters';
import { Transaction } from '../../types';

export default function TransactionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get<{ transactions: Transaction[] }>('/transactions');
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('İşlemler hatası:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
  }, [fetchTransactions]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
          <Text style={styles.headerSubtitle}>
            Toplam {transactions.length} İşlem Kaydı
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/modals/add-transaction' as any)}
        >
          <Plus size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>İşlem Ekle</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.emerald[400]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.emerald[400]}
            />
          }
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Kayıtlı işlem bulunamadı.</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isBuy = tx.side === 'BUY';
              const badge = getAssetTypeBadgeColor(tx.assetType);

              return (
                <View key={tx.id} style={styles.txRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isBuy
                          ? colors.emerald.bgSubtle
                          : colors.rose.bgSubtle,
                      },
                    ]}
                  >
                    {isBuy ? (
                      <ArrowDownLeft size={20} color={colors.emerald[400]} />
                    ) : (
                      <ArrowUpRight size={20} color={colors.rose[400]} />
                    )}
                  </View>

                  <View style={styles.txMain}>
                    <View style={styles.txHeader}>
                      <Text style={styles.symbol}>{tx.symbol}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {getAssetTypeLabel(tx.assetType)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.date}>
                      {formatDate(tx.date)} • {tx.quantity.toLocaleString('tr-TR')} Adet @ {formatCurrency(tx.unitPrice, tx.currency)}
                    </Text>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.totalAmount,
                        { color: isBuy ? colors.text.primary : colors.emerald[400] },
                      ]}
                    >
                      {isBuy ? '-' : '+'}{formatCurrency(tx.total, tx.currency)}
                    </Text>
                    <Text
                      style={[
                        styles.sideText,
                        { color: isBuy ? colors.emerald[400] : colors.rose[400] },
                      ]}
                    >
                      {isBuy ? 'ALIŞ' : 'SATIŞ'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emerald[500],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txMain: {
    flex: 1,
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  symbol: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 3,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  sideText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
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
    marginTop: 20,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 14,
  },
});
