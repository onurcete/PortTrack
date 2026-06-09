// Varlik turleri, CSV "Tur" eslemesi, para birimi ve fiyat kaynagi mantigi

export type AssetType =
  | "BIST"
  | "TEFAS"
  | "FOREIGN"
  | "FX"
  | "METAL"
  | "CRYPTO"
  | "BES";

export type PriceSource = "yahoo" | "yahoo-fx" | "tefas" | "manual";

export interface AssetMeta {
  label: string;
  color: string; // grafik/rozet rengi
}

export const ASSET_META: Record<AssetType, AssetMeta> = {
  BIST: { label: "BIST", color: "#2563eb" },
  TEFAS: { label: "TEFAS Fon", color: "#7c3aed" },
  FOREIGN: { label: "Yabanci Borsa", color: "#0891b2" },
  FX: { label: "Doviz", color: "#059669" },
  METAL: { label: "Kiymetli Maden", color: "#d97706" },
  CRYPTO: { label: "Kripto", color: "#db2777" },
  BES: { label: "BES", color: "#64748b" },
};

export const ASSET_TYPES = Object.keys(ASSET_META) as AssetType[];

/** Portföy gelişimi tablolarında ay sonu değer kırılımı */
export type GrowthByType = Record<
  AssetType,
  { valueTRY: number; valueUSD: number }
>;

/** CSV'deki "Tur" ve sembolden ic varlik turunu belirler. */
export function resolveAssetType(tur: string, symbol: string): AssetType {
  const t = tur.trim().toLocaleLowerCase("tr");
  const s = symbol.trim().toUpperCase();

  if (t === "fon") return "TEFAS";
  if (t === "bes") return "BES";
  if (t === "bist") return "BIST";
  if (t === "doviz" || t.includes("dov") || t.includes("döv")) {
    if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|AVAX|BNB|LTC)\b|\/TRY$/.test(s) === false) {
      // pariteye gore ayristir
    }
    if (/^(BTC|ETH|SOL|XRP|ADA|DOGE|AVAX|BNB|DOT|LTC)/.test(s)) return "CRYPTO";
    if (/^(XAU|XAG|XPT|XPD|GAU|GUMUS|ALTIN)/.test(s)) return "METAL";
    return "FX";
  }
  // Nasdaq, NYSE, SP500, Avrupa borsalari vb.
  return "FOREIGN";
}

export interface PriceMapping {
  source: PriceSource;
  yahooSymbol?: string;
  /** Yahoo fiyati USD ise ve TL pariteye cevrilecekse true */
  multiplyByUsdTry?: boolean;
  /** Birimi gram'a cevirmek icin bolen (ons -> gram) */
  perGramDivisor?: number;
  currency: "TRY" | "USD";
  tefasCode?: string;
}

const TROY_OUNCE_GRAMS = 31.1034768;

/** Sembol icin fiyat kaynagi ve para birimi cozumlemesi. */
export function resolvePriceMapping(
  assetType: AssetType,
  symbol: string,
): PriceMapping {
  const s = symbol.trim().toUpperCase();

  switch (assetType) {
    case "FOREIGN":
      // CSV sembolleri zaten Yahoo formatinda (AAPL, SIVE.ST, LPK.F)
      return { source: "yahoo", yahooSymbol: s, currency: "USD" };

    case "BIST":
      return {
        source: "yahoo",
        yahooSymbol: s.endsWith(".IS") ? s : `${s}.IS`,
        currency: "TRY",
      };

    case "TEFAS":
      return { source: "tefas", tefasCode: s, currency: "TRY" };

    case "FX": {
      // USD/TRY -> 1 USD'nin TL karsiligi
      const base = s.split("/")[0] || s.replace("TRY", "");
      return {
        source: "yahoo-fx",
        yahooSymbol: `${base}TRY=X`,
        currency: "TRY",
      };
    }

    case "CRYPTO": {
      const base = s.split("/")[0] || s.replace("TRY", "");
      return {
        source: "yahoo",
        yahooSymbol: `${base}-USD`,
        multiplyByUsdTry: true,
        currency: "TRY",
      };
    }

    case "METAL": {
      // Gram bazli TL fiyat: USD ons futures -> gram -> TL
      const isGold = /^(XAU|GAU|ALTIN)/.test(s);
      return {
        source: "yahoo",
        yahooSymbol: isGold ? "GC=F" : "SI=F",
        multiplyByUsdTry: true,
        perGramDivisor: TROY_OUNCE_GRAMS,
        currency: "TRY",
      };
    }

    case "BES":
    default:
      return { source: "manual", currency: "TRY" };
  }
}
