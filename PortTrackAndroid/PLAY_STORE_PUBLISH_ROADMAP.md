# 🚀 PortTrack Android - Google Play Store Yayınlama Yol Haritası & Kontrol Listesi

Bu doküman, **PortTrack Android** uygulamasının Google Play Store'da resmi olarak yayınlanması için gereken tüm adımları, teknik hazırlıkları, mağaza varlıklarını, yasal formları ve Google'ın 14 günlük kapalı test zorunluluğunu adım adım içeren eksiksiz bir rehberdir.

> **Nasıl Kullanılır?**  
> Tamamladığınız her adımın başındaki `[ ]` kutucuğunu `[x]` olarak işaretleyerek ilerlemenizi takip edebilirsiniz.

---

## 📋 GENEL SÜREÇ ÖZETİ

```mermaid
graph TD
    A[1. Geliştirici Hesabı & Ön Hazırlık] --> B[2. Teknik Yapılandırma & EAS Build]
    B --> C[3. Mağaza Girişi & Grafik Varlıklar]
    C --> D[4. Play Console Politika & Veri Güvenliği]
    D --> E[5. Dahili Test - Internal Testing]
    E --> F[6. Kapalı Test - Closed Testing / 14 Gün]
    F --> G[7. Üretime Gönderim - Production Release]
```

---

## 1. 🏢 GELİŞTİRİCİ HESABI & HESAP AÇILIŞI

- [x] **1.1. Google Play Console Hesabı Oluşturma**
  - Google Play Console hesabı aktif ve hazır.
- [x] **1.2. Kimlik & Adres Doğrulaması**
  - Geliştirici kimlik ve adres doğrulaması tamamlandı.
- [x] **1.3. Geliştirici Profil Bilgileri**
  - Geliştirici profili ve iletişim bilgileri hazır.

---

## 2. ⚙️ TEKNİK YAPILANDIRMA & DERLEME (EAS BUILD)

- [x] **2.1. `app.json` Yapılandırma Kontrolü**
  - [x] `name`: `"PortTrack"`
  - [x] `package`: `"com.porttrack.app"` (Benzersiz paket adı)
  - [x] `version`: `"1.0.2"` (Kullanıcıya görünen sürüm)
  - [x] `versionCode`: `3` (Her yeni güncellemede +1 artırılacak)
  - [x] `userInterfaceStyle`: `"dark"`
  - [x] `scheme`: `"porttrack"`
- [x] **2.2. Uygulama İkonları & Açılış Ekranı (Splash)**
  - [x] **Uygulama İkonu (`assets/icon.png`):** 512x512 px PNG oluşturuldu.
  - [x] **Adaptif İkon (`assets/adaptive-icon.png`):** 512x512 px PNG oluşturuldu.
  - [x] **Splash Ekranı (`assets/splash-icon.png`):** 512x512 px PNG oluşturuldu.
- [ ] **2.3. EAS CLI Kurulumu ve Giriş**
  ```bash
  npm install -g eas-cli
  eas login
  ```
- [ ] **2.4. Üretim İçin Android App Bundle (.aab) Derlemesi**
  - Google Play artık `.apk` değil, sadece **`.aab` (Android App Bundle)** kabul etmektedir.
  ```bash
  cd PortTrackAndroid
  eas build --platform android --profile production
  ```
  - *Not: EAS build tamamlandığında `.aab` dosyasını bilgisayarınıza indirin veya EAS linkini hazır bulundurun.*
- [ ] **2.5. Test APK'sı Derleme (Cihazda Doğrudan Denemek İçin)**
  ```bash
  eas build --platform android --profile preview
  ```

---

## 3. 🎨 MAĞAZA GİRİŞİ (STORE LISTING) & GÖRSEL MATERYALLER

- [x] **3.1. Metin İçerikleri (Türkçe & İngilizce)**
  - [x] **Uygulama Adı (Maks. 30 Karakter):** `PortTrack: Portföy & Fon Takip`
  - [x] **Kısa Açıklama (Maks. 80 Karakter):** `BIST, TEFAS Fonları, BES, Döviz ve Altın portföyünüzü anlık takip edin.`
  - [x] **Tam Açıklama (Maks. 4000 Karakter):** Emojisiz ve Google Play Meta Veri politikasına uyumlu metin girildi.
- [x] **3.2. Grafiksel Varlıklar (Play Store Gereksinimleri)**
  - [x] **Uygulama Simgesi:** `PortTrackAndroid/assets/playstore_icon_512.png` (512x512 px PNG).
  - [x] **Özellik Grafiği (Feature Graphic - Banner):** `PortTrackAndroid/assets/feature_graphic_1024x500.png` (1024x500 px).
  - [x] **Telefon Ekran Görüntüleri (Screenshots):** Ekran görüntüleri yüklendi.
- [x] **3.3. Kategorilendirme & İletişim**
  - **Uygulama Türü:** Uygulama (App)
  - **Kategori:** Finans (Finance)
  - **Etiketler:** Finans, Kişisel Finans, Yatırım, Bütçe Takibi, Araçlar.
  - **Web Sitesi:** `https://www.porttrack.com.tr`

---

## 4. ⚖️ POLİTİKA, GİZLİLİK & VERİ GÜVENLİĞİ (DATA SAFETY)

