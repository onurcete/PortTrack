/**
 * PortTrack Haftalık Portföy Özet E-Posta Şablonu (Responsive HTML)
 */

export interface WeeklyDigestData {
  userName: string;
  userEmail: string;
  weekRangeText: string; // Örn: "20 - 27 Temmuz 2026"
  totalValueTRY: number;
  weeklyChangeTRY: number;
  weeklyChangePct: number;
  mtdChangePct: number;
  ytdChangePct: number;
  topPerformers: Array<{
    symbol: string;
    name: string;
    typeText: string;
    weeklyPct: number;
    valueTRY: number;
  }>;
  aiBriefingSummary: string;
  appUrl: string;
}

export function generateWeeklyDigestEmailHtml(data: WeeklyDigestData): string {
  const isPositive = data.weeklyChangePct >= 0;
  const changeColor = isPositive ? "#10b981" : "#f43f5e";
  const changeSign = isPositive ? "+" : "";
  const bgBadgeColor = isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)";
  const badgeBorderColor = isPositive ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)";

  const formattedTotal = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(data.totalValueTRY);

  const formattedChangeTRY = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(Math.abs(data.weeklyChangeTRY));

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PortTrack Haftalık Portföy Özeti</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #090d16;
      padding: 40px 10px;
    }
    .main-card {
      max-width: 600px;
      margin: 0 auto;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border-bottom: 1px solid #1e293b;
    }
    .brand-logo {
      display: inline-block;
      background: #3b82f6;
      color: #ffffff;
      font-weight: 900;
      font-size: 16px;
      padding: 6px 12px;
      border-radius: 10px;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px;
    }
    .hero-stat-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 800;
      background-color: ${bgBadgeColor};
      color: ${changeColor};
      border: 1px solid ${badgeBorderColor};
    }
    .performers-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .performers-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      padding-bottom: 10px;
      border-bottom: 1px solid #1e293b;
    }
    .performers-table td {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 13px;
    }
    .symbol-tag {
      font-weight: 900;
      color: #ffffff;
      background: #1e293b;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
    }
    .ai-box {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%);
      border: 1px solid rgba(168, 85, 247, 0.3);
      border-radius: 16px;
      padding: 20px;
      margin-top: 28px;
    }
    .cta-btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 16px;
      border-radius: 14px;
      margin-top: 32px;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
    }
    .footer {
      padding: 24px 32px;
      background: #090d16;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      
      <!-- Header -->
      <div class="header">
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tr>
            <td>
              <span class="brand-logo">PT</span>
              <span style="font-weight: 900; font-size: 18px; color: #ffffff; margin-left: 8px; vertical-align: middle;">PortTrack</span>
            </td>
            <td align="right" style="font-size: 12px; color: #94a3b8; font-weight: 600;">
              ${data.weekRangeText}
            </td>
          </tr>
        </table>
        <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 20px; margin-bottom: 4px;">
          Pazartesi Portföy Özetiniz 🚀
        </h1>
        <p style="font-size: 13px; color: #cbd5e1; margin: 0;">
          Merhaba Sayın ${data.userName}, geçen haftanın finansal özet raporu hazır.
        </p>
      </div>

      <!-- Main Content -->
      <div class="content">
        
        <!-- Hero Stat Box -->
        <div class="hero-stat-card">
          <div class="stat-label">Toplam Portföy Değeri</div>
          <div class="stat-value">${formattedTotal} ₺</div>
          <div>
            <span class="badge">
              Geçen Hafta: ${changeSign}${formattedChangeTRY} ₺ (${changeSign}${data.weeklyChangePct.toFixed(2)}%)
            </span>
          </div>
          <div style="margin-top: 14px; font-size: 12px; color: #94a3b8; display: flex; gap: 16px;">
            <span><strong>Bu Ay (MTD):</strong> +${data.mtdChangePct.toFixed(2)}%</span>
            <span style="margin-left: 16px;"><strong>Bu Yıl (YTD):</strong> +${data.ytdChangePct.toFixed(2)}%</span>
          </div>
        </div>

        <!-- Top Performers Table -->
        <div style="margin-top: 24px;">
          <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #f8fafc; margin-bottom: 12px;">
            🔥 Haftanın En Çok Kazandıran Varlıkları
          </h3>
          <table class="performers-table">
            <thead>
              <tr>
                <th>Sembol / Varlık</th>
                <th>Tür</th>
                <th align="right">Haftalık Getiri</th>
                <th align="right">Toplam Değer</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPerformers
                .map(
                  (p) => `
                <tr>
                  <td>
                    <span class="symbol-tag">${p.symbol}</span>
                    <span style="color: #cbd5e1; margin-left: 6px; font-weight: 600;">${p.name}</span>
                  </td>
                  <td style="color: #94a3b8; font-size: 12px;">${p.typeText}</td>
                  <td align="right" style="font-weight: 800; color: #10b981;">
                    +${p.weeklyPct.toFixed(2)}%
                  </td>
                  <td align="right" style="font-weight: 700; color: #ffffff;">
                    ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(p.valueTRY)} ₺
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- AI Assistant Insight Box -->
        <div class="ai-box">
          <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #c084fc; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; items-center; gap: 6px;">
            🤖 Yapay Zekâ Analiz Asistanı Notu
          </div>
          <p style="font-size: 13px; color: #e2e8f0; leading-height: 1.6; margin: 0; font-weight: 500;">
            ${data.aiBriefingSummary}
          </p>
        </div>

        <!-- Call to Action Button -->
        <a href="${data.appUrl}" class="cta-btn" target="_blank">
          Portföyünüzü Detaylı İnceleyin →
        </a>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin-bottom: 8px;">
          Bu e-posta <strong>PortTrack Otomatik Portföy Bilgilendirme Sistemi</strong> tarafından haftalık olarak oluşturulmuştur.
        </p>
        <p style="margin: 0; color: #475569;">
          <strong>Yasal Uyarı (YTD):</strong> Bu rapordaki veriler ve grafikler yalnızca kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri içermez.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

export const SAMPLE_WEEKLY_DIGEST_DATA: WeeklyDigestData = {
  userName: "Onur Çete",
  userEmail: "onur@porttrack.com",
  weekRangeText: "20 - 27 Temmuz 2026",
  totalValueTRY: 3192206,
  weeklyChangeTRY: 100530,
  weeklyChangePct: 3.4,
  mtdChangePct: 3.25,
  ytdChangePct: 53.75,
  topPerformers: [
    {
      symbol: "INTC",
      name: "Intel Corp",
      typeText: "Yabancı Hisse",
      weeklyPct: 10.8,
      valueTRY: 143200,
    },
    {
      symbol: "PHE",
      name: "Hedef Portföy Fonu",
      typeText: "TEFAS Fonu",
      weeklyPct: 7.64,
      valueTRY: 498250,
    },
    {
      symbol: "DFI",
      name: "Deniz Portföy Fonu",
      typeText: "TEFAS Fonu",
      weeklyPct: 5.2,
      valueTRY: 317793,
    },
  ],
  aiBriefingSummary:
    "Geçen hafta portföyünüzdeki TEFAS fonlarında pozitif girdi sermayesi korunmuştur. RSI göstergelerinde aşırı satım bölgesinde bulunan hisseleriniz tepki alımı sinyali vermektedir. Kural tabanlı teknik portföy sağlık skorunuz 84/100 seviyesindedir.",
  appUrl: "https://porttrack.com",
};
