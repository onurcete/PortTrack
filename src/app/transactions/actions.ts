"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  parseTransactionsCsvDetailed,
  type CsvImportPreview,
  type ParsedCsvTransaction,
} from "@/lib/csv";
import { resolveAssetType, ASSET_TYPES, type AssetType } from "@/lib/assets";
import { resolveCurrentPriceTRY, getUsdTryRate } from "@/lib/prices";
import { requireUser } from "@/lib/auth";

const txSchema = z.object({
  date: z.string().min(1),
  assetType: z.enum(ASSET_TYPES as [AssetType, ...AssetType[]]),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  unitPrice: z.coerce.number(),
  quantity: z.coerce.number(),
  total: z.coerce.number().optional(),
  currency: z.enum(["TRY", "USD"]),
  note: z.string().optional(),
});

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export type CsvImportMode = "replace" | "append";

export interface CsvImportResult extends ActionResult {
  added?: number;
  duplicates?: number;
  replaced?: number;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/growth");
  revalidatePath("/performance");
}

import { smartBackfillUserSymbols } from "@/lib/history";
import { refreshPrices } from "@/lib/refresh";

export async function createTransaction(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = txSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Geçersiz veri." };
  }
  const d = parsed.data;
  const total =
    d.total && Number.isFinite(d.total) && d.total > 0
      ? d.total
      : d.unitPrice * d.quantity;

  const symbol = d.symbol.trim().toUpperCase();

  await prisma.transaction.create({
    data: {
      userId,
      date: new Date(d.date),
      assetType: d.assetType,
      symbol,
      side: d.side,
      unitPrice: d.unitPrice,
      quantity: d.quantity,
      total,
      currency: d.currency,
      note: d.note || null,
    },
  });

  // 1. Önce güncel fiyatları yenile (Modal kapanmadan önce eşzamanlı çalışır)
  await refreshPrices().catch((err) =>
    console.error("Auto refreshPrices error on transaction create:", err)
  );

  revalidateAll();
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = txSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Geçersiz veri." };
  const d = parsed.data;
  const total =
    d.total && Number.isFinite(d.total) && d.total > 0
      ? d.total
      : d.unitPrice * d.quantity;

  await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      date: new Date(d.date),
      assetType: d.assetType,
      symbol: d.symbol.trim().toUpperCase(),
      side: d.side,
      unitPrice: d.unitPrice,
      quantity: d.quantity,
      total,
      currency: d.currency,
      note: d.note || null,
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const userId = await requireUser();
  await prisma.transaction.deleteMany({ where: { id, userId } });
  revalidateAll();
  return { ok: true };
}

/** CSV'yi DB'ye yazmadan analiz eder ve önizleme verisini döner. */
export async function previewCsvImport(
  content: string,
): Promise<CsvImportPreview> {
  await requireUser();
  return parseTransactionsCsvDetailed(content).preview;
}

function transactionFingerprint(row: {
  date: Date;
  symbol: string;
  side: string;
  unitPrice: number;
  quantity: number;
  total: number;
  currency: string;
}) {
  return [
    row.date.toISOString().slice(0, 10),
    row.symbol,
    row.side,
    row.unitPrice,
    row.quantity,
    row.total,
    row.currency,
  ].join("|");
}

async function upsertImportedInstruments(
  rows: ParsedCsvTransaction[],
  userId: string,
) {
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.symbol)) continue;
    seen.add(r.symbol);
    await prisma.instrument.upsert({
      where: { symbol_userId: { symbol: r.symbol, userId } },
      create: {
        symbol: r.symbol,
        userId,
        assetType: r.assetType,
        currency: r.currency,
        priceSource:
          r.assetType === "TEFAS"
            ? "tefas"
            : r.assetType === "BES"
              ? "manual"
              : "yahoo",
      },
      update: {
        assetType: r.assetType,
        currency: r.currency,
        priceSource:
          r.assetType === "TEFAS"
            ? "tefas"
            : r.assetType === "BES"
              ? "manual"
              : "yahoo",
      },
    });
  }
}

