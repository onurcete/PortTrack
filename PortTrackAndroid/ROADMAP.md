# 📱 PortTrack Android Geliştirme ve Yayınlama Yol Haritası

Bu belge, **PortTrack** web projemizin Android uygulamasının sıfırdan geliştirilip Google Play Store'da yayınlanmasına kadar olan tüm aşamaları adım adım takip etmek için hazırlanmıştır.

---

## 📊 Genel İlerleme Durumu

- [ ] **Faz 1:** Temel Kurulum ve Proje İskeleti (0/4)
- [ ] **Faz 2:** API & Kimlik Doğrulama Katmanı (0/3)
- [ ] **Faz 3:** Mobil Ekranların Tasarımı & Kodlanması (0/7)
- [ ] **Faz 4:** Mobil Deneyim & İnce Ayarlar (0/3)
- [ ] **Faz 5:** Cihaz Testleri & Dahili Sürüm (0/2)
- [ ] **Faz 6:** Google Play Store Hazırlığı ve Yayın (0/6)

---

## 🚀 Faz 1: Temel Kurulum ve Proje İskeleti

Mobil projenin temel yapı taşlarının ve navigasyon sisteminin kurulması.

- [ ] **1.1 Expo & React Native Kurulumu**
  - `PortTrackAndroid` içinde Expo projesinin başlatılması
  - TypeScript, temel konfigürasyonlar ve ortam ayarları
- [ ] **1.2 Tasarım Sistemi & Stil Altyapısı**
  - Tema renkleri (Dark/Light modu, PortTrack yeşil ve lacivert paleti)
  - Lucide Icons (Mobil uyumlu ikon paketi) entegrasyonu
- [ ] **1.3 Navigasyon Sistemi (Expo Router)**
  - Alt Menü (Bottom Tab Bar): Genel Bakış, Portföy, İşlemler, Analiz, Ayarlar
  - Sayfa geçişleri ve Stack ekranları
- [ ] **1.4 Güvenli Depolama (SecureStore)**
  - Oturum anahtarlarının telefonda şifreli olarak saklanması altyapısı

---

## 🌐 Faz 2: API & Kimlik Doğrulama Katmanı

Mevcut Vercel sunucumuz ve Neon PostgreSQL veritabanımızla haberleşme.

- [ ] **2.1 API İstemcisi (API Client)**
  - Vercel URL'sine (`https://porttrack-app.vercel.app/api/...`) bağlanacak merkezi istek yöneticisi
  - Oturum token'ını otomatik ekleyen interceptor yapısı
- [ ] **2.2 Veri Tipleri & Yardımcı Fonksiyonlar**
  - Web projesindeki `Transaction`, `Instrument`, `Portfolio` tiplerinin aktarımı
  - Para birimi formatlama ve matematiksel hesaplama fonksiyonları
- [ ] **2.3 Giriş & Kayıt (Auth Flow)**
  - E-posta / Şifre ile giriş yapma
  - OTP doğrulama ve Demo hesap girişi desteği

---

## 🎨 Faz 3: Mobil Ekranların Tasarımı & Kodlanması

Web'deki sayfaların telefon ekranına özel, dokunmatik uyumlu mobil arayüzlerinin oluşturulması.

- [ ] **3.1 Giriş & Karşılama Ekranı (Login / Onboarding)**
  - Şık açılış ekranı, logo animasyonu ve giriş formu
- [ ] **3.2 Genel Bakış (Dashboard / Overview Ekranı)**
  - Toplam Portföy Değeri, Günlük & Toplam Kâr/Zarar kartları
  - Varlık Dağılımı (Hisse, Fon, BES, Kripto, Döviz) özeti
  - Son işlemler mini listesi
- [ ] **3.3 Portföy & Varlık Listesi Ekranı**
  - Varlık türüne göre filtreleme (BIST, TEFAS, BES, Yabancı vb.)
  - Kaydırılabilir varlık kartları (Swipe Actions: Detay, Sil, Düzenle)
  - Dokunmatik fiyat/kâr detayları
- [ ] **3.4 İşlem Ekleme & Düzenleme (Bottom Sheet / Modal)**
  - Ekranın altından açılan yarım pencere (Alış/Satış, Sembol arama, Adet, Fiyat)
- [ ] **3.5 Büyüme & Aylık Gelişim Ekranı (Growth)**
  - Ay sonu bakiyeleri, BES birikimi ve portföy büyüme grafikleri
- [ ] **3.6 AI Brifing & Teknik Analiz Ekranı**
  - Günlük AI piyasa ve portföy analiz kartları, teknik göstergeler
- [ ] **3.7 Ayarlar & Profil Ekranı**
  - Para birimi seçimi (TRY/USD/EUR), Bildirim tercihleri, Güvenli Çıkış

---

## ⚡ Faz 4: Mobil Deneyim & İnce Ayarlar

Uygulamanın profesyonel ve akıcı bir his vermesini sağlayan özellikler.

- [ ] **4.1 Aşağı Çekip Yenileme (Pull to Refresh)**
  - Fiyatları ve portföyü anında tazelemek için parmakla çekme hareketi
- [ ] **4.2 Titreşim & Haptic Feedback**
  - Butonlara tıklandığında ve işlem eklendiğinde hafif titreşim geri bildirimi
- [ ] **4.3 Yükleme (Skeleton) ve Hata Ekranları**
  - Veri yüklenirken parıldayan iskelet ekranlar, internet kesintisi uyarıları

---

## 🧪 Faz 5: Cihaz Testleri & Önizleme

- [ ] **5.1 Kendi Telefonunuzda Canlı Test (Expo Go)**
  - Telefonunuzdaki Expo Go uygulaması ile QR kod okutarak anında test etme
- [ ] **5.2 Android Test APK'sı Üretme (Development Build)**
  - Gerçek bir `.apk` paketi oluşturup telefona doğrudan kurarak test etme

---

## 📦 Faz 6: Google Play Store Hazırlığı & Yayınlama

Uygulamanın dünyaya açılması ve Google Play Store'a yüklenmesi.

- [ ] **6.1 Uygulama Görselleri ve Yapılandırma**
  - Android Uygulama İkonu (1024x1024) ve Adaptive Icon (Yuvarlak/Kare)
  - Açılış Ekranı (Splash Screen) ve Renk Ayarları (`app.json`)
  - Paket adı tanımlama (Örn: `com.porttrack.app`)
- [ ] **6.2 Google Play Console Geliştirici Hesabı**
  - Google Play Console hesabı oluşturma ($25 tek seferlik Google kayıt ücreti)
- [ ] **6.3 Gizlilik Politikası (Privacy Policy)**
  - Google Play'in zorunlu kıldığı basit gizlilik politikası web sayfası linki
- [ ] **6.4 EAS Build ile Android App Bundle (.aab) Üretme**
  - Expo bulut sunucularında imzalanmış resmi mağaza paketinin oluşturulması
- [ ] **6.5 Mağaza Listelemesi & Ekran Görüntüleri**
  - Uygulama başlığı, kısa ve uzun tanıtım metinleri
  - Google Play için telefon ekran görüntüleri
- [ ] **6.6 İnceleme & Canlıya Alma (Production Release)**
  - Google Play incelemesine gönderme ve onay sonrası canlıya çıkış! 🎉
