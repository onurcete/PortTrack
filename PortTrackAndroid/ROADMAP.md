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
| **Giriş / Kayıt** (`/login`, `/register`) | `(auth)/login.tsx` | Masaüstü formu, Google OAuth butonu | Mobil klavye uyumlu, OTP & Demo destekli temiz form |
| **Genel Bakış** (`/`) | `(tabs)/index.tsx` (Dashboard) | Geniş grafikler, yan panel, notlar widget'ı | Kompakt özet kartlar, hızlı kâr/zarar çubuğu, hızlı işlem butonu |
| **Portföy** (`/portfolio`) | `(tabs)/portfolio.tsx` & `asset/[symbol].tsx` | 10 sütunlu masaüstü veri tablosu | Varlık filtreleme çipleri (BIST, TEFAS, BES..), Swipeable kartlar |
| **İşlemler** (`/transactions`) | `(tabs)/transactions.tsx` | Sayfalanmış işlem geçmişi tablosu | Tarihe göre gruplanmış dikey işlem geçmişi |
| **İşlem Ekle/Düzenle** (`modal`) | `modals/add-transaction.tsx` | Ekran ortasında büyük dialog penceresi | Alttan kayarak açılan **Bottom Sheet Modal** + Otomatik Tutar Hesabı |
| **Büyüme & BES** (`/growth`) | `(tabs)/growth.tsx` | Yıllık karşılaştırmalı matris & Excel aktarımı | Ay sonu kapanış kayıtları, BES özel takip kartı |
| **Teknik & AI Analiz** (`/analysis`) | `(tabs)/analysis.tsx` | Geniş indikatör grafikleri ve brifing raporu | Günlük AI özet brifing kartı, RSI/MACD durum rozetleri |
| **Ayarlar & Profil** (`/settings`) | `(tabs)/settings.tsx` | Çok sekmeli ayarlar menüsü | Liste tipi ayarlar, Para birimi seçimi, Güvenli Çıkış |

---

## 📋 Detaylı Fazlar ve İşaretleme Kontrol Listesi

### 🚀 FAZ 1: Temel Kurulum, Proje İskeleti ve Tasarım Sistemi (TAMAMLANDI ✅)
Mobil projenin altyapısının oluşturulması ve web tasarım diliyle uyumlu modern karanlık tema sisteminin kurulması.

- [x] **1.1 Expo Proje Başlatma & Konfigürasyon**
  - [x] `PortTrackAndroid` içinde Expo projesini TypeScript ve `expo-router` ile başlatma
  - [x] `app.json` temel kimlik ayarları (appName: "PortTrack", slug: "porttrack", orientation: "portrait")
  - [x] Android paket adı tanımlaması (`com.porttrack.app`)
  - [x] `.gitignore` ve ortam değişkenleri (`.env`) yapılandırması
- [x] **1.2 Tasarım Sistemi & Tema Entegrasyonu**
  - [x] Web projesindeki renk paletini mobil ortama aktarma (`theme/colors.ts`) (Koyu Zemin `#090d16`, Zümrüt Yeşili `#10b981`, Canlı Kırmızı `#f43f5e`, Kobalt Mavi `#3b82f6`)
  - [x] `lucide-react-native` ikon setinin kurulması ve konfigürasyonu
- [x] **1.3 Navigasyon Mimarisi (Expo Router - File-based Routing)**
  - [x] Kök yerleşim (`app/_layout.tsx`) ve Tema/Auth Provider sarıcıları
  - [x] Alt Gezinme Çubuğu (`app/(tabs)/_layout.tsx`): 6 Ana Sekme (Özet, Portföy, İşlemler, Büyüme, Analiz, Ayarlar)
  - [x] Dinamik detay rotaları (`app/asset/[symbol].tsx`)
  - [x] Modal rotaları (`app/modals/add-transaction.tsx`)
- [x] **1.4 Cihaz İçi Güvenli Depolama (Secure Store & State)**
  - [x] `expo-secure-store` entegrasyonu (JWT / Session token saklama)
  - [x] Zustand ile global auth state yönetimi (`stores/authStore.ts`)

---

### 🌐 FAZ 2: Vercel Backend & Veritabanı Entegrasyon Katmanı (TAMAMLANDI ✅)
Next.js API rotalarımızla kesintisiz, güvenli ve performanslı veri iletişimi kurma.

- [x] **2.1 Merkezi API İstemcisi (`services/api.ts`)**
  - [x] Base URL yönetimi (Production: Vercel Domain, Local: Yerel IP)
  - [x] Request Interceptor: Her isteğin header'ına `Authorization: Bearer <token>` ve `Cookie` otomatik ekleme
  - [x] Response Interceptor: 401 Unauthorized durumunda oturumu kapatıp Login'e yönlendirme
  - [x] Hata yakalama ve kullanıcı dostu Türkçe hata mesajları üretme servisi