- [x] **4.1. Gizlilik Politikası (Privacy Policy URL):** `https://www.porttrack.com.tr/gizlilik-politikasi`
- [x] **4.2. Oturum Açma Bilgileri (App Access):** Demo Test Hesabı (`demo@porttrack.app` / `Demo1234!`) tanımlandı.
- [x] **4.3. Reklamlar (Ads):** "Hayır, reklam içermiyor" seçildi.
- [x] **4.4. İçerik Derecelendirme (Content Rating):** Anket tamamlandı (PEGI 3 / Genel).
- [x] **4.5. Hedef Kitle ve İçerik (Target Audience):** 18+ seçildi.
- [x] **4.6. Reklam Kimliği (Advertising ID):** "Hayır" / Analiz & İşlevsellik beyan edildi.
- [x] **4.7. Finansal Özellikler Beyanı (Financial Features):** "Diğer / Varlık takip" beyan edildi.
- [x] **4.8. Veri Güvenliği Formu (Data Safety Form):** E-posta ve Finansal işlem verileri beyan edildi, HTTPS şifreleme ve silme linki onaylandı.
- [x] **4.9. Resmi Kurum / Sağlık Beyanları:** Tamamlandı.

---

## 5. 🧪 DAHİLİ TEST (INTERNAL TESTING)

- [ ] **5.1. Dahili Test Parçası (Internal Track) Oluşturma**
  - Play Console > *Test etme* > *Dahili Test* bölümüne gidin.
  - Yeni sürüm oluşturun ve `eas build` ile aldığınız `.aab` dosyasını yükleyin.
- [ ] **5.2. Kendi Cihazınızda Test Etme**
  - Kendi Gmail adresinizi dahili test listesine ekleyin.
  - Verilen test bağlantısını (Opt-in URL) telefonda açıp uygulamayı Play Store üzerinden yükleyin.
  - Giriş yapma, veri çekme, işlem ekleme ve grafiklerin sorunsuz çalıştığını doğrulayın.

---

## 6. 👥 KAPALI TEST (CLOSED TESTING) - 14 GÜNLÜK ZORUNLU SÜREÇ

> [!IMPORTANT]
> **Google Play 2023+ Bireysel Hesap Kuralı:**  
> Kişisel Google Play geliştirici hesaplarının uygulamalarını Üretime (Production) açabilmeleri için:
> - En az **20 test kullanıcısı (veya 12 test kullanıcısı - hesap türüne göre)** tarafından,
> - En az **kesintisiz 14 gün boyunca** Kapalı Test parçasına dahil edilmiş ve aktif olarak test edilmiş olması zorunludur.

- [ ] **6.1. Kapalı Test Parçası (Closed Track) Oluşturma**
  - Play Console > *Test etme* > *Kapalı Test* > *Parça Oluştur* (Örn: `Alfa Testi`).
  - `.aab` paketini bu parçaya yükleyin.
- [ ] **6.2. Test Kullanıcı Listesi (E-posta Listesi)**
  - Arkadaşlarınız, aileniz veya topluluktan en az **20 kişinin Gmail adresini** içeren bir e-posta listesi (Google Group veya CSV) oluşturun.
- [ ] **6.3. Test Davet Bağlantısını Paylaşma**
  - Kapalı test parçası yayınlandıktan sonra oluşan *Web Davet Linki* ve *Android İndirme Linki*ni 20 test kullanıcısına gönderin.
  - Kullanıcıların teste katıl butonuna basıp uygulamayı telefonlarına yüklemesini sağlayın.
- [ ] **6.4. 14 Günlük Aktif Test Takibi**
  - Test kullanıcılarının 14 gün boyunca uygulamayı silmemesini ve ara sıra açıp kullanmasını sağlayın.
  - Play Console Dashboard'undaki *"14 Günlük Test İlerleme Sayacı"*nın tamamlanmasını bekleyin.

---

## 7. 🚀 ÜRETİME YAYINLAMA (PRODUCTION RELEASE)

- [ ] **7.1. Üretim Başvurusu (Apply for Production)**
  - 14 günlük kapalı test süreci başarıyla dolduktan sonra Dashboard'da **"Üretime Başvur" (Apply for Production)** butonu aktif olur.
  - Google'ın sorduğu kısa test geri bildirim anketini doldurun (Uygulamanın ne kadar test edildiği, hangi hataların çözüldüğü vb.).
- [ ] **7.2. Üretim Sürümü Yayınlama (Rollout to Production)**
  - *Sürümler* > *Üretim* sekmesine gidin.
  - En güncel `.aab` dosyasını seçin, sürüm notlarını (Release Notes) yazın.
  - **"İncelemeye Gönder" (Send for Review)** butonuna basın.
- [ ] **7.3. Google İnceleme Süreci**
  - İnceleme süresi ortalama **24 ile 72 saat** sürer.
  - Onaylandığında uygulama dünya çapında veya seçtiğiniz ülkelerde Google Play Store'da **CANLIYA** geçer! 🎉

---

## 🛠️ YAYIN SONRASI İZLEME & GÜNCELLEMELER

- [ ] **Android Vitals Takibi:** Çökme (Crash) ve ANR (Uygulama Yanıt Vermiyor) oranlarını %0.47 altında tutun.
- [ ] **Kullanıcı Yorumları & Destek:** Gelen mağaza yorumlarını yanıtlayın.
- [ ] **Yeni Güncelleme Çıkma:**
  1. `app.json` içinde `versionCode` değerini 1 artırın (Örn: `1 -> 2`).
  2. `eas build --platform android --profile production` ile yeni `.aab` oluşturun.
  3. Play Console Üretim bölümüne yükleyip incelemeye gönderin.
