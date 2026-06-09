# PortTrack — Yatırım Takip Platformu

BIST, TEFAS fonları, yabancı borsalar (S&P 500 / NASDAQ / Avrupa), döviz, kıymetli
maden ve kripto yatırımlarını **tek yerden**, **TL ve USD** bazında takip eden,
masaüstü tarayıcı için tasarlanmış kişisel bir platform.

## Özellikler

- **Genel Bakış**: toplam değer, açık/gerçekleşen kâr-zarar, varlık dağılımı (donut), açık pozisyonlar.
- **İşlemler**: alış/satış ekle-düzenle-sil, filtre/arama, CSV içe aktarma.
- **Portföy Gelişimi**: ay-ay toplam değer ve maliyet grafiği (TL & USD).
- **Ürün Performansı**: hâlâ tutulan ürünlerin ay-ay getiri ısı tablosu.
- **Çift para birimi**: tüm değerler tek tıkla ₺ TL ⇄ $ USD (geçmiş USD/TRY kuruyla).
- **Otomatik fiyat**: Yahoo Finance (chart API) + yeni TEFAS resmi JSON API + çapraz kur (SEK/EUR…).
- **Tek kullanıcı** şifre korumalı giriş.

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Recharts · Prisma · Neon (Postgres) / SQLite

## Yerel Kurulum

```bash
npm install
cp .env.example .env          # değerleri düzenleyin
npx prisma db push            # şemayı oluştur
npm run dev                   # http://localhost:3000
```

`.env` değişkenleri:

| Değişken       | Açıklama                                              |
| -------------- | ----------------------------------------------------- |
| `DATABASE_URL` | Yerelde `file:./dev.db` (SQLite)                      |
| `APP_PASSWORD` | Giriş şifresi                                         |
| `AUTH_SECRET`  | Oturum çerezi imzalama anahtarı (uzun rastgele dize)  |
| `CRON_SECRET`  | Günlük otomatik güncelleme için gizli anahtar         |

### İlk veri

1. Giriş yapın, **İşlemler → CSV İçe Aktar** ile `transactions.csv` dosyanızı yükleyin.
2. Sağ üstten **Fiyatları Güncelle** ile güncel fiyatları çekin.
3. **Portföy Gelişimi → Geçmişi Oluştur** ile geçmiş aylık fiyatları doldurun
   (TEFAS hız sınırı nedeniyle birkaç dakika sürebilir; ilerleme gösterilir).

## Dağıtım (Vercel + Neon — ücretsiz)

1. **Neon** (https://neon.tech) üzerinde ücretsiz bir Postgres veritabanı oluşturun,
   bağlantı dizesini kopyalayın.
2. `prisma/schema.prisma` içinde `datasource` sağlayıcısını Postgres'e çevirin:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Projeyi GitHub'a gönderip **Vercel**'e bağlayın. Ortam değişkenlerini ekleyin:
   `DATABASE_URL` (Neon), `APP_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET`.
4. Şemayı uygulayın: `npx prisma db push` (yerelden Neon URL'iyle) veya build adımında.
5. Vercel otomatik olarak `vercel.json`'daki **Cron**'u (her gün 18:00 UTC `/api/cron`)
   çalıştırır; `CRON_SECRET` ile yetkilendirir. İlk dağıtımdan sonra giriş yapıp
   geçmişi bir kez oluşturun.

> Not: TEFAS API'si dakikada ~6 istekle sınırlıdır; bu yüzden geçmiş oluşturma
> arka planda parça parça (resumable) çalışır.

## Mimari Notları

- `src/lib/prices.ts` — Yahoo & TEFAS fiyat çekimi, TEFAS hız sınırlayıcı, çapraz kur.
- `src/lib/portfolio.ts` — pozisyon/maliyet/K-Z hesapları (TL & USD).
- `src/lib/history.ts` — geçmiş fiyat backfill, aylık gelişim ve ürün performansı.
- `src/lib/refresh.ts` — güncel fiyat ve USD/TRY kur güncellemesi.
- `src/middleware.ts` — şifre korumalı erişim.
