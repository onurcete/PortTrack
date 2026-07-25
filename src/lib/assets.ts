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

export type AssetTypeResolutionConfidence =
  | "exact"
  | "alias"
  | "symbol"
  | "fallback";

export interface AssetTypeResolution {
  assetType: AssetType;
  rawType: string;
  confidence: AssetTypeResolutionConfidence;
  reason: string;
}

/** CSV ile kabul edilen tür etiketleri; export etiketleri de bu sözlükte yer alır. */
export const ASSET_TYPE_ALIASES: Record<AssetType, readonly string[]> = {
  BIST: ["bist", "bıst", "borsa istanbul", "hisse", "hisse senedi"],
  TEFAS: ["fon", "tefas", "tefas fon", "tefas fonu"],
  FOREIGN: [
    "nasdaq",
    "nyse",
    "yabanci borsa",
    "yabancı borsa",
    "yurt disi",
    "yurt dışı",
  ],
  FX: ["doviz", "döviz", "fx", "para birimi"],
  METAL: [
    "altin",
    "altın",
    "gumus",
    "gümüş",
    "metal",
    "kiymetli maden",
    "kıymetli maden",
  ],
  CRYPTO: ["kripto", "crypto", "kripto para", "cryptocurrency"],
  BES: ["bes", "bireysel emeklilik", "bireysel emeklilik sistemi"],
};

/** Türkçe/ASCII farklarını kaldırarak CSV tür etiketlerini karşılaştırılabilir yapar. */
export function normalizeAssetTypeInput(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ");
}

const CRYPTO_SYMBOL = /^(BTC|ETH|SOL|XRP|ADA|DOGE|AVAX|BNB|DOT|LTC)(?:\b|[\/-])/;
const METAL_SYMBOL = /^(XAU|XAG|XPT|XPD|GAU|GUMUS|ALTIN)(?:\b|[\/-])/;

/** CSV tür/simge kombinasyonunu güven seviyesiyle çözer. */
export function resolveAssetTypeDetailed(
  tur: string,
  symbol: string,
): AssetTypeResolution {
  const rawType = tur.trim();
  const normalized = normalizeAssetTypeInput(rawType);
  const s = symbol.trim().toUpperCase();

  // Sembol sinyali, genel "Döviz" gibi belirsiz etiketlerden daha güçlüdür.
  if (CRYPTO_SYMBOL.test(s)) {
    return {
      assetType: "CRYPTO",
      rawType,
      confidence: "symbol",
      reason: "Sembol kripto para olarak tanındı.",
    };
  }
  if (METAL_SYMBOL.test(s)) {
    return {
      assetType: "METAL",
      rawType,
      confidence: "symbol",
      reason: "Sembol kıymetli maden olarak tanındı.",
    };
  }
  if (s.endsWith(".IS")) {
    return {
      assetType: "BIST",
      rawType,
      confidence: "symbol",
      reason: ".IS uzantısı BIST sembolünü gösteriyor.",
    };
  }

  for (const assetType of ASSET_TYPES) {
    const aliases = ASSET_TYPE_ALIASES[assetType].map(normalizeAssetTypeInput);
    if (aliases.includes(normalized)) {
      return {
        assetType,
        rawType,
        confidence:
          normalized === normalizeAssetTypeInput(ASSET_META[assetType].label)
            ? "exact"
            : "alias",
        reason: `${ASSET_META[assetType].label} etiketiyle eşleşti.`,
      };
    }
  }

  return {
    assetType: "FOREIGN",
    rawType,
    confidence: "fallback",
    reason: `"${rawType || "boş"}" türü tanınmadı; seçim yapılması gerekiyor.`,
  };
}

/** Portföy gelişimi tablolarında ay sonu değer kırılımı */
export type GrowthByType = Record<
  AssetType,
  { valueTRY: number; valueUSD: number }
>;

/** CSV'deki "Tur" ve sembolden ic varlik turunu belirler. */
export function resolveAssetType(tur: string, symbol: string): AssetType {
  return resolveAssetTypeDetailed(tur, symbol).assetType;
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
      let yahooSymbol = "GC=F"; // default gold
      if (/^(XAG|GUMUS)/.test(s)) {
        yahooSymbol = "SI=F"; // silver
      } else if (/^XPT/.test(s)) {
        yahooSymbol = "PL=F"; // platinum
      } else if (/^XPD/.test(s)) {
        yahooSymbol = "PA=F"; // palladium
      }
      return {
        source: "yahoo",
        yahooSymbol,
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
