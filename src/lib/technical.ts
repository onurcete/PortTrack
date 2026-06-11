/**
 * Teknik Analiz Gösterge Hesaplama Motoru
 *
 * Saf matematik fonksiyonları — API çağrısı yapmaz,
 * sadece fiyat dizisi alıp gösterge hesaplar.
 */

// ────────── Tip Tanımları ──────────

export interface PriceBar {
  date: Date;
  close: number;
  volume?: number;
}

export interface TechnicalIndicators {
  // Hareketli Ortalamalar
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;

  // MACD
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  macdHistogramPrev: number | null; // önceki gün histogram (yön tespiti)

  // RSI
  rsi14: number | null;

  // Bollinger Bantları
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;

  // Hacim
  volume: number | null;
  avgVolume20: number | null;

  // 52 Hafta
  high52w: number | null;
  low52w: number | null;

  // Günlük değişim
  dailyChangePct: number | null;
  currentPrice: number;

  // MACD kesişim (son 3 gün)
  macdCrossover: "BUY_CROSS" | "SELL_CROSS" | null;

  // Golden/Death Cross (son 10 gün)
  maCrossover: "GOLDEN_CROSS" | "DEATH_CROSS" | null;

  // Ardışık gün
  consecutiveUpDays: number;
  consecutiveDownDays: number;
}

// ────────── SMA (Simple Moving Average) ──────────

export function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

// ────────── EMA (Exponential Moving Average) ──────────

export function calculateEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  // İlk EMA = SMA
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

/** EMA serisini döndürür (tüm değerler). */
function emaArray(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  // İlk period kadar NaN/boş olabilir; period noktasından itibaren ekle
  for (let i = 0; i < period; i++) result.push(NaN);
  result[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ────────── MACD ──────────

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(closes: number[]): MACDResult[] {
  const ema12 = emaArray(closes, 12);
  const ema26 = emaArray(closes, 26);

  // MACD = EMA12 - EMA26
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  // Signal = MACD'nin 9 günlük EMA'sı
  const validMacd = macdLine.filter((v) => !isNaN(v));
  if (validMacd.length < 9) return [];

  const signalK = 2 / (9 + 1);
  let signalEma = validMacd.slice(0, 9).reduce((s, v) => s + v, 0) / 9;

  const results: MACDResult[] = [];
  let validIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) continue;
    validIdx++;
    if (validIdx < 9) continue;
    if (validIdx === 9) {
      signalEma =
        validMacd.slice(0, 9).reduce((s, v) => s + v, 0) / 9;
    } else {
      signalEma = macdLine[i] * signalK + signalEma * (1 - signalK);
    }
    results.push({
      macd: macdLine[i],
      signal: signalEma,
      histogram: macdLine[i] - signalEma,
    });
  }

  return results;
}

// ────────── RSI (Relative Strength Index) ──────────

export function calculateRSI(
  closes: number[],
  period: number = 14,
): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // İlk period'daki ortalama kazanç/kayıp
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Sonraki günler için smoothed
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ────────── Bollinger Bantları ──────────

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2,
): BollingerBands | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((s, v) => s + v, 0) / period;
  const variance =
    slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + stdDevMultiplier * stdDev,
    middle,
    lower: middle - stdDevMultiplier * stdDev,
  };
}

// ────────── 52 Hafta Yüksek / Düşük ──────────

export function detect52WeekHighLow(closes: number[]): {
  high: number;
  low: number;
} | null {
  // 252 işlem günü ≈ 1 yıl
  const lookback = Math.min(closes.length, 252);
  if (lookback < 20) return null;
  const slice = closes.slice(-lookback);
  return {
    high: Math.max(...slice),
    low: Math.min(...slice),
  };
}

// ────────── MACD Kesişim Tespiti ──────────

export function detectMACDCrossover(
  macdResults: MACDResult[],
  lookbackDays: number = 3,
): "BUY_CROSS" | "SELL_CROSS" | null {
  if (macdResults.length < lookbackDays + 1) return null;
  const recent = macdResults.slice(-(lookbackDays + 1));

  for (let i = 1; i < recent.length; i++) {
    const prevMacd = recent[i - 1].macd;
    const prevSignal = recent[i - 1].signal;
    const currMacd = recent[i].macd;
    const currSignal = recent[i].signal;

    // Yukarı kesişim: önceki gün MACD < Signal, bugün MACD > Signal
    if (prevMacd <= prevSignal && currMacd > currSignal) {
      return "BUY_CROSS";
    }
    // Aşağı kesişim
    if (prevMacd >= prevSignal && currMacd < currSignal) {
      return "SELL_CROSS";
    }
  }
  return null;
}

