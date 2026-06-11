/**
 * Teknik Analiz Yorum Üretici & Skor Motoru
 *
 * Hesaplanan göstergelerden anlaşılır Türkçe yorum metni,
 * teknik skor (0-100) ve sinyal bayrakları üretir.
 */

import type { TechnicalIndicators } from "./technical";

// ────────── Sinyal Tipleri ──────────

export type TrendSignal = "STRONG_UP" | "UP" | "DOWN" | "STRONG_DOWN";
export type MacdSignalType = "POSITIVE" | "NEGATIVE" | "BUY_CROSS" | "SELL_CROSS";
export type RsiZone = "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT";

export interface AnalysisResult {
  score: number; // 0-100
  commentary: string; // Türkçe yorum paragrafı
  trendSignal: TrendSignal;
  macdSignal: MacdSignalType;
  rsiZone: RsiZone;
  alerts: string[]; // Kısa uyarı mesajları
}

// ────────── Trend Analizi ──────────

function analyzeTrend(ind: TechnicalIndicators): {
  signal: TrendSignal;
  text: string;
  score: number;
} {
  const { currentPrice, sma20, sma50, sma200 } = ind;
  let score = 0;
  const parts: string[] = [];

  // SMA200 üzerinde/altında
  if (sma200 !== null) {
    if (currentPrice > sma200) {
      score += 10;
      parts.push("SMA200 üzerinde");
    } else {
      parts.push("SMA200 altında");
    }
  }

  // SMA50 üzerinde/altında
  if (sma50 !== null) {
    if (currentPrice > sma50) {
      score += 10;
      parts.push("SMA50 üzerinde");
    } else {
      parts.push("SMA50 altında");
    }
  }

  // SMA20 üzerinde/altında
  if (sma20 !== null) {
    if (currentPrice > sma20) {
      score += 5;
    }
  }

  // SMA50 > SMA200 (uzun vadeli trend)
  if (sma50 !== null && sma200 !== null) {
    if (sma50 > sma200) {
      score += 5;
    }
  }

  // Sinyal belirleme
  let signal: TrendSignal;
  if (sma50 !== null && sma200 !== null) {
    if (currentPrice > sma50 && sma50 > sma200) signal = "STRONG_UP";
    else if (currentPrice < sma50 && sma50 < sma200) signal = "STRONG_DOWN";
    else if (sma200 !== null && currentPrice > sma200) signal = "UP";
    else signal = "DOWN";
  } else if (sma200 !== null) {
    signal = currentPrice > sma200 ? "UP" : "DOWN";
  } else if (sma50 !== null) {
    signal = currentPrice > sma50 ? "UP" : "DOWN";
  } else {
    signal = "UP"; // Yeterli veri yok, nötr
  }

  // Metin oluşturma
  let text: string;
  switch (signal) {
    case "STRONG_UP":
      text = `Fiyat hem SMA50 hem SMA200 üzerinde işlem görüyor ve orta-uzun vadeli güçlü yükseliş trendi devam ediyor.`;
      break;
    case "UP":
      text = `Fiyat SMA200 üzerinde seyrediyor, uzun vadeli trend olumlu görünüyor.`;
      break;
    case "DOWN":
      text = `Fiyat uzun vadeli ortalamaların altında, trend baskısı devam ediyor.`;
      break;
    case "STRONG_DOWN":
      text = `Fiyat hem SMA50 hem SMA200 altında, güçlü düşüş trendi hâkim.`;
      break;
  }

  // Tam hiyerarşi kontrolü
  if (sma20 !== null && sma50 !== null && sma200 !== null) {
    if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
      text = `Tüm zaman dilimlerinde güçlü yükseliş: Fiyat > SMA20 > SMA50 > SMA200 hiyerarşisi korunuyor.`;
    } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
      text = `Tüm zaman dilimlerinde güçlü düşüş: Fiyat < SMA20 < SMA50 < SMA200.`;
    }
  }

  return { signal, text, score };
}

// ────────── MACD Analizi ──────────

