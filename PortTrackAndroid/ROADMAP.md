# 📱 PortTrack Android — Kapsamlı Mimari, Geliştirme & Yayınlama Yol Haritası

Bu doküman, **PortTrack Web** ekosistemimize paralel olarak geliştirilecek **PortTrack Android** mobil uygulamasının mimari prensiplerini, backend-veritabanı entegrasyonunu, sayfa eşleşmelerini ve Google Play Store yayınlama sürecini en ince ayrıntısına kadar adım adım takip etmek için hazırlanmıştır.

---

## 🏛️ 1. Mimari & Altyapı Entegrasyonu (Web & Mobil Paralelliği)

Mobil uygulama sıfırdan ayrı bir veritabanı veya sunucu gerektirmez; mevcut altyapımızın üzerinde yükselir:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        KULLANICI KATMANI                              │
│                                                                        │
│   [ 💻 PortTrack Web (Next.js 16) ]    [ 📱 PortTrack Android (Expo) ] │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │ (Tarayıcı İstekleri)           │ (REST API / Bearer Token)
                    ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SUNUCU KATMANI (VERCEL)                            │
│                                                                        │
│   • Next.js App Router API Uç Noktaları (/api/...)                     │
│   • Auth & Session Doğrulama (pt_session JWT / Bearer Token)           │
│   • Yahoo Finance & TEFAS Fiyat Senkronizasyon Servisleri              │
│   • OpenAI / Gemini AI Analiz Motoru                                   │
│   • Arka Plan İşleri (Vercel Cron / Fiyat Güncellemeleri)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Prisma ORM - Connection Pool)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 VERİTABANI KATMANI (NEON POSTGRESQL)                   │
│                                                                        │
│   • Users & Sessions                                                   │
│   • Transactions (Alış/Satış Kayıtları)                                │
│   • Instruments & PriceSnapshots (Günlük Fiyat Önbelleği)              │
│   • PortfolioMonthSnapshots (Ay Sonu & BES Bakiyeleri)                 │
│   • TechnicalAnalysis & AnalysisBriefing (AI Analiz Kayıtları)         │
│   • Notes & Feedbacks                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 🔑 Temel Prensipler
1. **Tek Veri Kaynağı (Single Source of Truth):** Web'den eklenen bir hisse/fon anında Neon DB'ye yazılır ve Android uygulamada görünür. Mobilden yapılan bir işlem anında web sitesine yansır.
2. **Web ile Paralel ama Mobile Özel UX:** Web'deki geniş tablolar ve sekmeli yapılar; mobilde dikey kaydırılabilir kartlara, alt menüye (Bottom Tabs) ve yarım modal pencerelerine (Bottom Sheets) dönüştürülür.
3. **Güvenli Mobil Oturum (Secure Auth):** Web'deki `pt_session` çerez mantığı mobilde `expo-secure-store` ile cihazın şifreli donanım kasasında saklanır ve API isteklerinde `Authorization: Bearer <token>` olarak iletilir.

---

## 🧭 Web vs. Mobil Sayfa & Özellik Eşleşme Tablosu

| Web Sayfası (`src/app/`) | Mobil Karşılığı (`PortTrackAndroid/app/`) | Web Gösterimi | Mobil Uyarlaması |
| :--- | :--- | :--- | :--- |
| **Giriş / Kayıt** (`/login`, `/register`) | `(auth)/login.tsx`, `(auth)/register.tsx` | Masaüstü formu, Google OAuth butonu | Mobil klavye uyumlu, OTP destekli temiz form |
| **Genel Bakış** (`/`) | `(tabs)/index.tsx` (Dashboard) | Geniş grafikler, yan panel, notlar widget'ı | Kompakt özet kartlar, hızlı kâr/zarar çubuğu, hızlı işlem butonu |
| **Portföy** (`/portfolio`) | `(tabs)/portfolio.tsx` & `asset/[symbol].tsx` | 10 sütunlu masaüstü veri tablosu | Varlık filtreleme çipleri (BIST, TEFAS, BES..), Swipeable kartlar |
| **İşlemler** (`/transactions`) | `(tabs)/transactions.tsx` | Sayfalanmış işlem geçmişi tablosu | Tarihe göre gruplanmış sonsuz kaydırmalı liste |
| **İşlem Ekle/Düzenle** (`modal`) | `modals/add-transaction.tsx` | Ekran ortasında büyük dialog penceresi | Alttan kayarak açılan **Bottom Sheet Modal** + Hızlı Sembol Arama |
| **Büyüme & BES** (`/growth`) | `(tabs)/growth.tsx` | Yıllık karşılaştırmalı matris & Excel aktarımı | Aylık getiri bar grafiği, BES katkı payı takip kartları |
| **Teknik & AI Analiz** (`/analysis`) | `(tabs)/analysis.tsx` | Geniş indikatör grafikleri ve brifing raporu | Günlük AI özet kartı, RSI/MACD durum rozetleri (Bullish/Bearish) |
| **Ayarlar & Profil** (`/settings`) | `(tabs)/settings.tsx` | Çok sekmeli ayarlar menüsü | Liste tipi ayarlar, Para birimi seçici modalı, Güvenli Çıkış |

