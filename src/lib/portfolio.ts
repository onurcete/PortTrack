import { resolvePriceMapping, type AssetType } from "./assets";

export interface TxInput {
  date: Date;
  assetType: AssetType;
  symbol: string;
  side: "BUY" | "SELL";
  unitPrice: number;
  quantity: number;
  total: number; // kendi para biriminde
  currency: "TRY" | "USD";
}

export interface CurrentPriceInfo {
  priceTRY: number;
  native?: number | null;
  nativeCurrency?: string | null;
  prevPriceTRY?: number | null;
  prevPriceNative?: number | null;
}

export interface Position {
  symbol: string;
  assetType: AssetType;
  nativeCurrency: "TRY" | "USD";
  quantity: number;
  avgCostNative: number;
  avgCostTRY: number;
  costTRY: number;
  costUSD: number;
  currentPriceNative: number | null;
  currentPriceTRY: number | null;
  valueTRY: number;
  valueUSD: number;
  unrealizedTRY: number;
  unrealizedUSD: number;
  unrealizedPctTRY: number;
  unrealizedPctUSD: number;
  realizedTRY: number;
  realizedUSD: number;
  hasPrice: boolean;
  firstBuyDate: Date | null;
  totalBuyTRY: number;
  totalBuyUSD: number;
  totalSellTRY: number;
  totalSellUSD: number;
  dailyChangePct: number | null;
  xirrTRY: number | null;
  xirrUSD: number | null;
  mtdPctTRY?: number | null;
  mtdPctUSD?: number | null;
  oneMonthPctTRY?: number | null;
  oneMonthPctUSD?: number | null;
  sixMonthPctTRY?: number | null;
  sixMonthPctUSD?: number | null;
  ytdPctTRY?: number | null;
  ytdPctUSD?: number | null;
  oneYearPctTRY?: number | null;
  oneYearPctUSD?: number | null;
}

export interface PortfolioTotals {
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  unrealizedTRY: number;
  unrealizedUSD: number;
  unrealizedPctTRY: number;
  unrealizedPctUSD: number;
  realizedTRY: number;
  realizedUSD: number;
}

export interface AllocationSlice {
  assetType: AssetType;
  valueTRY: number;
  valueUSD: number;
  pct: number;
}

export type FxLookup = (date: Date) => number;

/** USDTRY gecmisinden tarih -> kur arama fonksiyonu (forward-fill). */
export function buildFxLookup(
  history: { date: Date; rate: number }[],
  fallback: number,
): FxLookup {
  const sorted = [...history].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  return (date: Date) => {
    if (sorted.length === 0) return fallback;
    const t = date.getTime();
    let chosen = sorted[0].rate;
    for (const p of sorted) {
      if (p.date.getTime() <= t) chosen = p.rate;
      else break;
    }
    return chosen || fallback;
  };
}

const EPS = 1e-9;

export function calculateXIRR(cashFlows: { date: Date; amount: number }[]): number | null {
  const hasNegative = cashFlows.some(cf => cf.amount < -1e-2);
  const hasPositive = cashFlows.some(cf => cf.amount > 1e-2);
  if (!hasNegative || !hasPositive) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();

  const flows = sorted.map(cf => ({
    t: (cf.date.getTime() - t0) / (365 * 24 * 60 * 60 * 1000),
    v: cf.amount
  }));

  let r = 0.1; // initial guess
  const maxIterations = 100;
  const precision = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    let f_r = 0;
    let df_r = 0;

    for (const flow of flows) {
      const base = 1 + r;
      if (base <= 0) return null;

      f_r += flow.v / Math.pow(base, flow.t);
      df_r -= (flow.t * flow.v) / Math.pow(base, flow.t + 1);
    }

    if (Math.abs(df_r) < 1e-12) break;

    const nextR = r - f_r / df_r;
    if (Math.abs(nextR - r) < precision) {
      if (nextR < -0.999) return null;
      return nextR * 100;
    }
    r = nextR;
  }

  return null;
}

interface Running {
  qty: number;
  costNative: number;
  costTRY: number;
  costUSD: number;
  realizedTRY: number;
  realizedUSD: number;
  assetType: AssetType;
  currency: "TRY" | "USD";
  firstBuyDate: Date | null;
  totalBuyTRY: number;
  totalBuyUSD: number;
  totalSellTRY: number;
  totalSellUSD: number;
}

