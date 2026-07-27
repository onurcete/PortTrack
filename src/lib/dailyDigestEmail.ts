/**
 * PortTrack Mobil Uyumlu Günlük Portföy Özet E-Postası HTML Şablon Oluşturucu
 */

export interface DailyDigestData {
  userName: string;
  userEmail: string;
  dateStr: string;
  totalTRY: number;
  totalUSD: number;

  // Bugün Değişimi (Tam ve Doğru)
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
  const dailyBadgeBg = isDailyPositive ? "#10b9811f" : "#ef44441f";
  const dailyBadgeBorder = isDailyPositive ? "#10b98140" : "#ef444440";
  const dailyBadgeText = isDailyPositive ? "#10b981" : "#f87171";
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
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 12px; font-weight: 800; color: #ffffff; font-size: 13px;">${item.symbol}</td>
        <td style="padding: 10px 12px; color: #94a3b8; font-size: 11px; font-weight: 600;">${item.assetType}</td>
        <td style="padding: 10px 12px; text-align: right; color: #10b981; font-weight: 800; font-size: 13px;">+${item.changePercent.toFixed(2).replace(".", ",")}%</td>
        <td style="padding: 10px 12px; text-align: right; color: #cbd5e1; font-weight: 700; font-size: 12px;">${fmtTRY(item.valueTRY)} ₺</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PortTrack Günlük Özet</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Wrapper -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; width: 100%; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; text-align: left; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%); padding: 28px 24px 20px; border-bottom: 1px solid #1e293b;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 15px; padding: 6px 14px; border-radius: 10px;">PT</div>
                    <span style="font-size: 18px; font-weight: 900; color: #ffffff; margin-left: 8px; vertical-align: middle;">PortTrack</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #c7d2fe; background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px;">📅 ${data.dateStr}</span>
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 18px 0 4px 0;">
                Günaydın, ${data.userName} ☀️
              </h1>
              <p style="font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500;">
                Günün ilk saatlerinde portföyünüzün güncel durumu ve performans özetiniz:
              </p>
            </td>
          </tr>

          <!-- Total Portfolio Value Card -->
          <tr>
            <td style="padding: 24px 24px 16px;">
              <div style="background-color: #1e293b; border-radius: 16px; padding: 20px; border: 1px solid #334155;">
                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                  Toplam Portföy Değeri
                </div>
                
                <div style="font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 10px;">
                  ${fmtTRY(data.totalTRY)} ₺
                  <span style="font-size: 13px; font-weight: 600; color: #94a3b8; margin-left: 4px;">($${fmtUSD(data.totalUSD)} USD)</span>
                </div>

                <!-- Bugün Değişimi Rozeti -->
                <div style="display: inline-block; background-color: ${dailyBadgeBg}; border: 1px solid ${dailyBadgeBorder}; color: ${dailyBadgeText}; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 10px;">
                  BUGÜN: ${dailySign}${fmtTRY(data.dailyAmtTRY)} ₺ (${dailySign}${data.dailyPctTRY.toFixed(2).replace(".", ",")}%)
                </div>
              </div>
            </td>
          </tr>

          <!-- Dönemsel Getiri Dönem Kartları (Son 5 Gün, MTD, YTD) -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Son 5 Gün -->
                  <td width="32%" style="background-color: #1e293b; border-radius: 12px; padding: 12px 10px; border: 1px solid #334155; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Son 5 Gün</div>
                    <div style="font-size: 13px; font-weight: 900; color: ${(data.weeklyPctTRY ?? 0) >= 0 ? "#10b981" : "#f87171"};">
                      ${fmtPct(data.weeklyPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Ay (MTD) -->
                  <td width="32%" style="background-color: #1e293b; border-radius: 12px; padding: 12px 10px; border: 1px solid #334155; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Bu Ay (MTD)</div>
                    <div style="font-size: 13px; font-weight: 900; color: ${(data.mtdPctTRY ?? 0) >= 0 ? "#10b981" : "#f87171"};">
                      ${fmtPct(data.mtdPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Yıl (YTD) -->
                  <td width="32%" style="background-color: #1e293b; border-radius: 12px; padding: 12px 10px; border: 1px solid #334155; text-align: center;">
                    <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Bu Yıl (YTD)</div>
                    <div style="font-size: 13px; font-weight: 900; color: ${(data.ytdPctTRY ?? 0) >= 0 ? "#10b981" : "#f87171"};">
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
            <td style="padding: 0 24px 20px;">
              <div style="font-size: 12px; font-weight: 900; color: #ffffff; margin-bottom: 10px;">
                🔥 Portföyde Öne Çıkan Varlıklar
              </div>
              <div style="background-color: #090d16; border-radius: 14px; border: 1px solid #1e293b; overflow: hidden;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: left;">
                  <thead>
                    <tr style="background-color: #1e293b; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                      <th style="padding: 8px 12px;">Varlık</th>
                      <th style="padding: 8px 12px;">Tür</th>
                      <th style="padding: 8px 12px; text-align: right;">Getiri</th>
                      <th style="padding: 8px 12px; text-align: right;">Değer</th>
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
            <td style="padding: 0 24px 24px;">
              <div style="background: linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(99,102,241,0.06) 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 14px; padding: 16px;">
                <div style="font-size: 11px; font-weight: 900; color: #60a5fa; margin-bottom: 6px;">
                  🤖 Yapay Zekâ Analiz Asistanı Notu · Skor: ${data.aiScore}/100
                </div>
                <p style="font-size: 11px; color: #cbd5e1; line-height: 1.6; margin: 0;">
                  ${data.aiBriefingSummary}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer Action -->
          <tr>
            <td style="padding: 0 24px 28px; text-align: center; border-top: 1px solid #1e293b; pt: 20px;">
              <div style="margin-top: 20px;">
                <a href="https://port-track-ten.vercel.app/" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 900; font-size: 12px; padding: 12px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 16px rgba(37,99,235,0.3);">
                  Portföy Paneline Git →
                </a>
              </div>

              <div style="margin-top: 20px; font-size: 10px; color: #64748b; line-height: 1.5;">
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
