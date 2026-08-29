/**
 * PortTrack Android Veri Tipleri
 * Web projesinin Prisma şeması ve API modelleriyle senkronizedir.
 */

export type AssetType =
  | 'BIST'
  | 'TEFAS'
  | 'FOREIGN'
  | 'FX'
  | 'METAL'
  | 'CRYPTO'
  | 'BES';

export type TransactionSide = 'BUY' | 'SELL';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isDemo: boolean;
  theme: string;
  defaultCurrency: string;
  dailyDigestEnabled: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  assetType: AssetType;
  symbol: string;
  side: TransactionSide;
  unitPrice: number;
  quantity: number;
  total: number;
  currency: string;
  note?: string | null;
}

export interface PortfolioPosition {
  symbol: string;
  name?: string;
  assetType: AssetType;
  quantity: number;
  avgCostTRY: number;
  avgCostNative: number;
  currentPriceTRY: number;
  currentPriceNative: number;
  totalCostTRY: number;
  currentValueTRY: number;
  profitTRY: number;
  profitRate: number;
  dailyChangePct?: number | null;
  currency: string;
  weightPercent: number;
}

export interface PeriodReturns {
  dailyTRY?: number | null;
  dailyUSD?: number | null;
  dailyAmtTRY?: number | null;
  dailyAmtUSD?: number | null;
  weeklyTRY?: number | null;
  weeklyUSD?: number | null;
  weeklyAmtTRY?: number | null;
  weeklyAmtUSD?: number | null;
  mtdTRY?: number | null;
  mtdUSD?: number | null;
  mtdAmtTRY?: number | null;
  mtdAmtUSD?: number | null;
  monthlyTRY?: number | null;
  monthlyUSD?: number | null;
  monthlyAmtTRY?: number | null;
  monthlyAmtUSD?: number | null;
  ytdTRY?: number | null;
  ytdUSD?: number | null;
  ytdAmtTRY?: number | null;
  ytdAmtUSD?: number | null;
  oneYearTRY?: number | null;
  oneYearUSD?: number | null;
}

export interface PortfolioSummary {
  totalValueTRY: number;
  totalCostTRY: number;
  totalProfitTRY: number;
  totalProfitPercent: number;
  dailyChangeTRY: number;
  dailyChangePercent: number;
  periodReturns?: PeriodReturns | null;
  positions: PortfolioPosition[];
  assetBreakdown: {
    type: AssetType;
    label: string;
    valueTRY: number;
    percent: number;
    color: string;
  }[];
  lastUpdated?: string | null;
}

export interface TechnicalSignal {
  symbol: string;
  assetType: string;
  score: number;
  trendSignal: 'STRONG_UP' | 'UP' | 'DOWN' | 'STRONG_DOWN';
  macdSignal: 'POSITIVE' | 'NEGATIVE' | 'BUY_CROSS' | 'SELL_CROSS';
  rsiZone: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  commentary: string;
  alerts: string[];
}

export interface AnalysisBriefing {
  id: string;
  date: string;
  payload: {
    summary?: string;
    highlights?: string[];
    sentiment?: 'POSITIVE' | 'NEUTRAL' | 'CAUTIOUS';
    marketOutlook?: string;
    risks?: string[];
  };
}
