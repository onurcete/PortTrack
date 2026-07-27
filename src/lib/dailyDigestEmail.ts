/**
 * Günlük Portföy Özet E-Postası HTML Şablon Oluşturucu
 */

export interface DailyDigestData {
  userName: string;
  userEmail: string;
  dateStr: string;
  totalTRY: number;
  totalUSD: number;
  dailyChangeTRY: number;
  dailyChangePercent: number;
  weeklyChangePercent: number;
  topPerformers: Array<{
    symbol: string;
    assetType: string;
    changePercent: number;
    valueTRY: number;
  }>;
  aiScore: number;
  aiBriefingSummary: string;
}

export function generateDailyDigestEmailHtml(data: DailyDigestData): string {
  const isPositive = data.dailyChangeTRY >= 0;
  const changeBadgeBg = isPositive ? "#064e3b" : "#7f1d1d";
  const changeBadgeText = isPositive ? "#34d399" : "#f87171";
  const changeSign = isPositive ? "+" : "";

  const formattedTotalTRY = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(data.totalTRY);
  const formattedTotalUSD = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(data.totalUSD);
  const formattedChangeTRY = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.abs(data.dailyChangeTRY));

  const performersHtml = data.topPerformers
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 16px; font-weight: 800; color: #ffffff; font-size: 13px;">${item.symbol}</td>
        <td style="padding: 12px 16px; color: #94a3b8; font-size: 11px; font-weight: 600;">${item.assetType}</td>
        <td style="padding: 12px 16px; text-align: right; color: #34d399; font-weight: 800; font-size: 13px;">+${item.changePercent.toFixed(2)}%</td>
        <td style="padding: 12px 16px; text-align: right; color: #cbd5e1; font-weight: 700; font-size: 12px;">${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(item.valueTRY)} ₺</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Günlük Portföy Özetiniz | PortTrack</title>
</head>
<body style="margin:0; padding:0; background-color:#090d16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#f1f5f9;">
  <div style="max-width:580px; margin:30px auto; background-color:#0f172a; border:1px solid #1e293b; border-radius:24px; overflow:hidden; box-shadow:0 25px 50px rgba(0,0,0,0.6);">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%); padding: 32px 32px 24px; border-bottom: 1px solid #1e293b;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 16px; padding: 6px 14px; border-radius: 10px;">PT</div>
        <span style="font-size: 11px; font-weight: 700; color: #a5b4fc; background: rgba(255,255,255,0.08); padding: 4px 12px; border-radius: 20px;">📅 ${data.dateStr}</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; letter-spacing: -0.5px;">
        Günaydın, ${data.userName} ☀️
      </h1>
      <p style="font-size: 12px; color: #cbd5e1; margin: 0; font-weight: 500;">
        İşte bugünkü günlük portföy özetiniz ve öne çıkan varlık analizi:
      </p>
    </div>

    <!-- Portfolio Summary Card -->
    <div style="padding: 28px 32px; border-bottom: 1px solid #1e293b;">
      <div style="background-color: #1e293b; border-radius: 20px; padding: 24px; border: 1px solid #334155;">
        <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
          Toplam Portföy Değeri
        </div>
        
        <div style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -1px; margin-bottom: 8px;">
          ${formattedTotalTRY} ₺
          <span style="font-size: 14px; font-weight: 600; color: #94a3b8; margin-left: 6px;">($${formattedTotalUSD} USD)</span>
        </div>

        <div style="display: inline-block; background-color: ${changeBadgeBg}; color: ${changeBadgeText}; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 12px;">
          Günün Değişimi: ${changeSign}${formattedChangeTRY} ₺ (${changeSign}${data.dailyChangePercent.toFixed(2)}%)
        </div>
      </div>
    </div>

    <!-- Top Performers Section -->
    ${
      data.topPerformers.length > 0
        ? `
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <div style="font-size: 13px; font-weight: 900; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
        <span>🔥 Günün En Çok Kazandıran Varlıkları</span>
      </div>
      <div style="background-color: #090d16; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #1e293b; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase;">
              <th style="padding: 10px 16px;">Varlık</th>
              <th style="padding: 10px 16px;">Tür</th>
              <th style="padding: 10px 16px; text-align: right;">Değişim</th>
              <th style="padding: 10px 16px; text-align: right;">Değer</th>
            </tr>
          </thead>
          <tbody>
            ${performersHtml}
          </tbody>
        </table>
      </div>
    </div>
    `
        : ""
    }

    <!-- AI Insights Box -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(99,102,241,0.05) 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 18px; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 12px; font-weight: 900; color: #60a5fa;">🤖 Yapay Zekâ Analiz Asistanı Notu</span>
          <span style="background-color: #1e1b4b; color: #818cf8; font-weight: 800; font-size: 10px; padding: 3px 10px; border-radius: 10px;">Sağlık Skoru: ${data.aiScore}/100</span>
        </div>
        <p style="font-size: 12px; color: #cbd5e1; line-height: 1.6; margin: 0;">
          ${data.aiBriefingSummary}
        </p>
      </div>
    </div>

    <!-- CTA Button & Footer -->
    <div style="padding: 32px; text-align: center;">
      <a href="https://port-track-ten.vercel.app/" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 13px; padding: 14px 32px; border-radius: 14px; text-decoration: none; box-shadow: 0 10px 20px rgba(37,99,235,0.3);">
        Portföyünüzü Detaylı İnceleyin →
      </a>

      <div style="margin-top: 24px; font-size: 10px; color: #64748b; line-height: 1.5;">
        Yasal Uyarı: Burada yer alan bilgiler yatırım tavsiyesi değildir.<br>
        PortTrack · Otomatik Günlük Özet Gönderimidir.
      </div>
    </div>

  </div>
</body>
</html>`;
}