- [x] **2.2 TypeScript Tipleri & İş Mantığı Senkronizasyonu**
  - [x] Web projesindeki tip tanımlarının (`Transaction`, `Instrument`, `PortfolioSummary`, `PortfolioPosition`, `AnalysisBriefing`, `TechnicalSignal`) `types/index.ts` altına aktarılması
  - [x] Ortak matematiksel hesaplama ve formatlama fonksiyonları (`utils/formatters.ts` -> `formatCurrency`, `formatPercent`, `formatDate`, `getAssetTypeBadgeColor`)
- [x] **2.3 Kimlik Doğrulama & Oturum Yönetimi (Auth Flow)**
  - [x] `/api/auth/login` entegrasyonu (E-posta + Şifre)
  - [x] `/api/auth/demo` entegrasyonu (Tek tıkla Demo Modu girişi)
  - [x] `/api/auth/me` ile açılışta oturum geçerliliğini otomatik kontrol etme (Auto-Login)
  - [x] Güvenli Çıkış Yap (Logout) ve token temizleme akışı

---

### 🎨 FAZ 3: Mobil Ekranların Tasarımı & Geliştirilmesi (TAMAMLANDI ✅)
Kullanıcının her gün etkileşimde bulunacağı tüm ekranların mobil-öncelikli olarak kodlanması.

- [x] **3.1 Kimlik Doğrulama Ekranları (`(auth)/login.tsx`)**
  - [x] **Açılış & Giriş Ekranı:** Şık logo rozeti, e-posta ve şifre giriş formu, tek tıkla Demo Hesabı girişi
- [x] **3.2 Genel Bakış / Dashboard Ekranı (`(tabs)/index.tsx`)**
  - [x] **Portföy Özet Kartı:** Toplam Varlık Değeri (Gizle/Göster göz butonu), Günlük Değişim (TL ve %), Toplam Kâr/Zarar
  - [x] **Demo Rozeti:** Demo modunda sarı kalkan göstergesi
  - [x] **Hızlı Eylemler:** "İşlem Ekle" (Modal açar) ve "AI Görüşü" butonları
  - [x] **Varlık Dağılımı Özeti:** En büyük 5 varlık kartı ve kâr/zarar yüzdeleri
- [x] **3.3 Portföy & Varlık Detay Ekranları (`(tabs)/portfolio.tsx` & `asset/[symbol].tsx`)**
  - [x] **Kategori Filtre Çipleri:** Tümü | BIST Hisse | Fonlar | Yabancı Hisse | BES | Kripto | Emtia | Döviz
  - [x] **Sembol/İsim Arama Çubuğu:** Anlık arama ve filtreleme
  - [x] **Varlık Kartı Tasarımı:** Sembol, Kategori etiketi, Adet, Maliyet, Toplam Değer, Kâr/Zarar
  - [x] **Detay Ekranı (`asset/[symbol].tsx`):**
    - [x] Toplam Değer, Kâr/Zarar, Maliyet, Birim Fiyat ve Portföydeki Ağırlık Yüzdesi
- [x] **3.4 İşlem Ekleme / Düzenleme Ekranı (`modals/add-transaction.tsx`)**
  - [x] **Alttan Açılan Modal Pencere:** Alış (Yeşil) / Satış (Kırmızı) geçişi
  - [x] **Varlık Türü Çipleri:** BIST, TEFAS, Yabancı, Kripto, BES, Emtia, Döviz
  - [x] **Akıllı Tutar Hesaplayıcı:** Adet ve Birim Fiyat girildiğinde Toplam Tutarı otomatik hesaplama
  - [x] **Not & Para Birimi Alanı:** İşlem açıklaması ve para birimi desteği
- [x] **3.5 İşlem Geçmişi Ekranı (`(tabs)/transactions.tsx`)**
  - [x] Alış/Satış ok ikonları ve renkli etiketlerle işlem geçmişi dökümü
  - [x] Hızlı işlem ekleme butonu
- [x] **3.6 Büyüme & BES Takip Ekranı (`(tabs)/growth.tsx`)**
  - [x] Bireysel Emeklilik (BES) toplam birikim kartı
  - [x] Ay sonu kapanış kayıtları dökümü
- [x] **3.7 AI Brifing & Teknik Analiz Ekranı (`(tabs)/analysis.tsx`)**
  - [x] **Günün Portföy Brifingi:** Yapay zeka piyasa ve portföy özet kartı
  - [x] **Teknik Gösterge Kartları:** Portföydeki hisselerin RSI ve Trend sinyalleri, Teknik Skor rozetleri
