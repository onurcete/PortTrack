import assert from "node:assert/strict";
import { parseTransactionsCsvDetailed } from "../src/lib/csv";

const sample = `Tarih,Tür,Sembol,İşlem,Birim Fiyat,Adet,Toplam,Para Birimi
07.07.2026,"TEFAS Fon","PHE","Alış","3.751815","26653","99997.125195","TRY"
06.07.2026,"Yabanci Borsa","DRAM","Satış","80.64","2.4801","199.995264","USD"
05.07.2026,"Kıymetli Maden","XAU","Alış","100","1","100","TRY"
04.07.2026,"Kripto","BTC","Alış","100000","1","100000","TRY"
03.07.2026,"Bilinmeyen Tür","ABC","Alış","1","1","1","TRY"`;

const parsed = parseTransactionsCsvDetailed(sample);

assert.deepEqual(
  parsed.rows.map((row) => [row.symbol, row.assetType, row.currency]),
  [
    ["PHE", "TEFAS", "TRY"],
    ["DRAM", "FOREIGN", "USD"],
    ["XAU", "METAL", "TRY"],
    ["BTC", "CRYPTO", "TRY"],
    ["ABC", "FOREIGN", "TRY"],
  ],
);
assert.equal(parsed.preview.requiresReview, 1);
assert.equal(parsed.preview.unresolved[0]?.lineNo, 6);

const resolved = parseTransactionsCsvDetailed(sample, { 6: "BIST" });
assert.equal(resolved.preview.requiresReview, 0);
assert.equal(resolved.rows[4]?.assetType, "BIST");

console.log("CSV import parser assertions passed.");
