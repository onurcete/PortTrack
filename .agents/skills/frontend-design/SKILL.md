---
name: frontend-design
description: Standard guidelines for crafting dense, premium, and highly legible financial web and mobile user interfaces without decorative clutter.
---

# Frontend Design System & UI Crafting Guidelines

Bu kılavuz, PortTrack ve benzeri bilgi-yoğun finansal dashboard uygulamalarında arayüz kalitesini, okunabilirliği ve kullanıcı deneyimini en üst seviyede tutmak için belirlenmiş tasarım prensipleridir.

---

## 1. Temel Prensipler & Bilgi Yoğunluğu (Information Density)

- **Gereksiz Kart ve Boşluk Şişkinliğini Önleyin (Avoid Card Fatigue):** Her veriyi ayrı bir çerçeveli karta veya kutucuğa hapsetmeyin. İlgili metrikleri birleşik, akıcı satırlar ve mantıksal sütun hiyerarşileri içinde gruplayın.
- **5 Saniye Kuralı:** Kullanıcı Dashboard'a girdiğinde ilk 5 saniyede:
  1. Toplam Portföy Değerini
  2. Günlük / Dönemsel Net Değişimi (TL ve %)
  3. Açık Varlık Dağılımını
  tek bakışta görebilmeli ve anlayabilmelidir.
- **Aşırı Dekorasyondan Kaçının:** Finans uygulamalarında aşırı büyük gradientler, dikkat dağıtıcı neon parlamalar ve devasa dolgular (padding) yerine net sınırlar (hairline borders) ve sakin arka plan kontrastları tercih edilmelidir.

---

## 2. Tipografi ve Finansal Gösterim Standartları

- **Tabular Rakamlar (MANDATORY):** Tüm sayısal değerler, fiyatlar, yüzdeler ve tutarlar için mutlaka `tabular-nums` CSS sınıfı kullanılmalıdır. Bu, sayıların hiza kaymasını önler.
- **Para Birimi & Yüzde Formatı:**
  - TRY: `3.435.156 ₺` veya `3.435.156,20 ₺`
  - USD: `$71.224` veya `$71.224,50`
  - Yüzdeler: Pozitifte `+%12,40` / `+12.4%`, Negatifte `-%3,20` / `-3.2%`
- **Yön İndikatörleri (Erişilebilirlik):**
  - Kazanç ve kaybı **yalnızca yeşil ve kırmızı renkle anlatmayın**. Renk körlüğü ve netlik için her zaman `▲` (yukarı ok) veya `▼` (aşağı ok) sembolleri ile destekleyin.
  - Nötr / Sıfır değişimlerde `—` veya `%0,0` gri tonunda gösterilmelidir.

---

## 3. Renk Sistemi ve Varlık Türü Rozetleri

PortTrack genelinde tanımlı standart renk kodları korunmalıdır:

| Varlık Türü | Türkçe Etiket | Tema / Renk Vurgusu |
|---|---|---|
| **BES** | Bireysel Emeklilik | Amber / Altın Sarısı |
| **BIST** | BIST Hisseleri | Mavi / Indigo |
| **TEFAS** | Yatırım Fonları | Mor / Eflatun |
| **FOREIGN** | Yabancı Hisseler | Cyan / Camgöbeği |
| **CRYPTO** | Kripto Paralar | Pembe / Fuşya |
| **METAL** | Kıymetli Maden | Sarı / Bronz |
| **FX** | Döviz Varlıkları | Zümrüt Yeşili |

---

## 4. Durum Yönetimi (State Handling)

Her veri alanı ve tablo şu 4 durumu kusursuz şekilde yönetmelidir:
1. **Loading (Yükleme):** Boyutu zıplatmayan, hafif parıldayan skeleton kartlar veya sakin indikatörler.
2. **Empty (Boş Veri):** Kullanıcıyı yönlendiren net boş durum mesajları (Örn: *"Henüz bu kategoride açık pozisyonunuz bulunmuyor. Yeni işlem ekleyin."*).
3. **Stale Data (Eski / Bekleyen Veri):** Piyasa kapalıyken veya veri güncellenirken son güncelleme saatini (`Son: 10:14`) açıkça belirtme.
4. **Error (Hata Durumu):** Sayfayı çökertmeyen, lokal "Tekrar Dene" butonu barındıran kullanıcı dostu hata bildirimleri.

---

## 5. Responsive & Edge-to-Edge Uyum

- Mobilde ekran kenarlarında gereksiz boşluk bırakmayan, tam genişlikte (Edge-to-Edge) hairline bordürlü temiz düzen.
- Geniş tablolarda mobilde yatay kaydırma desteği (`overflow-x-auto`) ve ilk sütunun (Sembol/Tarih) sabit kalabilmesi.
