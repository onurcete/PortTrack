import Link from "next/link";
import { ArrowLeft, Shield, CheckCircle2, Lock } from "lucide-react";

export const metadata = {
  title: "Gizlilik Politikası & KVKK Aydınlatma Metni | PortTrack",
  description: "PortTrack platformu gizlilik hakları, KVKK uyumluluğu ve veri güvenliği politikası.",
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-extrabold">
            <Shield size={14} /> KVKK & GDPR Uyumlu
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
            Gizlilik Politikası & KVKK Metni
          </h1>
          <p className="text-xs text-[var(--color-muted)] font-semibold">
            Son Güncelleme: 27 Temmuz 2026 | PortTrack, kişisel verilerinizin gizliliğini ve güvenliğini en yüksek seviyede korumayı taahhüt eder.
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="p-6 rounded-2xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/60 space-y-2">
          <div className="flex items-center gap-2 text-[var(--color-brand-strong)] font-extrabold text-sm">
            <Lock size={16} /> Verileriniz Şifreli ve Yalnızca Size Özeldir
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed font-medium">
            PortTrack, portföy bilgilerinizi ve işlem geçmişinizi hiçbir 3. taraf reklam şirketi veya veri tüccarıyla kesinlikle paylaşmaz. Verileriniz yalnızca portföy analizlerinizi hesaplamak için işlenmektedir.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-[var(--color-foreground)]/90 font-medium">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              1. Veri Sorumlusu ve Amacı
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, PortTrack olarak kişisel verileriniz veri sorumlusu sıfatıyla aşağıda açıklanan kapsamda işlenmektedir.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              2. Toplanan Kişisel Veriler
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[var(--color-muted)] pl-2">
              <li><strong>Kimlik ve İletişim Bilgileri:</strong> E-posta adresi, kullanıcı adı ve hesap şifresi (hashlenmiş).</li>
              <li><strong>Portföy ve İşlem Verileri:</strong> Giriş yapılan alış-satış kayıtları, CSV ekstresi yüklemeleri, notlar ve hedefler.</li>
              <li><strong>Teknik Kullanım Verileri:</strong> IP adresi, tarayıcı türü, oturum çerezleri ve tercih ayarları.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              3. Verilerin İşlenme Amacı ve Güvenliği
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              Toplanan kişisel verileriniz; kullanıcı hesabınızın oluşturulması, portföy getiri ve kâr/zarar grafiklerinin hesaplanması, yapay zeka asistan sorgularınızın yanıtlanması ve platform güvenliğinin sağlanması amacıyla SSL/TLS şifrelemeli sunucularda saklanmaktadır.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              4. Çerez (Cookie) Kullanımı
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              PortTrack, oturumunuzu açık tutmak, gece/gündüz tema tercihlerinizi hatırlamak ve güvenliğinizi sağlamak amacıyla zorunlu ve performans çerezleri kullanmaktadır. Tarayıcı ayarlarınızdan dilediğiniz zaman çerezleri engelleyebilirsiniz.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-[var(--color-foreground)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              5. KVKK Kapsamındaki Haklarınız
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              KVKK&apos;nın 11. maddesi uyarınca herkes PortTrack&apos;e başvurarak; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, verilerin düzeltilmesini veya <strong>hesabının tüm verileriyle birlikte tamamen silinmesini (Right to be forgotten)</strong> talep etme hakkına sahiptir.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-[var(--color-border)]/60 text-center text-xs text-[var(--color-muted)]">
          <p>© 2026 PortTrack. KVKK veri silme ve bilgi talepleriniz için <a href="mailto:kvkk@porttrack.com" className="text-[var(--color-brand-strong)] underline font-bold">kvkk@porttrack.com</a> adresiyle iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