/** Kullanıcının onayladığı CSV'yi seçilen modda içeri aktarır. */
export async function confirmCsvImport(
  content: string,
  mode: CsvImportMode,
  overrides: Record<number, AssetType> = {},
): Promise<CsvImportResult> {
  const userId = await requireUser();
  const { rows, errors, preview } = parseTransactionsCsvDetailed(
    content,
    overrides,
  );
  if (rows.length === 0) {
    return {
      ok: false,
      message: `Hiç satır okunamadı. ${errors.slice(0, 2).join(" ")}`,
    };
  }
  if (preview.requiresReview > 0) {
    return {
      ok: false,
      message: "Belirsiz türleri seçmeden içe aktarma yapılamaz.",
    };
  }

  let rowsToCreate = rows;
  let replaced = 0;
  let duplicates = 0;

  if (mode === "append") {
    const existing = await prisma.transaction.findMany({
      where: { userId },
      select: {
        date: true,
        symbol: true,
        side: true,
        unitPrice: true,
        quantity: true,
        total: true,
        currency: true,
      },
    });
    const existingKeys = new Set(existing.map(transactionFingerprint));
    const newKeys = new Set<string>();
    rowsToCreate = rows.filter((row) => {
      const key = transactionFingerprint(row);
      if (existingKeys.has(key) || newKeys.has(key)) {
        duplicates++;
        return false;
      }
      newKeys.add(key);
      return true;
    });
  } else {
    replaced = await prisma.transaction.count({ where: { userId } });
  }

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.transaction.deleteMany({ where: { userId } });
    }
    if (rowsToCreate.length > 0) {
      await tx.transaction.createMany({
        data: rowsToCreate.map((r) => ({
          userId,
          date: r.date,
          assetType: r.assetType,
          symbol: r.symbol,
          side: r.side,
          unitPrice: r.unitPrice,
          quantity: r.quantity,
          total: r.total,
          currency: r.currency,
        })),
      });
    }
  });

  await upsertImportedInstruments(rowsToCreate, userId);
  revalidateAll();
  const skipped = errors.length + duplicates;
  return {
    ok: true,
    added: rowsToCreate.length,
    duplicates,
    replaced,
    message:
      mode === "replace"
        ? `${replaced} mevcut işlem silindi, ${rowsToCreate.length} işlem içeri aktarıldı${skipped ? ` (${skipped} satır atlandı)` : ""}.`
        : `${rowsToCreate.length} işlem eklendi${duplicates ? `, ${duplicates} mükerrer satır atlandı` : ""}${errors.length ? `, ${errors.length} hatalı satır atlandı` : ""}.`,
  };
}

export interface SearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  source: "db" | "yahoo";
}

function normalizeTurkish(text: string): string {
  return text
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
}