---

## 📋 Detaylı Fazlar ve İşaretleme Kontrol Listesi

### 🚀 FAZ 1: Temel Kurulum, Proje İskeleti ve Tasarım Sistemi
Mobil projenin altyapısının oluşturulması ve web tasarım diliyle uyumlu modern karanlık tema sisteminin kurulması.

- [ ] **1.1 Expo Proje Başlatma & Konfigürasyon**
  - [ ] `PortTrackAndroid` içinde Expo projesini TypeScript ve `expo-router` ile başlatma
  - [ ] `app.json` temel kimlik ayarları (appName: "PortTrack", slug: "porttrack", orientation: "portrait")
  - [ ] Android paket adı tanımlaması (`com.porttrack.app`)
  - [ ] `.gitignore` ve ortam değişkenleri (`.env.development`, `.env.production`) yapılandırması
- [ ] **1.2 Tasarım Sistemi & Tema Entegrasyonu**
  - [ ] Web projesindeki Tailwind CSS renk paletini mobil ortama aktarma (Koyu Gri/Siyah zemin `#090d16`, Zümrüt Yeşili `#10b981`, Canlı Kırmızı `#ef4444`, Kobalt Mavi `#3b82f6`)
  - [ ] NativeWind (Tailwind for React Native) veya merkezi `theme/colors.ts` & `theme/typography.ts` oluşturma
  - [ ] `lucide-react-native` ikon setinin kurulması ve konfigürasyonu
- [ ] **1.3 Navigasyon Mimarisi (Expo Router - File-based Routing)**
  - [ ] Kök yerleşim (`app/_layout.tsx`) ve Tema/Auth Provider sarıcıları
  - [ ] Alt Gezinme Çubuğu (`app/(tabs)/_layout.tsx`): 5 Ana Sekme (Özet, Portföy, Ekle (+), Büyüme, Analiz)
  - [ ] Dinamik detay rotaları (`app/asset/[symbol].tsx`, `app/transaction/[id].tsx`)
  - [ ] Modal rotaları (`app/modals/add-transaction.tsx`, `app/modals/currency-select.tsx`)
- [ ] **1.4 Cihaz İçi Güvenli Depolama (Secure Store & State)**
  - [ ] `expo-secure-store` entegrasyonu (JWT / Session token saklama)
  - [ ] Zustand veya React Context ile global state yönetimi (`useAuthStore`, `usePortfolioStore`, `useSettingsStore`)

---

### 🌐 FAZ 2: Vercel Backend & Veritabanı Entegrasyon Katmanı
Next.js API rotalarımızla kesintisiz, güvenli ve performanslı veri iletişimi kurma.

- [ ] **2.1 Merkezi API İstemcisi (`services/api.ts`)**
  - [ ] Base URL yönetimi (Production: Vercel Domain, Local: Yerel IP)
  - [ ] Request Interceptor: Her isteğin header'ına `Authorization: Bearer <token>` veya `Cookie` otomatik ekleme
  - [ ] Response Interceptor: 401 Unauthorized durumunda oturumu kapatıp Login'e yönlendirme
  - [ ] Hata yakalama ve kullanıcı dostu Türkçe hata mesajları üretme servisi
