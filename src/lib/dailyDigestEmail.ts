/**
 * PortTrack %100 Mobil Dark/Light Uyumlu Günlük Portföy Özet E-Postası HTML Şablon Oluşturucu
 */

export interface DailyDigestData {
  userName: string;
  userEmail: string;
  dateStr: string;
  totalTRY: number;
  totalUSD: number;

  // Bugün Değişimi
  dailyAmtTRY: number;
  dailyPctTRY: number;

  // Dönemsel Getiriler
  weeklyPctTRY: number | null;
  mtdPctTRY: number | null;
  ytdPctTRY: number | null;

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
  const isDailyPositive = data.dailyAmtTRY >= 0;
  const dailyBadgeBg = isDailyPositive ? "#dcfce7" : "#fee2e2";
  const dailyBadgeBorder = isDailyPositive ? "#86efac" : "#fca5a5";
  const dailyBadgeText = isDailyPositive ? "#15803d" : "#b91c1c";
  const dailySign = isDailyPositive ? "+" : "";

  const fmtTRY = (val: number) =>
    new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.abs(val));
  const fmtUSD = (val: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.abs(val));
  const fmtPct = (val: number | null) =>
    val == null ? "%0,00" : `${val >= 0 ? "+" : ""}${val.toFixed(2).replace(".", ",")}%`;

  const performersRows = data.topPerformers
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 14px; font-weight: 800; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 13px;">${item.symbol}</td>
        <td style="padding: 12px 14px; color: #64748b !important; -webkit-text-fill-color: #64748b !important; font-size: 11px; font-weight: 600;">${item.assetType}</td>
        <td style="padding: 12px 14px; text-align: right; color: #16a34a !important; -webkit-text-fill-color: #16a34a !important; font-weight: 800; font-size: 13px;">+${item.changePercent.toFixed(2).replace(".", ",")}%</td>
        <td style="padding: 12px 14px; text-align: right; color: #334155 !important; -webkit-text-fill-color: #334155 !important; font-weight: 700; font-size: 12px;">${fmtTRY(item.valueTRY)} ₺</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>PortTrack Günlük Özet</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Table Canvas -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Content Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; text-align: left; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          
          <!-- Header Banner (Solid Color Fallback + WebKit Forced White Text) -->
          <tr>
            <td bgcolor="#1e1b4b" style="background-color: #1e1b4b !important; padding: 30px 28px 24px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #ffffff !important; color: #1e1b4b !important; -webkit-text-fill-color: #1e1b4b !important; font-weight: 900; font-size: 15px; padding: 6px 14px; border-radius: 10px;">PT</div>
                    <span style="font-size: 19px; font-weight: 900; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; margin-left: 10px; vertical-align: middle;">PortTrack</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; background-color: #312e81 !important; padding: 5px 14px; border-radius: 20px;">📅 ${data.dateStr}</span>
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 22px; font-weight: 900; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; margin: 20px 0 6px 0; letter-spacing: -0.5px;">
                Günaydın, ${data.userName} ☀️
              </h1>
              <p style="font-size: 13px; color: #e0e7ff !important; -webkit-text-fill-color: #e0e7ff !important; margin: 0; font-weight: 500;">
                Günün ilk saatlerinde portföyünüzün güncel durumu ve performans özetiniz:
              </p>
            </td>
          </tr>

          <!-- Total Portfolio Value Section -->
          <tr>
            <td style="padding: 28px 28px 16px;">
              <div style="background-color: #f1f5f9; border-radius: 16px; padding: 22px; border: 1px solid #e2e8f0;">
                <div style="font-size: 11px; font-weight: 800; color: #64748b !important; -webkit-text-fill-color: #64748b !important; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                  Toplam Portföy Değeri
                </div>
                
                <div style="font-size: 30px; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; letter-spacing: -0.8px; margin-bottom: 12px;">
                  ${fmtTRY(data.totalTRY)} ₺
                  <span style="font-size: 14px; font-weight: 700; color: #64748b !important; -webkit-text-fill-color: #64748b !important; margin-left: 4px;">($${fmtUSD(data.totalUSD)} USD)</span>
                </div>

                <!-- Bugün Değişimi Rozeti -->
                <div style="display: inline-block; background-color: ${dailyBadgeBg}; border: 1px solid ${dailyBadgeBorder}; color: ${dailyBadgeText} !important; -webkit-text-fill-color: ${dailyBadgeText} !important; font-weight: 800; font-size: 13px; padding: 7px 16px; border-radius: 10px;">
                  BUGÜN: ${dailySign}${fmtTRY(data.dailyAmtTRY)} ₺ (${dailySign}${data.dailyPctTRY.toFixed(2).replace(".", ",")}%)
                </div>
              </div>
            </td>
          </tr>

          <!-- Dönemsel Getiri Kartları (Son 5 Gün, MTD, YTD) -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Son 5 Gün -->
                  <td width="32%" style="background-color: #ffffff; border-radius: 12px; padding: 14px 10px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b !important; -webkit-text-fill-color: #64748b !important; text-transform: uppercase; margin-bottom: 4px;">Son 5 Gün</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.weeklyPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important; -webkit-text-fill-color: ${(data.weeklyPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important;">
                      ${fmtPct(data.weeklyPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Ay (MTD) -->
                  <td width="32%" style="background-color: #ffffff; border-radius: 12px; padding: 14px 10px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b !important; -webkit-text-fill-color: #64748b !important; text-transform: uppercase; margin-bottom: 4px;">Bu Ay (MTD)</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.mtdPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important; -webkit-text-fill-color: ${(data.mtdPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important;">
                      ${fmtPct(data.mtdPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Yıl (YTD) -->
                  <td width="32%" style="background-color: #ffffff; border-radius: 12px; padding: 14px 10px; border: 1px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #64748b !important; -webkit-text-fill-color: #64748b !important; text-transform: uppercase; margin-bottom: 4px;">Bu Yıl (YTD)</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.ytdPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important; -webkit-text-fill-color: ${(data.ytdPctTRY ?? 0) >= 0 ? "#16a34a" : "#dc2626"} !important;">
                      ${fmtPct(data.ytdPctTRY)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Performers Table -->
          ${
            data.topPerformers.length > 0
              ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <div style="font-size: 13px; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; margin-bottom: 12px;">
                🔥 Portföyde Öne Çıkan Varlıklar
              </div>
              <div style="background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: left;">
                  <thead>
                    <tr style="background-color: #f8fafc; color: #64748b !important; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                      <th style="padding: 10px 14px;">Varlık</th>
                      <th style="padding: 10px 14px;">Tür</th>
                      <th style="padding: 10px 14px; text-align: right;">Getiri</th>
                      <th style="padding: 10px 14px; text-align: right;">Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${performersRows}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- AI Insights Box -->
          <tr>
            <td style="padding: 0 28px 28px;">
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px;">
                <div style="font-size: 12px; font-weight: 900; color: #1d4ed8 !important; -webkit-text-fill-color: #1d4ed8 !important; margin-bottom: 6px;">
                  🤖 Yapay Zekâ Analiz Asistanı Notu · Skor: ${data.aiScore}/100
                </div>
                <p style="font-size: 12px; color: #1e3a8a !important; -webkit-text-fill-color: #1e3a8a !important; line-height: 1.6; margin: 0; font-weight: 500;">
                  ${data.aiBriefingSummary}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Action Button & Disclaimer -->
          <tr>
            <td style="padding: 0 28px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
              <div style="margin-top: 24px;">
                <a href="https://port-track-ten.vercel.app/" target="_blank" style="display: inline-block; background-color: #2563eb !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-weight: 900; font-size: 13px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 16px rgba(37,99,235,0.25);">
                  Portföy Paneline Git →
                </a>
              </div>

              <div style="margin-top: 24px; font-size: 11px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; line-height: 1.5; font-weight: 500;">
                Yasal Uyarı: Burada yer alan bilgiler yatırım tavsiyesi değildir.<br>
                © 2026 PortTrack Otomatik Günlük Özet Servisi.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