function analyzeMacd(ind: TechnicalIndicators): {
  signal: MacdSignalType;
  text: string;
  score: number;
} {
  const { macd, macdSignal: sig, macdHistogram, macdHistogramPrev, macdCrossover } = ind;

  if (macd === null || sig === null) {
    return { signal: "POSITIVE", text: "", score: 10 };
  }

  let score = 0;
  let signal: MacdSignalType;
  const parts: string[] = [];

  // MACD pozisyonu
  if (macd > sig) {
    score += 10;
    signal = "POSITIVE";
    parts.push("MACD sinyal çizgisinin üzerinde, pozitif momentum mevcut");
  } else {
    signal = "NEGATIVE";
    parts.push("MACD sinyal çizgisinin altında, negatif momentum hâkim");
  }

  // Histogram yönü
  if (macdHistogram !== null && macdHistogramPrev !== null) {
    if (Math.abs(macdHistogram) > Math.abs(macdHistogramPrev)) {
      if (macdHistogram > 0) {
        score += 5;
        parts.push("ve momentum güçleniyor");
      } else {
        parts.push("ve satış baskısı artıyor");
      }
    } else {
      if (macdHistogram > 0) {
        parts.push("ancak momentum zayıflıyor");
      } else {
        score += 3;
        parts.push("ancak satış baskısı hafifliyor");
      }
    }
  }

  // Kesişim sinyalleri
  if (macdCrossover === "BUY_CROSS") {
    score += 10;
    signal = "BUY_CROSS";
    parts.length = 0;
    parts.push("MACD son günlerde sinyal çizgisini yukarı keserek pozitif momentum sinyali verdi");
  } else if (macdCrossover === "SELL_CROSS") {
    signal = "SELL_CROSS";
    parts.length = 0;
    parts.push("MACD son günlerde sinyal çizgisini aşağı keserek negatif momentum sinyali verdi");
  }

  return { signal, text: parts.join(" ") + ".", score };
}

// ────────── RSI Analizi ──────────

function analyzeRsi(ind: TechnicalIndicators): {
  zone: RsiZone;
  text: string;
  score: number;
} {
  const { rsi14 } = ind;
  if (rsi14 === null) return { zone: "NEUTRAL", text: "", score: 10 };

  const rsiVal = Math.round(rsi14);

  if (rsi14 < 30) {
    return {
      zone: "OVERSOLD",
      text: `RSI ${rsiVal} ile aşırı satım bölgesinde, teknik toparlanma potansiyeli mevcut.`,
      score: 15,
    };
  }
  if (rsi14 > 70) {
    return {
      zone: "OVERBOUGHT",
      text: `RSI ${rsiVal} ile aşırı alım bölgesinde, kısa vadeli geri çekilme riski taşıyor.`,
      score: 0,
    };
  }
  if (rsi14 >= 40 && rsi14 <= 60) {
    return {
      zone: "NEUTRAL",
      text: `RSI ${rsiVal} seviyesinde nötr bölgede, aşırı alım veya satım baskısı yok.`,
      score: 10,
    };
  }
  // 30-40 veya 60-70 arası
  return {
    zone: "NEUTRAL",
    text: `RSI ${rsiVal} seviyesinde${rsi14 > 60 ? ", yükseliş yönlü ancak henüz aşırı alım bölgesinde değil" : ", düşük seviyede ancak henüz aşırı satım bölgesine girmedi"}.`,
    score: 5,
  };
}

// ────────── Hacim Analizi ──────────

function analyzeVolume(ind: TechnicalIndicators): {
  text: string;
  score: number;
} {
  const { volume, avgVolume20, dailyChangePct } = ind;

  if (volume === null || avgVolume20 === null || avgVolume20 === 0) {
    return { text: "", score: 10 };
  }

  const ratio = volume / avgVolume20;

  if (ratio > 1.5 && dailyChangePct !== null && dailyChangePct > 0) {
    return {
      text: "Ortalamanın üzerinde hacimle yükseliş, fiyat hareketi güçlü destek buluyor.",
      score: 15,
    };
  }
  if (ratio > 1.5 && dailyChangePct !== null && dailyChangePct < 0) {
    return {
      text: "Ortalamanın üzerinde hacimle düşüş, satış baskısı güçlü.",
      score: 5,
    };
  }
  if (ratio < 0.5) {
    return {
      text: "Normalin altında işlem hacmi, fiyat hareketleri yanıltıcı olabilir.",
      score: 5,
    };
  }
  // Normal hacim
  return { text: "", score: 10 };
}

// ────────── Bollinger Analizi ──────────

function analyzeBollinger(ind: TechnicalIndicators): {
  text: string;
  score: number;
} {
  const { currentPrice, bollingerUpper, bollingerLower, bollingerMiddle } = ind;
  if (bollingerUpper === null || bollingerLower === null || bollingerMiddle === null) {
    return { text: "", score: 0 };
  }

  if (currentPrice > bollingerUpper) {
    return {
      text: "Fiyat Bollinger üst bandının üzerinde, aşırı genişleme bölgesinde.",
      score: 0,
    };
  }
  if (currentPrice < bollingerLower) {
    return {
      text: "Fiyat Bollinger alt bandının altında, aşırı satım sinyali veriyor.",
      score: 5,
    };
  }

  // Bant daralması tespiti
  const bandwidth = (bollingerUpper - bollingerLower) / bollingerMiddle;
  if (bandwidth < 0.04) {
    return {
      text: "Bollinger bantları aşırı daraldı, volatilite sıkışması yaşanıyor ve sert bir hareket yaklaşıyor olabilir.",
      score: 5,
    };
  }

  return { text: "", score: 5 };
}