/** Islemlerden acik pozisyonlari ve kar/zarari hesaplar. */
export function computePositions(
  transactions: TxInput[],
  prices: Map<string, CurrentPriceInfo>,
  fx: FxLookup,
  currentUsdTry: number,
): { positions: Position[]; totals: PortfolioTotals; allocation: AllocationSlice[] } {
  const bySymbol = new Map<string, Running>();
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  for (const tx of sorted) {
    const key = tx.symbol;
    let r = bySymbol.get(key);
    if (!r) {
      r = {
        qty: 0,
        costNative: 0,
        costTRY: 0,
        costUSD: 0,
        realizedTRY: 0,
        realizedUSD: 0,
        assetType: tx.assetType,
        currency: tx.currency,
        firstBuyDate: null,
        totalBuyTRY: 0,
        totalBuyUSD: 0,
        totalSellTRY: 0,
        totalSellUSD: 0,
      };
      bySymbol.set(key, r);
    }

    const rate = fx(tx.date) || currentUsdTry;
    const totalTRY = tx.currency === "USD" ? tx.total * rate : tx.total;
    const totalUSD = tx.currency === "USD" ? tx.total : tx.total / rate;

    if (tx.side === "BUY") {
      r.qty += tx.quantity;
      r.costNative += tx.total;
      r.costTRY += totalTRY;
      r.costUSD += totalUSD;
      r.totalBuyTRY += totalTRY;
      r.totalBuyUSD += totalUSD;
      if (!r.firstBuyDate || tx.date < r.firstBuyDate) {
        r.firstBuyDate = tx.date;
      }
    } else {
      // SELL
      if (r.qty > EPS) {
        const proportion = Math.min(tx.quantity / r.qty, 1);
        const removedTRY = r.costTRY * proportion;
        const removedUSD = r.costUSD * proportion;
        const removedNative = r.costNative * proportion;
        r.realizedTRY += totalTRY - removedTRY;
        r.realizedUSD += totalUSD - removedUSD;
        r.costTRY -= removedTRY;
        r.costUSD -= removedUSD;
        r.costNative -= removedNative;
        r.qty -= tx.quantity;
      } else {
        // pozisyon yokken satis: tum geliri realize say
        r.realizedTRY += totalTRY;
        r.realizedUSD += totalUSD;
      }
      r.totalSellTRY += totalTRY;
      r.totalSellUSD += totalUSD;
      if (r.qty < EPS) {
        r.qty = 0;
        r.costNative = 0;
        r.costTRY = 0;
        r.costUSD = 0;
      }
    }
  }

  const positions: Position[] = [];

  for (const [symbol, r] of bySymbol) {
    const open = r.qty > EPS;
    const priceInfo = prices.get(symbol);
    const marketHasPrice = !!priceInfo && Number.isFinite(priceInfo.priceTRY);
    // Yeni eklenen veya fiyatı henüz güncellenmemiş enstrümanlarda
    // portföy değerinin sıfır görünüp sahte zarar yazmaması için
    // fiyatı olmayan tüm enstrümanları geçici olarak maliyet bedelinden değerliyoruz.
    const valueAtCost = !marketHasPrice;
    const hasPrice = marketHasPrice || valueAtCost;
    const currentPriceTRY = marketHasPrice ? priceInfo!.priceTRY : null;
    const currentPriceNative =
      priceInfo?.native != null
        ? priceInfo.native
        : currentPriceTRY != null && r.currency === "USD"
          ? currentPriceTRY / (currentUsdTry || 1)
          : currentPriceTRY;

    const costTRY = r.costTRY;
    const costUSD = r.costUSD;
    const valueTRY = open
      ? currentPriceTRY != null
        ? r.qty * currentPriceTRY
        : valueAtCost
          ? costTRY
          : 0
      : 0;
    const valueUSD = open
      ? (currentUsdTry ? valueTRY / currentUsdTry : 0)
      : 0;
    const unrealizedTRY = open && marketHasPrice ? valueTRY - costTRY : 0;
    const unrealizedUSD = open && marketHasPrice ? valueUSD - costUSD : 0;

    const prevPriceNative = priceInfo?.prevPriceNative ?? null;
    const dailyChangePct = (prevPriceNative !== null && prevPriceNative > 0 && currentPriceNative !== null)
      ? ((currentPriceNative - prevPriceNative) / prevPriceNative) * 100
      : null;

    // Reconstruct cash flows for this symbol to compute XIRR
    const symbolTxs = transactions.filter((t) => t.symbol === symbol);
    const cashFlowsTRY: { date: Date; amount: number }[] = [];
    const cashFlowsUSD: { date: Date; amount: number }[] = [];

    for (const t of symbolTxs) {
      const rate = fx(t.date) || currentUsdTry;
      const sign = t.side === "BUY" ? -1 : 1;
      const tTRY = t.currency === "USD" ? t.total * rate : t.total;
      const tUSD = t.currency === "USD" ? t.total : t.total / rate;

      cashFlowsTRY.push({ date: new Date(t.date), amount: sign * tTRY });
      cashFlowsUSD.push({ date: new Date(t.date), amount: sign * tUSD });
    }

    if (open) {
      const today = new Date();
      cashFlowsTRY.push({ date: today, amount: valueTRY });
      cashFlowsUSD.push({ date: today, amount: valueUSD });
    }

    const xirrTRY = calculateXIRR(cashFlowsTRY);
    const xirrUSD = calculateXIRR(cashFlowsUSD);

    positions.push({
      symbol,
      assetType: r.assetType,
      nativeCurrency: r.currency,
      quantity: r.qty,
      avgCostNative: open ? r.costNative / r.qty : 0,
      avgCostTRY: open ? costTRY / r.qty : 0,
      costTRY,
      costUSD,
      currentPriceNative,
      currentPriceTRY,
      valueTRY,
      valueUSD,
      unrealizedTRY,
      unrealizedUSD,
      unrealizedPctTRY: costTRY > EPS ? (unrealizedTRY / costTRY) * 100 : 0,
      unrealizedPctUSD: costUSD > EPS ? (unrealizedUSD / costUSD) * 100 : 0,
      realizedTRY: r.realizedTRY,
      realizedUSD: r.realizedUSD,
      hasPrice,
      firstBuyDate: r.firstBuyDate,
      totalBuyTRY: r.totalBuyTRY,
      totalBuyUSD: r.totalBuyUSD,
      totalSellTRY: r.totalSellTRY,
      totalSellUSD: r.totalSellUSD,
      dailyChangePct,
      xirrTRY,
      xirrUSD,
    });
  }

  // Sirala: acik pozisyonlar deger azalan, sonra kapanmislar
  positions.sort((a, b) => {
    if (a.quantity > EPS && b.quantity <= EPS) return -1;
    if (a.quantity <= EPS && b.quantity > EPS) return 1;
    return b.valueTRY - a.valueTRY;
  });

  const totals: PortfolioTotals = {
    valueTRY: 0,
    valueUSD: 0,
    costTRY: 0,
    costUSD: 0,
    unrealizedTRY: 0,
    unrealizedUSD: 0,
    unrealizedPctTRY: 0,
    unrealizedPctUSD: 0,
    realizedTRY: 0,
    realizedUSD: 0,
  };

  for (const p of positions) {
    totals.valueTRY += p.valueTRY;
    totals.valueUSD += p.valueUSD;
    if (p.quantity > EPS) {
      totals.costTRY += p.costTRY;
      totals.costUSD += p.costUSD;
    }
    totals.realizedTRY += p.realizedTRY;
    totals.realizedUSD += p.realizedUSD;
  }
  totals.unrealizedTRY = totals.valueTRY - totals.costTRY;
  totals.unrealizedUSD = totals.valueUSD - totals.costUSD;
  totals.unrealizedPctTRY =
    totals.costTRY > EPS ? (totals.unrealizedTRY / totals.costTRY) * 100 : 0;
  totals.unrealizedPctUSD =
    totals.costUSD > EPS ? (totals.unrealizedUSD / totals.costUSD) * 100 : 0;

  // Varlik sinifina gore dagilim
  const allocMap = new Map<AssetType, { valueTRY: number; valueUSD: number }>();
  for (const p of positions) {
    if (p.quantity <= EPS || p.valueTRY <= 0) continue;
    const cur = allocMap.get(p.assetType) ?? { valueTRY: 0, valueUSD: 0 };
    cur.valueTRY += p.valueTRY;
    cur.valueUSD += p.valueUSD;
    allocMap.set(p.assetType, cur);
  }
  const allocation: AllocationSlice[] = [...allocMap.entries()]
    .map(([assetType, v]) => ({
      assetType,
      valueTRY: v.valueTRY,
      valueUSD: v.valueUSD,
      pct: totals.valueTRY > 0 ? (v.valueTRY / totals.valueTRY) * 100 : 0,
    }))
    .sort((a, b) => b.valueTRY - a.valueTRY);

  return { positions, totals, allocation };
}
