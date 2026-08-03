import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, ShieldCheck, Send, CheckCircle2, HelpCircle } from "lucide-react";

export const metadata = {
  title: "İletişim & Destek | PortTrack",
  description: "PortTrack destek ekibi ile iletişime geçin, soru ve önerilerinizi iletin.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
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
            <MessageSquare size={14} /> Müşteri Destek & İletişim
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
            Bizimle İletişime Geçin
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
            PortTrack kullanımı, özellik önerileri veya teknik destek talepleriniz için bize istediğiniz zaman ulaşabilirsiniz.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">E-Posta Desteği</h3>
            <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
              Sorularınız ve geri bildirimleriniz için doğrudan e-posta gönderebilirsiniz.
            </p>
            <a
              href="mailto:ceteonur@gmail.com"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-brand-strong)] hover:underline pt-1"
            >
              ceteonur@gmail.com <Send size={12} />
            </a>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">Hızlı Yanıt Garantisi</h3>
            <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
              E-posta iletilerinize genellikle 24 saat içinde dönüş sağlanmaktadır.
            </p>
            <span className="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              7/24 Aktif Takip
            </span>
          </div>
        </div>

        {/* Quick Guidelines */}
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 space-y-4">
          <h3 className="font-extrabold text-base text-[var(--color-foreground)] flex items-center gap-2">
            <HelpCircle size={18} className="text-[var(--color-brand-strong)]" />
            Sıkça Sorulan Sorular & İpuçları
          </h3>
          <div className="space-y-3 text-xs text-[var(--color-muted)] leading-relaxed font-medium">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>İşlem Ekleme / CSV İçe Aktarma:</strong> BIST, TEFAS veya Yabancı Borsa CSV dosyalarınızı İşlemler sayfasındaki "CSV İçe Aktar" butonu ile yükleyebilirsiniz.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Veri Güvenliği:</strong> Verileriniz ve portföy bilgilerinizi üçüncü şahıslarla paylaşmayız. E-posta bildirim tercihlerinizi profilinizden yönetebilirsiniz.</span>
            </div>
          </div>
        </div>

        {/* Direct Email Action Button */}
        <div className="text-center pt-4">
          <a
            href="mailto:ceteonur@gmail.com?subject=PortTrack%20Destek%20Talebi"
            className="btn btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-extrabold shadow-lg hover:shadow-xl transition-all"
          >
            <Mail size={16} /> Doğrudan E-Posta Gönder
          </a>
        </div>
      </div>
    </div>
  );
}
