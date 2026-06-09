# PortTrack - İlerleme Takibi

BIST, TEFAS, yabancı borsalar, döviz, kıymetli maden ve kripto yatırımlarını tek yerden takip eden, kar/zarar ve aylık gelişim gösteren, her yerden erişilebilen (ücretsiz hosting) tek kullanıcılı web platformu.

## Temel Kararlar
- Fiyatlar otomatik çekilir (Yahoo Finance + TEFAS).
- Ücretsiz hosting (Vercel + Neon Postgres).
- Tek kullanıcı, basit şifre koruması.
- Çift para birimi: her şey hem TL hem USD görünür (global TL/USD geçiş butonu).
- Görsellik önceliği: modern, açık (light) tema; şık grafikler ve tablolar.

## Teknoloji
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + özel bileşenler (açık tema)
- Recharts (grafikler)
- Prisma + Neon Postgres (yerelde SQLite)
- Yahoo Finance chart API + yeni TEFAS JSON API (fiyat verisi)
- Vercel (hosting) + Vercel Cron (günlük güncelleme)

## Görevler

- [x] **scaffold** — Next.js 16 + TypeScript + Tailwind v4 iskeleti, açık tema, sol menü + üst bar + mobil navigasyon
- [x] **db** — Prisma 6 (yerelde SQLite); Transaction, Instrument, PriceSnapshot, FxRate, PortfolioSnapshot şemaları ve db push
- [x] **csv-import** — transactions.csv parser (standart ondalık format, Tür'e göre para birimi) ve içe aktarma (190 işlem)
- [x] **tx-crud** — İşlemler sayfası: alış/satış ekle, düzenle, sil, listeleme, filtre/arama
- [x] **price-svc** — Fiyat servisi: Yahoo chart API + yeni TEFAS JSON API (fonGnlBlgSiraliGetir) + manuel fallback
- [x] **fx-engine** — Çift para birimi motoru: USDTRY güncel/geçmiş + çapraz kur (SEK/EUR) + global TL/USD geçiş butonu
- [x] **history** — Geçmiş fiyat backfill: Yahoo (tek istek) + TEFAS aylık (hız-sınırlı, resumable, sentinel işaretli)
- [x] **dashboard** — Pozisyonlar, güncel değer, kar/zarar %, varlık sınıfı dağılım grafiği (donut)
- [x] **growth** — Portföy Gelişimi: aylık toplam değer/maliyet grafiği (TL & USD), "Geçmişi Oluştur" ilerleme göstergeli
- [x] **performance** — Ürün Performansı: tutulan ürünlerin ay-ay geçmiş getiri ısı tablosu (TL & USD)
- [x] **auth** — Basit şifre korumalı giriş (middleware + çerez), giriş sayfası ve çıkış
- [x] **cron** — Vercel Cron (`/api/cron`, günlük) ile fiyat + kur + geçmiş güncellemesi
- [x] **deploy** — vercel.json (cron), Neon/Postgres geçiş notu ve README dağıtım rehberi

## Notlar / Günlük
- TEFAS 2026'da yeni Next.js sitesine geçti; eski `BindHistoryInfo` kapandı. Yeni resmi
  `fonGnlBlgSiraliGetir` JSON endpoint'ine geçildi (dakikada ~6 istek sınırı için hız sınırlayıcı eklendi).
- Yabancı borsa fiyatları Yahoo'nun bildirdiği gerçek para biriminde (SEK/EUR) alınıp çapraz kurla TL'ye çevriliyor.
- Tasarım masaüstü tarayıcı odaklı yapıldı (mobil alt menü kaldırıldı).
