import {
  resolveAssetTypeDetailed,
  type AssetType,
  type AssetTypeResolutionConfidence,
} from "./assets";

export interface ParsedTransaction {
  date: Date;
  assetType: AssetType;
  symbol: string;
  side: "BUY" | "SELL";
  unitPrice: number;
  quantity: number;
  total: number;
  currency: "TRY" | "USD";
  note?: string;
}

/** Bir CSV satirini (tirnakli alanlar dahil) hucrelere ayirir. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/** "124.49" / "1.234,56" / "1234.56" gibi degerleri sayiya cevirir. */
export function parseNumber(raw: string): number {
  let s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Turkce format: nokta binlik, virgul ondalik
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  return Number(s);
}

function parseDate(raw: string): Date {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  const fallback = new Date(s);
  return fallback;
}

function formatPreviewDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function resolveCurrency(assetType: AssetType): "TRY" | "USD" {
  return assetType === "FOREIGN" ? "USD" : "TRY";
}

export interface ParseResult {
  rows: ParsedTransaction[];
  errors: string[];
}

export interface ParsedCsvTransaction extends ParsedTransaction {
  lineNo: number;
  rawType: string;
  confidence: AssetTypeResolutionConfidence;
  resolutionReason: string;
}

export interface CsvImportExample {
  lineNo: number;
  date: string;
  symbol: string;
  rawType: string;
  assetType: AssetType;
  currency: "TRY" | "USD";
  confidence: AssetTypeResolutionConfidence;
}

export interface CsvImportUnresolved {
  lineNo: number;
  symbol: string;
  rawType: string;
  suggestedAssetType: AssetType;
  reason: string;
}

export interface CsvImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  requiresReview: number;
  distribution: Array<{ assetType: AssetType; count: number }>;
  examples: CsvImportExample[];
  unresolved: CsvImportUnresolved[];
  errors: string[];
}

export interface DetailedParseResult {
  rows: ParsedCsvTransaction[];
  errors: string[];
  preview: CsvImportPreview;
}

/** transactions.csv icerigini ayristirir. */
export function parseTransactionsCsv(content: string): ParseResult {
  const { rows, errors } = parseTransactionsCsvDetailed(content);
  return {
    rows: rows.map((row) => ({
      date: row.date,
      assetType: row.assetType,
      symbol: row.symbol,
      side: row.side,
      unitPrice: row.unitPrice,
      quantity: row.quantity,
      total: row.total,
      currency: row.currency,
    })),
    errors,
  };
}

/** CSV'yi DB'ye yazmadan ayrıntılı önizleme için ayrıştırır. */
export function parseTransactionsCsvDetailed(
  content: string,
  overrides: Record<number, AssetType> = {},
): DetailedParseResult {
  const text = content.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: ParsedCsvTransaction[] = [];
  const errors: string[] = [];

  if (lines.length === 0) {
    return {
      rows,
      errors: ["Dosya boş."],
      preview: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        requiresReview: 0,
        distribution: [],
        examples: [],
        unresolved: [],
        errors: ["Dosya boş."],
      },
    };
  }

  // Ilk satir baslik mi?
  const first = splitCsvLine(lines[0]).join("").toLocaleLowerCase("tr");
  const startIdx = first.includes("tarih") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 7) {
      errors.push(`Satir ${i + 1}: eksik alan (${cols.length}).`);
      continue;
    }
    const [tarih, tur, sembol, islem, birim, adet, toplam, paraBirimi] = cols;
    const date = parseDate(tarih);
    if (isNaN(date.getTime())) {
      errors.push(`Satır ${i + 1}: geçersiz tarih "${tarih}".`);
      continue;
    }
    const sideRaw = islem.toLocaleLowerCase("tr");
    const side: "BUY" | "SELL" = sideRaw.startsWith("sat") ? "SELL" : "BUY";
    const resolution = resolveAssetTypeDetailed(tur, sembol);
    const assetType = overrides[i + 1] ?? resolution.assetType;
    const unitPrice = parseNumber(birim);
    const quantity = parseNumber(adet);
    const total = toplam?.trim() ? parseNumber(toplam) : unitPrice * quantity;

    if (![unitPrice, quantity, total].every(Number.isFinite)) {
      errors.push(`Satır ${i + 1}: sayısal alan okunamadı.`);
      continue;
    }
    const rawCurrency = paraBirimi?.trim().toUpperCase();
    const currency =
      rawCurrency === "TRY" || rawCurrency === "USD"
        ? rawCurrency
        : resolveCurrency(assetType);

    rows.push({
      lineNo: i + 1,
      rawType: tur,
      confidence: overrides[i + 1] ? "exact" : resolution.confidence,
      resolutionReason: overrides[i + 1]
        ? "Kullanıcı tarafından seçildi."
        : resolution.reason,
      date,
      assetType,
      symbol: sembol.trim().toUpperCase(),
      side,
      unitPrice,
      quantity,
      total: total || unitPrice * quantity,
      currency,
    });
  }

  const distribution = Object.values(
    rows.reduce<Record<string, { assetType: AssetType; count: number }>>(
      (acc, row) => {
        const current = acc[row.assetType] ?? {
          assetType: row.assetType,
          count: 0,
        };
        current.count++;
        acc[row.assetType] = current;
        return acc;
      },
      {},
    ),
  );
  const examples: CsvImportExample[] = [];
  const examplesByType = new Map<AssetType, number>();
  for (const row of rows) {
    const count = examplesByType.get(row.assetType) ?? 0;
    if (count >= 2) continue;
    examplesByType.set(row.assetType, count + 1);
    examples.push({
      lineNo: row.lineNo,
      date: formatPreviewDate(row.date),
      symbol: row.symbol,
      rawType: row.rawType,
      assetType: row.assetType,
      currency: row.currency,
      confidence: row.confidence,
    });
  }
  const unresolved = rows
    .filter((row) => row.confidence === "fallback")
    .map((row) => ({
      lineNo: row.lineNo,
      symbol: row.symbol,
      rawType: row.rawType,
      suggestedAssetType: row.assetType,
      reason: row.resolutionReason,
    }));

  return {
    rows,
    errors,
    preview: {
      totalRows: Math.max(0, lines.length - startIdx),
      validRows: rows.length,
      invalidRows: errors.length,
      requiresReview: unresolved.length,
      distribution,
      examples,
      unresolved,
      errors,
    },
  };
}
