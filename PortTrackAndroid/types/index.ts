/**
 * PortTrack Android Veri Tipleri
 * Web projesinin Prisma şeması ve API modelleriyle senkronizedir.
 */

export type AssetType =
  | 'BIST'
  | 'TEFAS'
  | 'BES_FUND'
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
  avgCostUSD?: number;
  avgCostNative: number;
  currentPriceTRY: number;
  currentPriceUSD?: number;
  currentPriceNative: number;
  totalCostTRY: number;
  totalCostUSD?: number;
  currentValueTRY: number;
  currentValueUSD?: number;
  profitTRY: number;
  profitUSD?: number;
  profitRate: number;
  profitRateTRY?: number;
  profitRateUSD?: number;
  dailyChangePct?: number | null;
  currency: string;
  weightPercent: number;
  realizedTRY?: number;
  realizedUSD?: number;
  totalBuyTRY?: number;
  totalBuyUSD?: number;
  totalSellTRY?: number;
  totalSellUSD?: number;
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
  threeMonthsTRY?: number | null;
  threeMonthsUSD?: number | null;
  threeMonthsAmtTRY?: number | null;
  threeMonthsAmtUSD?: number | null;
  ytdTRY?: number | null;
  ytdUSD?: number | null;
  ytdAmtTRY?: number | null;
  ytdAmtUSD?: number | null;
  oneYearTRY?: number | null;
  oneYearUSD?: number | null;
  oneYearAmtTRY?: number | null;
  oneYearAmtUSD?: number | null;
}

export interface PortfolioSummary {
  totalValueTRY: number;
  totalValueUSD?: number;
  totalCostTRY: number;
  totalCostUSD?: number;
  totalProfitTRY: number;
  totalProfitUSD?: number;
  totalProfitPercent: number;
  dailyChangeTRY: number;
  dailyChangeUSD?: number;
  dailyChangePercent: number;
  currentUsdTry?: number;
  periodReturns?: PeriodReturns | null;
  positions: PortfolioPosition[];
  assetBreakdown: {
    type: AssetType;
    label: string;
    valueTRY: number;
    valueUSD?: number;
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

export interface InvestorPoint {
  date: string;
  investors: number;
}

export type InvestorTrend = 'up' | 'down' | 'flat' | 'unknown';
export type InvestorMagnitude = 'none' | 'notable' | 'strong';

export interface TefasFundInvestorStats {
  symbol: string;
  latest: number | null;
  priorWeek: number | null;
  weekDelta: number | null;
  weekDeltaPct: number | null;
  magnitude: InvestorMagnitude;
  trend4w: InvestorTrend;
  series: InvestorPoint[];
}

export interface TefasInvestorSummary {
  fundsWithData: number;
  risingCount: number;
  fallingCount: number;
  flatCount: number;
  topInflow: { symbol: string; weekDeltaPct: number; weekDelta: number } | null;
  topOutflow: { symbol: string; weekDeltaPct: number; weekDelta: number } | null;
  funds: TefasFundInvestorStats[];
}
