import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Kullanım Koşulları | PortTrack",
  description: "PortTrack platformu kullanım şartları, sorumluluk reddi ve yasal koşullar.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-brand-strong)] transition-colors"
        >
          <ArrowLeft size={14} /> Ana Sayfaya Dön
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-[var(--color-border)]/60 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-xs font-extrabold">
            <FileText size={14} /> Yasal Koşullar
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
            Kullanım Koşulları
          </h1>
          <p className="text-xs text-[var(--color-muted)] font-semibold">
            Son Güncelleme: 27 Temmuz 2026 | Lütfen PortTrack hizmetlerini kullanmadan önce bu koşulları dikkatlice okuyunuz.
          </p>
        </div>

        {/* Critical YTD Warning Banner */}
        <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={24} className="shrink-0" />
            <h2 className="text-base font-black uppercase tracking-wide">
              YATIRIM TAVSİYESİ DEĞİLDİR (YTD) YASAL UYARISI
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-foreground)] leading-relaxed font-medium">
            PortTrack üzerinde sunulan tüm grafikler, veri tabloları, hesaplamalar, TEFAS akışları, ortalama maliyet analizleri ve Yapay Zeka (AI) asistan yanıtları <strong>yalnızca bilgilendirme ve kişisel portföy takip amaçlıdır</strong>. PortTrack, Sermaye Piyasası Kurulu (SPK) lisanslı bir yatırım danışmanlığı veya portföy yönetim şirketi değildir. Sitedeki hiçbir içerik al-sat tavsiyesi, yatırım danışmanlığı veya finansal yönlendirme niteliği taşımaz.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-[var(--color-foreground)]/90 font-medium">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
              1. Hizmet Tanımı ve Amacı
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              PortTrack, kullanıcıların kendi BIST hisse senetleri, TEFAS fonları, döviz, altın, kripto paralar ve BES birikimlerini tek bir arayüzde manuel veya CSV yüklemeleriyle takip etmelerini sağlayan yazılım platformudur. PortTrack, kullanıcı adına hiçbir finansal işlem gerçekleştirmez ve aracı kurum işlevi görmez.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
              2. Kullanıcı Sorumlulukları ve Hesap Güvenliği
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[var(--color-muted)] pl-2">
              <li>Kullanıcılar, hesap şifrelerinin ve erişim bilgilerinin gizliliğinden kendileri sorumludur.</li>
              <li>Sisteme yüklenen borsa ekstreleri ve CSV dosyalarındaki verilerin doğruluğu kullanıcının sorumluluğundadır.</li>
              <li>Platformun güvenliğini tehdit edecek, yetkisiz erişim denemeleri veya tersine mühendislik faaliyetleri yasaktır.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
              3. Fiyat Sağlayıcıları ve Veri Doğruluğu
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              Platformdaki canlı/gecikmeli piyasa fiyatları TEFAS, Yahoo Finance ve açık piyasa API haberleşmeleri üzerinden çekilmektedir. Üçüncü taraf sağlayıcılardan kaynaklanan fiyat gecikmelerinden, teknik kesintilerden veya hatalı borsa verilerinden PortTrack sorumlu tutulamaz.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
              4. Fikrî Mülkiyet Hakları
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              PortTrack logosu, arayüz tasarımları, grafik algoritmaları, kaynak kodları ve veritabanı mimarisi PortTrack&apos;e aittir. Yazılı izin alınmaksızın kopyalanamaz, çoğaltılamaz veya ticari amaçla dağıtılamaz.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-brand)]" />
              5. Hizmet Değişiklikleri ve Sorumluluk Sınırlaması
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              PortTrack, sunduğu ücretsiz veya ücretli özellikleri dilediği zaman güncelleme, değiştirme veya sonlandırma hakkını saklı tutar. PortTrack, platformun kullanımından kaynaklanabilecek doğrudan veya dolaylı maddi zararlardan sorumlu tutulamaz.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-[var(--color-border)]/60 text-center text-xs text-[var(--color-muted)]">
          <p>© 2026 PortTrack. Tüm hakları saklıdır. Sorularınız için <a href="mailto:destek@porttrack.com" className="text-[var(--color-brand-strong)] underline font-bold">destek@porttrack.com</a> adresiyle iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