- [ ] **2.2 TypeScript Tipleri & İş Mantığı Senkronizasyonu**
  - [ ] Web projesindeki tip tanımlarının (`Transaction`, `Instrument`, `PortfolioSummary`, `PriceSnapshot`, `AnalysisBriefing`) `types/` altına aktarılması
  - [ ] Ortak matematiksel hesaplama fonksiyonları (`calculateProfitLoss`, `formatCurrency`, `formatPercent`, `groupTransactionsByDate`)
- [ ] **2.3 Kimlik Doğrulama & Oturum Yönetimi (Auth Flow)**
  - [ ] `/api/auth/login` entegrasyonu (E-posta + Şifre)
  - [ ] `/api/auth/demo` entegrasyonu (Tek tıkla Demo Modu girişi)
  - [ ] `/api/auth/send-otp` & `/api/auth/verify-otp` entegrasyonu
  - [ ] `/api/auth/me` ile açılışta oturum geçerliliğini otomatik kontrol etme (Auto-Login)
  - [ ] Güvenli Çıkış Yap (Logout) ve token temizleme akışı

---

### 🎨 FAZ 3: Mobil Ekranların Tasarımı & Geliştirilmesi
Kullanıcının her gün etkileşimde bulunacağı tüm ekranların mobil-öncelikli olarak kodlanması.

- [ ] **3.1 Kimlik Doğrulama Ekranları (`(auth)`)**
  - [ ] **Açılış & Karşılama Ekranı:** Logo animasyonu, "Giriş Yap", "Kayıt Ol", "Demo İncele" butonları
  - [ ] **Giriş Ekranı:** E-posta, şifre girişi, "Şifremi Unuttum" linki, OTP ile giriş geçişi
  - [ ] **Kayıt & OTP Ekranı:** Yeni üyelik formu ve 6 haneli SMS/E-posta kod doğrulama kutucukları
- [ ] **3.2 Genel Bakış / Dashboard Ekranı (`(tabs)/index.tsx`)**
  - [ ] **Portföy Özet Kartı:** Toplam Varlık Değeri (Gizle/Göster göz ikonu ile), Günlük Değişim (TL ve %), Toplam Kâr/Zarar
  - [ ] **Varlık Dağılım Mini Barı / Donut:** Hisse, Fon, BES, Kripto, Döviz yüzdesel oranları
  - [ ] **Piyasa Özeti Widget'ı:** BIST100, Dolar, Euro, Altın, Bitcoin canlı bant akışı
  - [ ] **Hızlı Eylemler:** "Hisse Al/Sat", "Fiyatları Güncelle", "Not Ekle" hızlı butonları
  - [ ] **Son İşlemler Bölümü:** Son yapılan 3-5 işlemin kompakt listesi
- [ ] **3.3 Portföy & Varlık Detay Ekranları (`(tabs)/portfolio.tsx`)**
  - [ ] **Kategori Filtre Çipleri:** Tümü | BIST | TEFAS | Yabancı Hisse | BES | Kripto | Emtia
  - [ ] **Varlık Kartı Tasarımı:** Sembol, Şirket/Fon Adı, Güncel Fiyat, Günlük Değişim %, Maliyet, Toplam Değer, Kâr/Zarar
  - [ ] **Sıralama Seçenekleri:** Değere Göre (Büyükten Küçüğe), Günlük Getiriye Göre, Kâra Göre
  - [ ] **Detay Ekranı (`asset/[symbol].tsx`):**
    - [ ] Etkileşimli Fiyat Grafiği (1G, 1H, 1A, 1Y, Tümü aralıkları)
    - [ ] Bu varlıktaki geçmiş işlem hareketlerimin dökümü (Alış/Satış tarihleri ve fiyatları)
    - [ ] Ortalama maliyet, toplam kâr/zarar, portföydeki ağırlık yüzdesi
