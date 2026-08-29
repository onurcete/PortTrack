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
import { Sparkles, TrendingUp, TrendingDown, ShieldAlert, Cpu } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { AnalysisBriefing, TechnicalSignal } from '../../types';

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState<AnalysisBriefing | null>(null);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);

  const fetchAnalysis = useCallback(async () => {
    try {
      const [briefingRes, signalsRes] = await Promise.all([
        api.get<AnalysisBriefing>('/analysis/briefing'),
        api.get<{ signals: TechnicalSignal[] }>('/analysis/signals'),
      ]);

      if (briefingRes.data) {
        setBriefing(briefingRes.data);
      }
      if (signalsRes.data?.signals) {
        setSignals(signalsRes.data.signals);
      }
    } catch (err) {
      console.error('Analiz yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Analiz & Sinyaller</Text>
        <Text style={styles.headerSubtitle}>Yapay Zeka Destekli Piyasa ve Teknik Görünüm</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.purple[400]} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.purple[400]}
            />
          }
        >
          {/* AI Brifing Kartı */}
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={styles.aiIconCircle}>
                <Sparkles size={22} color={colors.purple[400]} />
              </View>
              <View>
                <Text style={styles.aiTitle}>Günün Portföy Brifingi</Text>
                <Text style={styles.aiSubtitle}>Yapay Zeka Analiz Motoru</Text>
              </View>
            </View>

            <Text style={styles.aiSummary}>
              {briefing?.payload?.summary ||
                'Piyasa koşulları ve portföyünüzdeki varlıkların hareketleri analiz ediliyor. Varlıklarınız genel trend doğrultusunda dengeli bir performans sergilemektedir.'}
            </Text>

            {briefing?.payload?.highlights && briefing.payload.highlights.length > 0 && (
              <View style={styles.highlightsContainer}>
                {briefing.payload.highlights.map((item, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Teknik Sinyaller */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teknik İndikatör Sinyalleri</Text>
            {signals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Cpu size={28} color={colors.text.muted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>
                  Portföyünüzdeki hisseler için teknik sinyaller güncelleniyor.
                </Text>
              </View>
            ) : (
              signals.map((sig) => {
                const isBullish = sig.score >= 60;
                return (
                  <View key={sig.symbol} style={styles.signalCard}>
                    <View style={styles.sigTop}>
                      <Text style={styles.sigSymbol}>{sig.symbol}</Text>
                      <View
                        style={[
                          styles.scoreBadge,
                          {
                            backgroundColor: isBullish
                              ? colors.emerald.bgSubtle
                              : colors.rose.bgSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreText,
                            {
                              color: isBullish ? colors.emerald[400] : colors.rose[400],
                            },
                          ]}
                        >
                          Skor: {sig.score}/100
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sigCommentary}>{sig.commentary}</Text>

                    <View style={styles.sigBadges}>
                      <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>RSI: {sig.rsiZone}</Text>
                      </View>
                      <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>Trend: {sig.trendSignal}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
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
  aiCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  aiSubtitle: {
    fontSize: 11,
    color: colors.purple[400],
    marginTop: 2,
  },
  aiSummary: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text.secondary,
    marginTop: 14,
  },
  highlightsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.bg.borderSubtle,
    gap: 6,
  },
  highlightItem: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    color: colors.purple[400],
    fontSize: 14,
  },
  highlightText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
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
  signalCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.bg.borderSubtle,
  },
  sigTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sigSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sigCommentary: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  sigBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  miniBadge: {
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    color: colors.text.muted,
    fontWeight: '500',
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
    fontSize: 13,
    textAlign: 'center',
  },
});
