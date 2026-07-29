/**
 * PortTrack %100 Dark Mode Uyumlu Günlük Portföy Özet E-Postası HTML Şablon Oluşturucu
 */

export interface PerformerItem {
  symbol: string;
  assetType: string;
  changePercent: number;
  valueTRY: number;
}

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

  // En Çok Kazanan 3 ve En Çok Kaybeden 3 Varlık
  topGainers: PerformerItem[];
  topLosers: PerformerItem[];
}

export function generateDailyDigestEmailHtml(data: DailyDigestData): string {
  const isDailyPositive = data.dailyAmtTRY >= 0;
  const dailyBadgeBg = isDailyPositive ? "#064e3b" : "#4c0519";
  const dailyBadgeBorder = isDailyPositive ? "#059669" : "#be123c";
  const dailyBadgeText = isDailyPositive ? "#34d399" : "#fb7185";
  const dailySign = isDailyPositive ? "+" : "";

  const fmtTRY = (val: number) =>
    new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.abs(val));
  const fmtUSD = (val: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.abs(val));
  const fmtPct = (val: number | null) =>
    val == null ? "%0,00" : `${val >= 0 ? "+" : ""}${val.toFixed(2).replace(".", ",")}%`;

  const uniqueRef = Date.now().toString(36);

  // Gainers Rows
  const gainersRows = data.topGainers
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 14px; font-weight: 800; color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; font-size: 13px;">${item.symbol}</td>
        <td style="padding: 12px 14px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 11px; font-weight: 600;">
          <span style="background-color: #1e293b; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; padding: 3px 8px; border-radius: 6px;">${item.assetType}</span>
        </td>
        <td style="padding: 12px 14px; text-align: right; color: #34d399 !important; -webkit-text-fill-color: #34d399 !important; font-weight: 800; font-size: 13px;">+${item.changePercent.toFixed(2).replace(".", ",")}%</td>
        <td style="padding: 12px 14px; text-align: right; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-weight: 700; font-size: 12px;">${fmtTRY(item.valueTRY)} ₺</td>
      </tr>
    `
    )
    .join("");

  // Losers Rows
  const losersRows = data.topLosers
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 14px; font-weight: 800; color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; font-size: 13px;">${item.symbol}</td>
        <td style="padding: 12px 14px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 11px; font-weight: 600;">
          <span style="background-color: #1e293b; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; padding: 3px 8px; border-radius: 6px;">${item.assetType}</span>
        </td>
        <td style="padding: 12px 14px; text-align: right; color: #fb7185 !important; -webkit-text-fill-color: #fb7185 !important; font-weight: 800; font-size: 13px;">${item.changePercent.toFixed(2).replace(".", ",")}%</td>
        <td style="padding: 12px 14px; text-align: right; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-weight: 700; font-size: 12px;">${fmtTRY(item.valueTRY)} ₺</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="only dark">
  <meta name="supported-color-schemes" content="only dark">
  <title>PortTrack Günlük Özet</title>
  <style type="text/css">
    :root { color-scheme: only dark; }
    body { background-color: #0b0f19 !important; color: #f8fafc !important; margin: 0; padding: 0; }
    a { color: #38bdf8 !important; text-decoration: none; }
    .dark-card { background-color: #0f172a !important; border-color: #1e293b !important; }
    .dark-text { color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; }
    .muted-text { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
  </style>
</head>
<body bgcolor="#0b0f19" style="margin: 0; padding: 0; background-color: #0b0f19 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc !important; -webkit-font-smoothing: antialiased;">

  <!-- Invisible Preheader & Anti-Collapsing Unique Token -->
  <div style="display: none; font-size: 1px; color: #0b0f19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Günün ilk saatlerinde portföyünüz bugün ${dailySign}${fmtTRY(data.dailyAmtTRY)} ₺ (${dailySign}${data.dailyPctTRY.toFixed(2).replace(".", ",")}%) değişti. Ref: ${uniqueRef}
    &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847, &#847,
  </div>

  <!-- Outer Table Canvas -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="background-color: #0b0f19 !important; width: 100%; padding: 28px 12px;">
    <tr>
      <td align="center">
        <!-- Main Content Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0f172a" style="max-width: 580px; background-color: #0f172a !important; border: 1px solid #1e293b !important; border-radius: 24px; overflow: hidden; text-align: left; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td bgcolor="#1e1b4b" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%) !important; background-color: #1e1b4b !important; padding: 32px 30px 26px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #2563eb !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-weight: 900; font-size: 15px; padding: 6px 14px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">PT</div>
                    <span style="font-size: 20px; font-weight: 900; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; margin-left: 10px; vertical-align: middle; letter-spacing: -0.5px;">PortTrack</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8 !important; -webkit-text-fill-color: #38bdf8 !important; background-color: #0f172a !important; border: 1px solid #312e81 !important; padding: 6px 14px; border-radius: 20px;">📅 ${data.dateStr}</span>
                  </td>
                </tr>
              </table>
              <h1 style="font-size: 22px; font-weight: 900; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; margin: 22px 0 6px 0; letter-spacing: -0.5px;">
                Günaydın, ${data.userName} ☀️
              </h1>
              <p style="font-size: 13px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; margin: 0; font-weight: 500;">
                Günün ilk saatlerinde portföyünüzün güncel performans ve varlık özetiniz:
              </p>
            </td>
          </tr>

          <!-- Total Portfolio Value Section -->
          <tr>
            <td style="padding: 28px 28px 16px;">
              <div style="background-color: #1e293b !important; border-radius: 18px; padding: 24px; border: 1px solid #334155 !important;">
                <div style="font-size: 11px; font-weight: 800; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                  Toplam Portföy Değeri
                </div>
                
                <div style="font-size: 32px; font-weight: 900; color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; letter-spacing: -1px; margin-bottom: 14px;">
                  ${fmtTRY(data.totalTRY)} ₺
                  <span style="font-size: 14px; font-weight: 700; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; margin-left: 4px;">($${fmtUSD(data.totalUSD)} USD)</span>
                </div>

                <!-- Bugün Değişimi Rozeti -->
                <div style="display: inline-block; background-color: ${dailyBadgeBg} !important; border: 1px solid ${dailyBadgeBorder} !important; color: ${dailyBadgeText} !important; -webkit-text-fill-color: ${dailyBadgeText} !important; font-weight: 800; font-size: 13px; padding: 8px 18px; border-radius: 12px;">
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
                  <td width="32%" bgcolor="#1e293b" style="background-color: #1e293b !important; border-radius: 14px; padding: 14px 10px; border: 1px solid #334155 !important; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; text-transform: uppercase; margin-bottom: 6px;">Son 5 Gün</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.weeklyPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important; -webkit-text-fill-color: ${(data.weeklyPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important;">
                      ${fmtPct(data.weeklyPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Ay (MTD) -->
                  <td width="32%" bgcolor="#1e293b" style="background-color: #1e293b !important; border-radius: 14px; padding: 14px 10px; border: 1px solid #334155 !important; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; text-transform: uppercase; margin-bottom: 6px;">Bu Ay (MTD)</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.mtdPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important; -webkit-text-fill-color: ${(data.mtdPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important;">
                      ${fmtPct(data.mtdPctTRY)}
                    </div>
                  </td>
                  <td width="2%"></td>
                  <!-- Bu Yıl (YTD) -->
                  <td width="32%" bgcolor="#1e293b" style="background-color: #1e293b !important; border-radius: 14px; padding: 14px 10px; border: 1px solid #334155 !important; text-align: center;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; text-transform: uppercase; margin-bottom: 6px;">Bu Yıl (YTD)</div>
                    <div style="font-size: 14px; font-weight: 900; color: ${(data.ytdPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important; -webkit-text-fill-color: ${(data.ytdPctTRY ?? 0) >= 0 ? "#34d399" : "#fb7185"} !important;">
                      ${fmtPct(data.ytdPctTRY)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Gainers Table (En Çok Kazandıran İlk 3) -->
          ${
            data.topGainers.length > 0
              ? `
          <tr>
            <td style="padding: 0 28px 20px;">
              <div style="font-size: 13px; font-weight: 900; color: #34d399 !important; -webkit-text-fill-color: #34d399 !important; margin-bottom: 12px; letter-spacing: -0.2px;">
                🟢 Günün En Çok Kazandıran 3 Varlığı
              </div>
              <div style="background-color: #1e293b !important; border-radius: 16px; border: 1px solid #334155 !important; overflow: hidden;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: left;">
                  <thead>
                    <tr style="background-color: #0f172a !important; color: #94a3b8 !important; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                      <th style="padding: 12px 14px;">Varlık</th>
                      <th style="padding: 12px 14px;">Tür</th>
                      <th style="padding: 12px 14px; text-align: right;">Getiri</th>
                      <th style="padding: 12px 14px; text-align: right;">Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${gainersRows}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Top Losers Table (En Çok Kaybettiren İlk 3) -->
          ${
            data.topLosers.length > 0
              ? `
          <tr>
            <td style="padding: 0 28px 24px;">
              <div style="font-size: 13px; font-weight: 900; color: #fb7185 !important; -webkit-text-fill-color: #fb7185 !important; margin-bottom: 12px; letter-spacing: -0.2px;">
                🔴 Günün En Çok Kaybettiren 3 Varlığı
              </div>
              <div style="background-color: #1e293b !important; border-radius: 16px; border: 1px solid #334155 !important; overflow: hidden;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: left;">
                  <thead>
                    <tr style="background-color: #0f172a !important; color: #94a3b8 !important; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                      <th style="padding: 12px 14px;">Varlık</th>
                      <th style="padding: 12px 14px;">Tür</th>
                      <th style="padding: 12px 14px; text-align: right;">Getiri</th>
                      <th style="padding: 12px 14px; text-align: right;">Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${losersRows}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Footer Action Button & Disclaimer -->
          <tr>
            <td style="padding: 0 28px 32px; text-align: center; border-top: 1px solid #1e293b !important;">
              <div style="margin-top: 26px;">
                <a href="https://port-track-ten.vercel.app/" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important; background-color: #2563eb !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-weight: 900; font-size: 14px; padding: 15px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 8px 20px rgba(37,99,235,0.4);">
                  Portföy Paneline Git →
                </a>
              </div>

              <div style="margin-top: 26px; font-size: 11px; color: #64748b !important; -webkit-text-fill-color: #64748b !important; line-height: 1.5; font-weight: 500;">
                Yasal Uyarı: Burada yer alan bilgiler yatırım tavsiyesi değildir.<br>
                © 2026 PortTrack Otomatik Günlük Özet Servisi. Ref: ${uniqueRef}
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