- [ ] **3.4 İşlem Ekleme / Düzenleme Ekranı (`modals/add-transaction.tsx`)**
  - [ ] **Alttan Açılan Pencere (Bottom Sheet):** Kolay tek elle kullanım
  - [ ] **İşlem Tipi Seçici:** Alış (Yeşil) / Satış (Kırmızı) Toggle
  - [ ] **Varlık Türü Seçici:** BIST, TEFAS, Yabancı, Döviz, Emtia, Kripto, BES
  - [ ] **Canlı Sembol Arama:** Harf yazdıkça Yahoo Finance & TEFAS'tan anlık arama önerileri
  - [ ] **Akıllı Hesaplayıcı:** Adet ve Birim Fiyat girildiğinde Toplam Tutarı otomatik hesaplama
  - [ ] **Tarih Seçici:** Android yerel takvim bileşeni (`@react-native-community/datetimepicker`)
  - [ ] **Not & Para Birimi Alanı:** Ek açıklama ve TRY/USD/EUR seçimi
- [ ] **3.5 İşlem Geçmişi Ekranı (`(tabs)/transactions.tsx`)**
  - [ ] Aylara ve tarihlere göre gruplanmış işlem listesi
  - [ ] Arama ve varlık türüne göre filtreleme çubuğu
  - [ ] İlgili işleme dokunulduğunda "Düzenle" veya "Sil" aksiyonları
- [ ] **3.6 Büyüme & BES Takip Ekranı (`(tabs)/growth.tsx`)**
  - [ ] Portföyün aylık toplam büyüme trendi (Çubuk / Alan Grafiği)
  - [ ] Ay sonu kapanış kayıtları tablosu / kartları
  - [ ] BES (Bireysel Emeklilik) Birikimi ve Devlet Katkısı özel takip alanı
  - [ ] Yeni ay sonu bakiyesi ekleme modalı
- [ ] **3.7 AI Brifing & Teknik Analiz Ekranı (`(tabs)/analysis.tsx`)**
  - [ ] **Günün AI Piyasa Yorumu:** OpenAI/Gemini tarafından üretilen günlük özet kartı
  - [ ] **Teknik Gösterge Kartları:** Portföydeki hisselerin RSI Seviyeleri (Aşırı Alım/Satım), MACD Sinyalleri, Trend Yönü
  - [ ] **Portföy Sağlık Skoru:** Risk ve çeşitlendirme puanı rozeti
