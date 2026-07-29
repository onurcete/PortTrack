const fs = require('fs');
const path = require('path');

async function updateTefasCache() {
  const kinds = ['YAT', 'EMK', 'BYF'];
  const fundsMap = new Map();
  
  // Son iş gününün tarihini (YYYYMMDD) oluştur
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  for (const kind of kinds) {
    try {
      const res = await fetch('https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Origin': 'https://www.tefas.gov.tr',
          'Referer': 'https://www.tefas.gov.tr/tr/fon-verileri',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          fonTipi: kind,
          fonKodu: null,
          basTarih: dateStr,
          bitTarih: dateStr,
          basSira: 1,
          bitSira: 100000,
          dil: 'TR',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const resultList = json.resultList || [];
        for (const row of resultList) {
          if (row.fonKodu) {
            fundsMap.set(row.fonKodu.trim().toUpperCase(), row.fonUnvan ? row.fonUnvan.trim() : row.fonKodu);
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching ${kind}:`, err);
    }
  }

  const fundsArray = Array.from(fundsMap.entries()).map(([symbol, name]) => ({
    symbol,
    name,
  }));

  const cacheFile = path.join(__dirname, '../src/lib/tefas_cache.json');
  fs.writeFileSync(cacheFile, JSON.stringify(fundsArray, null, 2), 'utf-8');
  console.log(`✅ tefas_cache.json güncellendi: Toplam ${fundsArray.length} fon kaydedildi. ALE mevcut mu?: ${fundsMap.has('ALE')}`);
}

updateTefasCache();