// ────────── 52 Hafta Analizi ──────────

function analyze52Week(ind: TechnicalIndicators): {
  text: string;
  score: number;
} {
  const { currentPrice, high52w, low52w } = ind;
  if (high52w === null || low52w === null) return { text: "", score: 5 };

  const range = high52w - low52w;
  if (range === 0) return { text: "", score: 5 };

  const fromHigh = ((high52w - currentPrice) / high52w) * 100;
  const fromLow = ((currentPrice - low52w) / low52w) * 100;

  if (fromHigh <= 5) {
    return {
      text: `Hisse 52 haftalık zirvesine yakın (zirve: ${high52w.toFixed(2)}, -%${fromHigh.toFixed(1)} uzaklıkta).`,
      score: 10,
    };
  }
  if (fromHigh >= 25) {
    return {
      text: `Hisse zirvesinden %${fromHigh.toFixed(0)} gerilemiş durumda (52H zirve: ${high52w.toFixed(2)}).`,
      score: 0,
    };
  }

  const posInRange = ((currentPrice - low52w) / range) * 100;
  if (posInRange < 25) {
    return {
      text: `Hisse 52 haftalık dip bölgesine yakın seyrediyor.`,
      score: 2,
    };
  }

  return { text: "", score: 5 };
}

// ────────── Özel Uyarılar ──────────

function generateAlerts(ind: TechnicalIndicators): string[] {
  const alerts: string[] = [];

  // Golden/Death Cross
  if (ind.maCrossover === "GOLDEN_CROSS") {
    alerts.push("🟡 Golden Cross: SMA50, SMA200'ü yukarı kesti — güçlü uzun vadeli pozitif sinyal.");
  }
  if (ind.maCrossover === "DEATH_CROSS") {
    alerts.push("⚫ Death Cross: SMA50, SMA200'ün altına indi — uzun vadeli zayıflık sinyali.");
  }

  // Ardışık gün uyarıları
  if (ind.consecutiveUpDays >= 5) {
    alerts.push(`📈 ${ind.consecutiveUpDays} gün üst üste yükseliş — aşırı ısınma riski.`);
  }
  if (ind.consecutiveDownDays >= 5) {
    alerts.push(`📉 ${ind.consecutiveDownDays} gün üst üste düşüş — toparlanma potansiyeli.`);
  }

  // RSI aşırı bölge
  if (ind.rsi14 !== null && ind.rsi14 < 25) {
    alerts.push("🔴 RSI aşırı düşük seviyelerde (<%25) — güçlü aşırı satım.");
  }
  if (ind.rsi14 !== null && ind.rsi14 > 80) {
    alerts.push("🔴 RSI aşırı yüksek seviyelerde (>%80) — belirgin aşırı alım.");
  }

  return alerts;
}

// ────────── Çelişki Tespiti ──────────

function detectConflicts(
  trend: TrendSignal,
  macd: MacdSignalType,
  rsi: RsiZone,
): string | null {
  // Trend olumlu ama MACD negatif
  if (
    (trend === "STRONG_UP" || trend === "UP") &&
    (macd === "NEGATIVE" || macd === "SELL_CROSS")
  ) {
    return "Uzun vadeli trend olumlu olmasına rağmen MACD'deki zayıflama kısa vadede düzeltme riskine işaret edebilir.";
  }

  // Trend olumsuz ama RSI aşırı satım
  if (
    (trend === "STRONG_DOWN" || trend === "DOWN") &&
    rsi === "OVERSOLD"
  ) {
    return "Trend düşüş yönlü olsa da RSI aşırı satım bölgesinde; kısa vadeli bir teknik tepki görülebilir.";
  }

  // Trend olumlu ama RSI aşırı alım
  if (
    (trend === "STRONG_UP" || trend === "UP") &&
    rsi === "OVERBOUGHT"
  ) {
    return "Trend güçlü olmasına rağmen RSI aşırı alım bölgesinde; kâr realizasyonu yaşanabilir.";
  }

  return null;
}

// ────────── ANA YORUM FONKSİYONU ──────────