- [ ] **3.8 Ayarlar & Kullanıcı Profili (`(tabs)/settings.tsx`)**
  - [ ] Kullanıcı bilgileri (İsim, E-posta, Hesap Türü)
  - [ ] Ana Para Birimi Tercihi (TRY, USD, EUR)
  - [ ] Günlük E-posta Özeti (Daily Digest) açma/kapama switch'i
  - [ ] Geri Bildirim & Hata Bildirimi Gönderme Modalı (Web'deki `Feedback` tablosuna yazar)
  - [ ] Güvenli Çıkış ve Hesap Silme talebi

---

### ⚡ FAZ 4: Mobil Deneyim, Performans & Dokunmatik İyileştirmeler
Uygulamayı sıradan bir web görünümünden çıkarıp üst düzey bir Android uygulaması hissettiren detaylar.

- [ ] **4.1 Dokunmatik & Hissiyat İyileştirmeleri**
  - [ ] `Pull-to-Refresh` (Ekranı aşağı çekince `/api/prices/refresh` ile anlık fiyatları güncelleme)
  - [ ] `expo-haptics` ile işlem kaydederken ve butonlara basarken hafif titreşim geri bildirimi
  - [ ] Akıcı ekran geçiş animasyonları (React Native Reanimated)
- [ ] **4.2 Yükleme & Hata Yönetimi**
  - [ ] Veri yüklenirken içerik şeklinde parıldayan **Skeleton Loading** kartları
  - [ ] İnternet bağlantısı koptuğunda "Bağlantı Yok" bilgilendirme çubuğu
  - [ ] Boş Durum (Empty State) tasarımları ("Henüz işleminiz yok, ilk hissenizi ekleyin")
- [ ] **4.3 Canlı Fiyat Güncelleme Çubuğu**
  - [ ] Manuel "Fiyatları Yenile" butonu ve son güncelleme zamanı göstergesi (Örn: "2 dk önce güncellendi")

---

### 🧪 FAZ 5: Cihaz Testleri, Emülatör & Dahili Doğrulama
Kodlanan uygulamanın gerçek Android cihazlarda ve farklı ekran boyutlarında test edilmesi.

- [ ] **5.1 Expo Go ile Fiziksel Cihazda Anında Önizleme**
  - [ ] Bilgisayarda `npx expo start` çalıştırma
  - [ ] Android telefondaki Expo Go uygulaması ile QR kodu taratıp canlı geliştirme/test yapma
- [ ] **5.2 Android Emülatör & Farklı Ekran Boyutları Testi**
  - [ ] Android Studio Emülatöründe (Küçük ekran, Büyük ekran, Katlanabilir telefon) test
  - [ ] Karanlık mod / Aydınlık mod geçiş testleri
- [ ] **5.3 Test APK'sı Üretimi (EAS Build - Development/Preview Profile)**
  - [ ] Expo hesabı açma ve `eas-cli` kurulumu
  - [ ] `eas build -p android --profile preview` komutuyla doğrudan telefona yüklenebilir `.apk` dosyası üretip test etme

---

### 📦 FAZ 6: Google Play Store Hazırlığı & Canlı Yayınlama
Uygulamanın resmi olarak Google Play Store'da tüm dünyaya sunulması.

- [ ] **6.1 Görsel Varlıklar ve Metadata Hazırlığı**
  - [ ] **Uygulama İkonu:** 512x512 PNG ve Adaptive Icon (arka plan + ön plan katmanları)
  - [ ] **Açılış Ekranı (Splash Screen):** PortTrack logolu dikey açılış görseli
  - [ ] **Tanıtım Metinleri:**
    - [ ] Uygulama Adı: *PortTrack - Portföy & Finans Takibi*
    - [ ] Kısa Açıklama (80 karakter)
    - [ ] Tam Açıklama (Özellikler, desteklenen varlıklar, AI analizi)
  - [ ] **Mağaza Ekran Görüntüleri:** En az 4 adet telefon ekran görüntüsü (Dashboard, Portföy, Grafik, Analiz)
- [ ] **6.2 Google Play Console Geliştirici Hesabı**
  - [ ] Google Play Console'a kayıt olma ($25 tek seferlik resmi Google geliştirici ücreti)
  - [ ] Geliştirici kimlik doğrulamasının tamamlanması
- [ ] **6.3 Zorunlu Yasal & Güvenlik Politikaları**
  - [ ] Gizlilik Politikası (Privacy Policy) web linki (Web sitemize `/privacy` sayfası olarak eklenir)
  - [ ] Veri Güvenliği Formu (Data Safety Form): Hangi verilerin toplandığının Play Console'da beyan edilmesi
  - [ ] Finansal Uygulamalar Beyannamesi (Yatırım tavsiyesi içermez bilgilendirmesi)
- [ ] **6.4 İmzalı Android App Bundle (.aab) Üretimi**
  - [ ] `eas build -p android --profile production` ile Google Play uyumlu `.aab` paketinin bulutta derlenmesi
  - [ ] Google Keystore anahtarlarının Expo tarafından güvenle yönetilmesi
- [ ] **6.5 Google Play Kapalı Test & İnceleme Süreci**
  - [ ] Play Console'da yeni uygulama oluşturma ve `.aab` paketini yükleme
  - [ ] Google'ın 14 günlük kapalı test (Closed Testing) sürecinin tamamlanması
- [ ] **6.6 Canlıya Çıkış (Production Release) & Lansman! 🎉**
  - [ ] Uygulamanın Google Play Store'da resmi olarak yayına alınması
  - [ ] Web sitemize "Google Play'den İndirin" rozetinin eklenmesi

---

## 🛠️ Kullanılacak Teknolojiler Özeti

* **Framework:** React Native (Expo SDK 52+, Expo Router v4)
* **Dil:** TypeScript
* **Stil & Tasarım:** Tailwind CSS / NativeWind v4 & Lucide Icons
* **Grafikler:** `react-native-gifted-charts` (Mobil dokunmatik finans grafikleri)
* **Depolama & State:** `expo-secure-store` + `zustand`
* **Build & Dağıtım:** Expo Application Services (EAS Build & EAS Update)
* **Backend:** Mevcut Vercel Next.js 16 API'larımız
* **Veritabanı:** Mevcut Neon Serverless PostgreSQL
