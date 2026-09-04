# 🚀 PortTrack X (Twitter) Akıllı Büyüme Botu

Bu bot, X (Twitter) üzerinde borsa, fon, portföy takibi ve finans ile ilgili tweetleri otomatik tespit edip, **OpenAI (GPT-4o mini)** kullanarak bağlama uygun, samimi ve değer katan yanıtlar üreten bağımsız bir otomasyon aracıdır.

---

## 📌 Özellikler

- **0 TL X API Maliyeti:** Playwright tarayıcı motoru ile çalışır, aylık 100$ API ücreti gerektirmez.
- **Akıllı Eleme (AI Filtresi):** Her tweete körü körüne cevap yazmaz. Tweetin gerçekten portföy/fon/hisse takibiyle ilgili olup olmadığını GPT-4o mini analiz eder.
- **Doğal ve Samimi Dil:** Asla şablon reklam metni atmaz; önce kullanıcının sorusuna finansal katkı sağlar, ardından PortTrack'e bağlar.
- **İki Farklı Çalışma Modu:**
  - `interactive` *(Varsayılan & Tavsiye Edilen)*: Bot cevabı hazırlar, terminalde size gösterip **[E: Gönder, H: Pas Geç]** onayı ister.
  - `auto`: Doğrudan tam otonom şekilde yanıtları gönderir.
- **Spam & Ban Koruması:**
  - İnsan gibi klavye tuşlama hızları (random typing delay).
  - Yanıtlar arası 45-90 saniye dinlenme süresi.
  - Aynı tweete 2 kere yazmama hafızası (`history.json`).
  - İstenmeyen kelimeleri (kumar, vip grup, pump vb.) otomatik filtreleme.

---

## 🛠️ Kurulum Adımları

### 1. Bağımlılıkları ve Chromium'u Kurun

Terminalde bot klasörüne girin:
```bash
cd x-growth-bot
npm install
npx playwright install chromium
```

### 2. `.env` Dosyanızı Oluşturun

Klasördeki `.env.example` dosyasını kopyalayıp `.env` adında bir dosya oluşturun ve OpenAI anahtarınızı ekleyin:
```env
OPENAI_API_KEY=sk-proj-buraya-api-keyiniz
BOT_MODE=interactive
MAX_REPLIES_PER_RUN=3
```

---

## 🎯 Kullanım

### Adım 1: X Hesabınıza Giriş Yapın (Tek Seferlik)
Botun sizin hesabınızdan tweet atabilmesi için ilk seferde giriş yapmanız gerekir:
```bash
npm run login
```
* Açılan tarayıcı penceresinde X hesabınıza normal şekilde giriş yapın.
* Ana sayfaya ulaştığınızda script bunu algılayıp oturumu `user_data` klasörüne kaydedecek ve tarayıcıyı kapatacaktır.
* **Artık bir daha şifre girmenize gerek kalmaz.**

---

### Adım 2: Yapay Zekayı Test Edin (İsteğe Bağlı)
Twitter'a bağlanmadan önce OpenAI'ın tweetleri nasıl analiz edip yanıtlar ürettiğini görmek için:
```bash
npm run test-ai
```

---

### Adım 3: Botu Başlatın
```bash
npm start
```
* Bot belirlenen kelimeleri arar (`portföy takip`, `excel portföy`, `hangi fon` vb.).
* Yeni tweetleri bulur, AI ile değerlendirir.
* `interactive` moddaysa size sorar:
  ```text
  👤 Yazar: @borsaci_ali
  📝 Tweet: "Fon ve hisselerimi excelde takip etmekten usandım..."
  🤖 GPT-4o mini: "Excel formülleri kur ve temettü güncellemelerinde sıkıntı çıkarabiliyor..."
  ❓ Bu yanıtı göndermek istiyor musunuz? [E: Evet, H: Hayır, Q: Çık]:
  ```
* `E` yazıp Enter'a bastığınızda yanıtı insan gibi doğal hızda yazar ve gönderir!

---

## ⚙️ Ayarları Özelleştirme (`config.json`)

Aranacak kelimeleri veya kuralları değiştirmek için `config.json` dosyasını düzenleyebilirsiniz:
- `searchQueries`: Aranacak kelimeler.
- `blockedWords`: Görülünce doğrudan elenecek kelimeler.
- `brandContext`: PortTrack ile ilgili AI'a verilen özellikler.