// ────────── Golden Cross / Death Cross ──────────

export function detectMACross(
  closes: number[],
  lookbackDays: number = 10,
): "GOLDEN_CROSS" | "DEATH_CROSS" | null {
  // En az 200 + lookback gün lazım
  if (closes.length < 200 + lookbackDays) return null;

  for (let offset = 0; offset < lookbackDays; offset++) {
    const idx = closes.length - 1 - offset;
    const prevIdx = idx - 1;
    if (prevIdx < 200) continue;

    const sma50Now = closes.slice(idx - 49, idx + 1).reduce((s, v) => s + v, 0) / 50;
    const sma200Now = closes.slice(idx - 199, idx + 1).reduce((s, v) => s + v, 0) / 200;
    const sma50Prev = closes.slice(prevIdx - 49, prevIdx + 1).reduce((s, v) => s + v, 0) / 50;
    const sma200Prev = closes.slice(prevIdx - 199, prevIdx + 1).reduce((s, v) => s + v, 0) / 200;

    if (sma50Prev <= sma200Prev && sma50Now > sma200Now) return "GOLDEN_CROSS";
    if (sma50Prev >= sma200Prev && sma50Now < sma200Now) return "DEATH_CROSS";
  }
  return null;
}

// ────────── Ardışık Gün Sayıcı ──────────

export function countConsecutiveDays(closes: number[]): {
  up: number;
  down: number;
} {
  let up = 0;
  let down = 0;

  for (let i = closes.length - 1; i >= 1; i--) {
    if (closes[i] > closes[i - 1]) {
      if (down > 0) break;
      up++;
    } else if (closes[i] < closes[i - 1]) {
      if (up > 0) break;
      down++;
    } else {
      break;
    }
  }

  return { up, down };
}

// ────────── Ana Hesaplama Fonksiyonu ──────────

/**
 * Bir sembolün fiyat geçmişinden tüm teknik göstergeleri hesaplar.
 * En az 50 bar gerektirir; 200+ bar ideal.
 */
export function computeIndicators(bars: PriceBar[]): TechnicalIndicators | null {
  if (bars.length < 30) return null;

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume ?? 0);
  const currentPrice = closes[closes.length - 1];
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : null;

  // SMA
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  // EMA
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  // MACD
  const macdResults = calculateMACD(closes);
  const lastMacd = macdResults.length > 0 ? macdResults[macdResults.length - 1] : null;
  const prevMacd = macdResults.length > 1 ? macdResults[macdResults.length - 2] : null;
  const macdCrossover = detectMACDCrossover(macdResults, 3);

  // RSI
  const rsi14 = calculateRSI(closes, 14);

  // Bollinger
  const bollinger = calculateBollingerBands(closes, 20, 2);

  // Hacim
  const hasVolume = volumes.some((v) => v > 0);
  const currentVolume = hasVolume ? volumes[volumes.length - 1] : null;
  const avgVolume20 = hasVolume ? calculateSMA(volumes, 20) : null;

  // 52H
  const highLow = detect52WeekHighLow(closes);

  // Günlük değişim
  const dailyChangePct =
    prevClose !== null && prevClose > 0
      ? ((currentPrice - prevClose) / prevClose) * 100
      : null;

  // MA Crossover
  const maCrossover = detectMACross(closes, 10);

  // Ardışık gün
  const consecutive = countConsecutiveDays(closes);

  return {
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    macd: lastMacd?.macd ?? null,
    macdSignal: lastMacd?.signal ?? null,
    macdHistogram: lastMacd?.histogram ?? null,
    macdHistogramPrev: prevMacd?.histogram ?? null,
    rsi14,
    bollingerUpper: bollinger?.upper ?? null,
    bollingerMiddle: bollinger?.middle ?? null,
    bollingerLower: bollinger?.lower ?? null,
    volume: currentVolume,
    avgVolume20,
    high52w: highLow?.high ?? null,
    low52w: highLow?.low ?? null,
    dailyChangePct,
    currentPrice,
    macdCrossover,
    maCrossover,
    consecutiveUpDays: consecutive.up,
    consecutiveDownDays: consecutive.down,
  };
}
