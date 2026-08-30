---
name: data-visualization-accessibility
description: Accessibility, readability, and interaction rules for financial charts, data series, bar charts, and tabular breakdowns.
---

# Data Visualization & Chart Accessibility Guidelines

Finansal dashboard'larda grafikler sadece görsel bir süs değil; kullanıcının portföy riskini, getiri trendini ve nakit akışını analiz ettiği en kritik karar aracıdır.

---

## 1. Sıfır Eksen Çizgisi (Zero-Axis Baseline)

- **Aylık Getiri Bar Grafikleri:**
  - Ortada belirgin bir `%0` referans eksen çizgisi (`ReferenceLine y={0}`) bulunmalıdır.
  - Pozitif getiriler (`+%`) eksenin **yukarısına doğru yeşil** çubuklarla uzanmalıdır.
  - Negatif getiriler (`-%`) eksenin **aşağısına doğru kırmızı** çubuklarla uzanmalıdır.
  - Çubukların üzerinde veya altında net yüzde değeri (`+12.4%`, `-3.2%`) yazmalıdır.

---

## 2. Aykırı Değerler (Outlier Capping) & Ölçekleme

- Portföye tek seferde büyük nakit girişi olduğunda veya aşırı sıçramalarda diğer normal ayların okunamaz hale gelmesini önlemek için eksen tavanı (`computeReturnAxisCap`) uygulanmalıdır.
- Kırpılan aylar için grafiğin altında *"Aykırı getiri ayları ölçekte sınırlandı; gerçek değer için çubuğa dokunun/üzerine gelin"* açıklaması yer almalıdır.

---

## 3. Tooltip (Bilgi Balonu) ve İnteraksiyon

- **Cam / Kontrast Efekti:** Tooltip arka planı yüksek kontrastlı (`bg-[var(--color-surface)]`, `border-[var(--color-border)]`, `shadow-xl`) olmalıdır.
- **İçerik Netliği:**
  - Tarih Başlığı (Örn: *Ağustos 2026*)
  - Dönem Değeri ve Maliyeti (TRY ve USD karşılıkları)
  - Net Kâr / Zarar Tutarı ve Yüzdesi
  - O ayki varlık kırılımı (Hisse, Fon, BES, Kripto payları)

---

## 4. Grafik Yanı Tablo Alternatifi (WCAG 2.2 AA)

- Görme güçlüğü çeken veya doğrudan ham rakamları okumak isteyen kullanıcılar için grafikte sunulan tüm veriler, altındaki **Kümülatif Yıllık Özet** ve **Aylık Dağılım Tablosu** ile birebir metin/rakam olarak da erişilebilir olmalıdır.
- Tablolarda `Tutar`, `Değişim (%)` ve `Portföy Payı (%)` görünümleri arasında tek tıkla geçiş sağlanmalıdır.

---

## 5. Renk Körlüğü & Seri Ayrımı

- Çizgi grafiklerinde birden fazla seri (Örn: Portföy Değeri vs BIST100 vs Enflasyon) gösterildiğinde yalnızca renge güvenmeyin; çizgi kalınlıkları, kesik çizgiler (`strokeDasharray`) veya nokta ikonları ile serileri ayırt edin.
