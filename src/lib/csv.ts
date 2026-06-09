import { resolveAssetType, type AssetType } from "./assets";

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

function resolveCurrency(assetType: AssetType): "TRY" | "USD" {
  return assetType === "FOREIGN" ? "USD" : "TRY";
}

export interface ParseResult {
  rows: ParsedTransaction[];
  errors: string[];
}

/** transactions.csv icerigini ayristirir. */
export function parseTransactionsCsv(content: string): ParseResult {
  const text = content.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: ParsedTransaction[] = [];
  const errors: string[] = [];

  if (lines.length === 0) return { rows, errors: ["Dosya bos."] };

  // Ilk satir baslik mi?
  const first = splitCsvLine(lines[0]).join("").toLocaleLowerCase("tr");
  const startIdx = first.includes("tarih") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 7) {
      errors.push(`Satir ${i + 1}: eksik alan (${cols.length}).`);
      continue;
    }
    const [tarih, tur, sembol, islem, birim, adet, toplam] = cols;
    const date = parseDate(tarih);
    if (isNaN(date.getTime())) {
      errors.push(`Satir ${i + 1}: gecersiz tarih "${tarih}".`);
      continue;
    }
    const sideRaw = islem.toLocaleLowerCase("tr");
    const side: "BUY" | "SELL" = sideRaw.startsWith("sat") ? "SELL" : "BUY";
    const assetType = resolveAssetType(tur, sembol);
    const unitPrice = parseNumber(birim);
    const quantity = parseNumber(adet);
    const total = parseNumber(toplam);

    if (![unitPrice, quantity, total].every(Number.isFinite)) {
      errors.push(`Satir ${i + 1}: sayisal alan okunamadi.`);
      continue;
    }

    rows.push({
      date,
      assetType,
      symbol: sembol.trim().toUpperCase(),
      side,
      unitPrice,
      quantity,
      total: total || unitPrice * quantity,
      currency: resolveCurrency(assetType),
    });
  }

  return { rows, errors };
}