- [x] **3.8 Ayarlar & Kullanıcı Profili (`(tabs)/settings.tsx`)**
  - [x] Kullanıcı profil bilgileri (İsim, E-posta, Demo durumu)
  - [x] Ana Para Birimi tercihi ve Günlük E-posta bülteni switch'i
  - [x] Güvenli Çıkış Yap modalı

---

### ⚡ FAZ 4: Mobil Deneyim, Performans & Dokunmatik İyileştirmeler (SIRADAKİ ADIM 🚀)
Uygulamayı sıradan bir web görünümünden çıkarıp üst düzey bir Android uygulaması hissettiren detaylar.

- [ ] **4.1 Dokunmatik & Hissiyat İyileştirmeleri**
  - [x] `Pull-to-Refresh` (Ekranı aşağı çekince `/api/prices/refresh` ile anlık fiyatları güncelleme)
  - [ ] `expo-haptics` ile işlem kaydederken ve butonlara basarken hafif titreşim geri bildirimi
  - [ ] Akıcı ekran geçiş animasyonları
- [ ] **4.2 Yükleme & Hata Yönetimi**
  - [ ] Veri yüklenirken içerik şeklinde parıldayan **Skeleton Loading** kartları
  - [ ] Çevrimdışı durum bilgilendirmesi
- [ ] **4.3 Canlı Fiyat Güncelleme Çubuğu**
  - [ ] Manuel "Fiyatları Yenile" butonu ve son güncelleme zamanı göstergesi

---

### 🧪 FAZ 5: Cihaz Testleri, Emülatör & Dahili Doğrulama
Kodlanan uygulamanın gerçek Android cihazlarda ve farklı ekran boyutlarında test edilmesi.

- [ ] **5.1 Expo Go ile Fiziksel Cihazda Anında Önizleme**
  - [ ] Bilgisayarda `npx expo start` çalıştırma
  - [ ] Android telefondaki Expo Go uygulaması ile QR kodu taratıp canlı geliştirme/test yapma
- [ ] **5.2 Android Emülatör & Farklı Ekran Boyutları Testi**
  - [ ] Android Studio Emülatöründe test
- [ ] **5.3 Test APK'sı Üretimi (EAS Build - Development/Preview Profile)**
  - [ ] `eas build -p android --profile preview` komutuyla doğrudan telefona yüklenebilir `.apk` dosyası üretip test etme

---

### 📦 FAZ 6: Google Play Store Hazırlığı & Canlı Yayınlama
Uygulamanın resmi olarak Google Play Store'da tüm dünyaya sunulması.

- [ ] **6.1 Görsel Varlıklar ve Metadata Hazırlığı**
  - [ ] **Uygulama İkonu:** 512x512 PNG ve Adaptive Icon
  - [ ] **Açılış Ekranı (Splash Screen):** PortTrack logolu dikey açılış görseli
  - [ ] **Tanıtım Metinleri:** Başlık, Kısa ve Tam Açıklama
  - [ ] **Mağaza Ekran Görüntüleri:** En az 4 adet telefon ekran görüntüsü
- [ ] **6.2 Google Play Console Geliştirici Hesabı**
  - [ ] Google Play Console hesabı oluşturma ($25 tek seferlik kayıt)
- [ ] **6.3 Zorunlu Yasal & Güvenlik Politikaları**
  - [ ] Gizlilik Politikası (Privacy Policy) web linki
  - [ ] Veri Güvenliği Formu (Data Safety Form)
- [ ] **6.4 İmzalı Android App Bundle (.aab) Üretimi**
  - [ ] `eas build -p android --profile production` ile Google Play uyumlu `.aab` paketinin derlenmesi
- [ ] **6.5 Google Play Kapalı Test & İnceleme Süreci**
  - [ ] Play Console'da yeni uygulama oluşturma ve `.aab` paketini yükleme
  - [ ] Kapalı test sürecinin tamamlanması
- [ ] **6.6 Canlıya Çıkış (Production Release) & Lansman! 🎉**

---

## 🛠️ Kullanılan Teknolojiler Özeti

* **Framework:** React Native & Expo SDK 52 (Expo Router v4)
* **Dil:** TypeScript
* **Stil & Tasarım:** Dark Emerald Design System & Lucide Icons
* **Depolama & State:** `expo-secure-store` + `zustand`
* **Build & Dağıtım:** Expo Application Services (EAS Build)
* **Backend:** Vercel Next.js 16 API'ları
* **Veritabanı:** Neon Serverless PostgreSQL