function getRecentTradingDate(): string {
  const d = new Date();
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2); // Pazar -> Cuma
  else if (day === 6) d.setDate(d.getDate() - 1); // Cumartesi -> Cuma
  else {
    d.setDate(d.getDate() - 1); // Dün
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

interface TefasCachedFund {
  symbol: string;
  name: string;
}

const TEFAS_CACHE_FILE = path.join(process.cwd(), "src/lib/tefas_cache.json");

async function getCachedTefasFunds(): Promise<TefasCachedFund[]> {
  try {
    const stats = await fs.stat(TEFAS_CACHE_FILE);
    if (Date.now() - stats.mtimeMs < 3 * 24 * 60 * 60 * 1000) {
      const content = await fs.readFile(TEFAS_CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Cache geçersiz veya mevcut değil
  }

  try {
    const funds: TefasCachedFund[] = [];
    const kinds = ["YAT", "EMK", "BYF"];
    const tradingDate = getRecentTradingDate();

    for (const kind of kinds) {
      const body = {
        fonTipi: kind,
        fonKodu: null,
        aramaMetni: null,
        fonTurKod: null,
        fonGrubu: null,
        sfonTurKod: null,
        fonTurAciklama: null,
        kurucuKod: null,
        basTarih: tradingDate,
        bitTarih: tradingDate,
        basSira: 1,
        bitSira: 100000,
        dil: "TR",
        sFonTurKod: "",
        fonKod: "",
        fonGrup: "",
        fonUnvanTip: "",
      };

      const res = await fetch("https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          Origin: "https://www.tefas.gov.tr",
          Referer: "https://www.tefas.gov.tr/tr/fon-verileri",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const resultList = json.resultList || [];
        for (const row of resultList) {
          if (row.fonKodu) {
            funds.push({
              symbol: row.fonKodu.trim().toUpperCase(),
              name: row.fonUnvan ? row.fonUnvan.trim() : row.fonKodu,
            });
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (funds.length > 0) {
      await fs.mkdir(path.dirname(TEFAS_CACHE_FILE), { recursive: true });
      await fs.writeFile(TEFAS_CACHE_FILE, JSON.stringify(funds, null, 2), "utf-8");
      return funds;
    }
  } catch (err) {
    console.error("Error fetching TEFAS funds list:", err);
  }

  // Fallback popüler fonlar
  return [
    { symbol: "MAC", name: "Marmara Capital Portföy Hisse Senedi Fonu" },
    { symbol: "TCD", name: "Tacirler Portföy Değişken Fon" },
    { symbol: "GMR", name: "Garanti Portföy Hisse Senedi Fonu" },
    { symbol: "TI1", name: "İş Portföy Hisse Senedi Fonu" },
    { symbol: "IYZ", name: "İş Portföy Teknoloji Karma Fonu" },
    { symbol: "AFT", name: "Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu" },
    { symbol: "YAY", name: "Yapı Kredi Portföy Yabancı Teknoloji Sektörü Hisse Senedi Fonu" },
    { symbol: "AAS", name: "Ata Portföy Fon Sepeti Fonu" },
    { symbol: "TDF", name: "TEB Portföy Hisse Senedi Fonu" },
    { symbol: "OPH", name: "Osmanlı Portföy Hisse Senedi Fonu" },
  ];
}

interface BistCachedStock {
  symbol: string;
  name: string;
}

const BIST_CACHE_FILE = path.join(process.cwd(), "src/lib/bist_cache.json");

async function getCachedBistStocks(): Promise<BistCachedStock[]> {
  try {
    const stats = await fs.stat(BIST_CACHE_FILE);
    // Cache is valid for 7 days
    if (Date.now() - stats.mtimeMs < 7 * 24 * 60 * 60 * 1000) {
      const content = await fs.readFile(BIST_CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Cache doesn't exist or is invalid
  }

  try {
    const res = await fetch("https://raw.githubusercontent.com/ahmeterenodaci/Istanbul-Stock-Exchange--BIST--including-symbols-and-logos/main/without_logo.csv");
    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n");
      const stocks: BistCachedStock[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const lastCommaIndex = line.lastIndexOf(",");
        if (lastCommaIndex !== -1) {
          const name = line.substring(0, lastCommaIndex).trim();
          const symbol = line.substring(lastCommaIndex + 1).trim().toUpperCase();
          if (symbol) {
            stocks.push({ symbol, name });
          }
        }
      }

      if (stocks.length > 0) {
        await fs.mkdir(path.dirname(BIST_CACHE_FILE), { recursive: true });
        await fs.writeFile(BIST_CACHE_FILE, JSON.stringify(stocks, null, 2), "utf-8");
        return stocks;
      }
    }
  } catch (err) {
    console.error("Error fetching BIST stocks list:", err);
  }

  // Fallback popüler BIST hisseleri
  return [
    { symbol: "THYAO", name: "TÜRK HAVA YOLLARI A.O." },
    { symbol: "EREGL", name: "EREĞLİ DEMİR VE ÇELİK FABRİKALARI T.A.Ş." },
    { symbol: "TUPRS", name: "TÜPRAŞ-TÜRKİYE PETROL RAFİNERİLERİ A.Ş." },
    { symbol: "ASELS", name: "ASELSAN ELEKTRONİK SANAYİ VE TİCARET A.Ş." },
    { symbol: "GARAN", name: "T. GARANTİ BANKASI A.Ş." },
    { symbol: "AKBNK", name: "AKBANK T.A.Ş." },
    { symbol: "YKBNK", name: "YAPI VE KREDİ BANKASI A.Ş." },
    { symbol: "ISCTR", name: "T. İŞ BANKASI A.Ş." },
    { symbol: "SAHOL", name: "HACI ÖMER SABANCI HOLDİNG A.Ş." },
    { symbol: "KCHOL", name: "KOÇ HOLDİNG A.Ş." },
    { symbol: "SASA", name: "SASA POLYESTER SANAYİ A.Ş." },
    { symbol: "HEKTS", name: "HEKTAŞ TİCARET T.A.Ş." },
    { symbol: "PETKM", name: "PETKİM PETROKİMYA HOLDİNG A.Ş." },
    { symbol: "BIMAS", name: "BİM BİRLEŞİK MAĞAZALAR A.Ş." },
    { symbol: "SISE", name: "TÜRKİYE ŞİŞE VE CAM FABRİKALARI A.Ş." },
  ];
}

export async function searchSymbols(
  query: string,
  assetType: AssetType,
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toUpperCase();
  const normalizedQ = normalizeTurkish(q);

  const userId = await requireUser();
  // 1. Search our database instruments first
  const dbResults = await prisma.instrument.findMany({
    where: {
      userId,
      assetType,
      OR: [
        { symbol: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
  });

  const results: SearchResult[] = dbResults.map((i) => ({
    symbol: i.symbol,
    name: i.name || i.symbol,
    assetType: i.assetType as AssetType,
    source: "db",
  }));

  // 2. Search BIST locally if assetType is BIST (much faster and highly reliable)
  if (assetType === "BIST") {
    try {
      const bistStocks = await getCachedBistStocks();
      const matches = bistStocks.filter((s) => {
        const sym = s.symbol.toUpperCase();
        const nameNormalized = normalizeTurkish(s.name.toUpperCase());

        // Özel kısaltma eşleşmeleri
        if (normalizedQ === "THY" && sym === "THYAO") return true;
        if (normalizedQ === "KRD" && sym.startsWith("KRD")) return true;
        if (normalizedQ === "IS" && sym.startsWith("IS")) return true;

        return (
          sym.includes(normalizedQ) ||
          nameNormalized.includes(normalizedQ)
        );
      });

      for (const match of matches) {
        if (!results.some((r) => r.symbol === match.symbol)) {
          results.push({
            symbol: match.symbol,
            name: match.name,
            assetType: "BIST",
            source: "yahoo",
          });
        }
      }
    } catch (err) {
      console.error("Error searching BIST stocks:", err);
    }
  }

  // 3. Query Yahoo Finance for FOREIGN or CRYPTO if applicable
  if (["FOREIGN", "CRYPTO"].includes(assetType)) {
    try {
      const normalizedQuery = normalizeTurkish(query);
      const urls = [
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedQuery)}&newsCount=0`
      ];

      const responses = await Promise.all(
        urls.map((url) =>
          fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "application/json",
            },
          }).then((r) => (r.ok ? r.json() : null))
        )
      );

      for (const json of responses) {
        if (!json) continue;
        const quotes = json.quotes || [];

        for (const quote of quotes) {
          const sym: string = quote.symbol;
          const name: string = quote.shortname || quote.longname || sym;

          if (assetType === "FOREIGN") {
            if (quote.quoteType === "EQUITY" || quote.quoteType === "ETF") {
              if (
                !sym.includes(".") &&
                !sym.includes("=") &&
                !sym.includes("-")
              ) {
                if (!results.some((r) => r.symbol === sym)) {
                  results.push({
                    symbol: sym,
                    name,
                    assetType: "FOREIGN",
                    source: "yahoo",
                  });
                }
              }
            }
          } else if (assetType === "CRYPTO") {
            if (quote.quoteType === "CRYPTOCURRENCY" || sym.endsWith("-USD")) {
              const baseSymbol = sym.replace("-USD", "");
              if (!results.some((r) => r.symbol === baseSymbol)) {
                results.push({
                  symbol: baseSymbol,
                  name,
                  assetType: "CRYPTO",
                  source: "yahoo",
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error searching Yahoo Finance:", err);
    }
  }

  // 4. Search TEFAS cached list
  if (assetType === "TEFAS") {
    try {
      const tefasFunds = await getCachedTefasFunds();
      const matches = tefasFunds.filter(
        (f) =>
          f.symbol.includes(normalizedQ) ||
          normalizeTurkish(f.name.toUpperCase()).includes(normalizedQ)
      );

      for (const match of matches) {
        if (!results.some((r) => r.symbol === match.symbol)) {
          results.push({
            symbol: match.symbol,
            name: match.name,
            assetType: "TEFAS",
            source: "yahoo",
          });
        }
      }

      // 3 harfli doğrudan kod araması için tam eşleşme yedeği (Örn: ALE)
      if (q.length === 3 && !results.some((r) => r.symbol === q)) {
        results.push({
          symbol: q,
          name: `${q} Fonu`,
          assetType: "TEFAS",
          source: "yahoo",
        });
      }
    } catch (err) {
      console.error("Error searching TEFAS funds:", err);
    }
  }

  return results.slice(0, 15);
}

export interface PriceResult {
  price: number;
  currency: "TRY" | "USD";
}

export async function getSymbolPrice(
  symbol: string,
  assetType: AssetType,
): Promise<PriceResult | null> {
  try {
    const usdTry = await getUsdTryRate();
    const priceInfo = await resolveCurrentPriceTRY(assetType, symbol, usdTry);
    if (priceInfo) {
      let currency: "TRY" | "USD" = "TRY";
      if (priceInfo.currency === "USD" || priceInfo.currency === "USDTRY") {
        currency = "USD";
      }
      return {
        price: priceInfo.price,
        currency,
      };
    }
  } catch (err) {
    console.error("Error getting symbol price:", err);
  }
  return null;
}