export function generateAnalysis(
  symbol: string,
  ind: TechnicalIndicators,
): AnalysisResult {
  const trend = analyzeTrend(ind);
  const macd = analyzeMacd(ind);
  const rsi = analyzeRsi(ind);
  const volume = analyzeVolume(ind);
  const bollinger = analyzeBollinger(ind);
  const week52 = analyze52Week(ind);
  const alerts = generateAlerts(ind);
  const conflict = detectConflicts(trend.signal, macd.signal, rsi.zone);

  // Skor hesaplama (max 100)
  const rawScore = trend.score + macd.score + rsi.score + volume.score + bollinger.score + week52.score;
  const score = Math.min(100, Math.max(0, rawScore));

  // Yorum metni oluşturma
  const commentParts: string[] = [];

  // Ana trend cümlesi
  commentParts.push(`${symbol} teknik görünümü ${trend.signal === "STRONG_UP" || trend.signal === "UP" ? "olumlu" : "zayıf"}. ${trend.text}`);

  // MACD
  if (macd.text) commentParts.push(macd.text);

  // RSI
  if (rsi.text) commentParts.push(rsi.text);

  // Hacim (sadece anlamlıysa)
  if (volume.text) commentParts.push(volume.text);

  // Bollinger (sadece aşırı bölgedeyse)
  if (bollinger.text) commentParts.push(bollinger.text);

  // 52H
  if (week52.text) commentParts.push(week52.text);

  // Çelişki uyarısı
  if (conflict) {
    commentParts.push(conflict);
    alerts.push(`⚠️ ${conflict}`);
  }

  // Sonuç cümlesi
  if (score >= 70) {
    commentParts.push("Teknik göstergeler mevcut yükseliş eğiliminin devam edebileceğine işaret ediyor.");
  } else if (score >= 40) {
    commentParts.push("Teknik görünüm karışık sinyaller veriyor, dikkatli takip önerilir.");
  } else {
    commentParts.push("Teknik göstergeler baskı altında olduğuna işaret ediyor.");
  }

  return {
    score,
    commentary: commentParts.join(" "),
    trendSignal: trend.signal,
    macdSignal: macd.signal,
    rsiZone: rsi.zone,
    alerts,
  };
}

// ────────── GÜNLÜK ÖZET ──────────

export interface DailySummaryItem {
  symbol: string;
  assetType: string;
  dailyChangePct: number;
  consecutiveUpDays: number;
  consecutiveDownDays: number;
  currentPrice: number;
}

export interface DailySummary {
  totalCount: number;
  upCount: number;
  downCount: number;
  unchangedCount: number;
  topGainers: DailySummaryItem[];
  topLosers: DailySummaryItem[];
  streakAlerts: string[];
  bigMoveAlerts: string[];
}

export function generateDailySummary(items: DailySummaryItem[]): DailySummary {
  const withChange = items.filter((i) => i.dailyChangePct !== null && i.dailyChangePct !== undefined && !isNaN(i.dailyChangePct));

  const upCount = withChange.filter((i) => i.dailyChangePct > 0.01).length;
  const downCount = withChange.filter((i) => i.dailyChangePct < -0.01).length;
  const unchangedCount = withChange.length - upCount - downCount;

  // En çok yükselen/düşen top 3
  const sorted = [...withChange].sort((a, b) => b.dailyChangePct - a.dailyChangePct);
  const topGainers = sorted.slice(0, 3);
  const topLosers = sorted.slice(-3).reverse();

  // Streak uyarıları
  const streakAlerts: string[] = [];
  for (const item of items) {
    if (item.consecutiveDownDays >= 4) {
      streakAlerts.push(`📉 ${item.symbol} ${item.consecutiveDownDays} gün üst üste düşüyor.`);
    }
    if (item.consecutiveUpDays >= 5) {
      streakAlerts.push(`📈 ${item.symbol} ${item.consecutiveUpDays} gün üst üste yükseliyor.`);
    }
  }

  // Büyük hareket uyarıları (günlük %5+)
  const bigMoveAlerts: string[] = [];
  for (const item of withChange) {
    if (item.dailyChangePct > 5) {
      bigMoveAlerts.push(`🚀 ${item.symbol} bugün %${item.dailyChangePct.toFixed(1)} yükseldi — olağandışı hareket.`);
    }
    if (item.dailyChangePct < -5) {
      bigMoveAlerts.push(`💥 ${item.symbol} bugün %${Math.abs(item.dailyChangePct).toFixed(1)} düştü — sert satış yaşandı.`);
    }
  }

  return {
    totalCount: items.length,
    upCount,
    downCount,
    unchangedCount,
    topGainers,
    topLosers,
    streakAlerts,
    bigMoveAlerts,
  };
}
