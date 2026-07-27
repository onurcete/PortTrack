"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        const next = params.get("next") || "/";
        router.replace(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[var(--color-brand)]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Side: Brand Showcase & Rich Features */}
        <div className="hidden md:flex md:col-span-6 p-8 lg:p-12 bg-gradient-to-br from-[var(--color-brand-strong)] via-indigo-950 to-slate-950 text-white flex-col justify-between relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Logo & Back link */}
          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-brand-strong)] font-black text-base shadow-md group-hover:scale-105 transition-transform">
                  PT
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tight text-white leading-none">
                    PortTrack
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 mt-0.5">
                    Portföy Takip & Analiz
                  </span>
                </div>
              </Link>
            </div>

            {/* Headline */}
            <div className="space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/15 text-[11px] font-extrabold">
                <Sparkles size={13} />
                <span>%100 Ücretsiz Portföy Hesabı</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight">
                Saniyeler İçinde Hesabınızı Oluşturun.
              </h2>
              <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                Tüm yatırımlarınızı tek bir güvenli panelde bir araya getirin. Kredi kartı gerekmez.
              </p>
            </div>
          </div>

          {/* Real Application Screenshot Gallery */}
          <div className="my-6 space-y-3 relative z-10">
            {/* Main Screenshot Image Preview */}
            <div className="relative group rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/40">
              <img
                src="/showcase/growth-matrix.jpg"
                alt="Aylık ve Yıllık Büyüme Matrisi"
                className="w-full h-48 sm:h-56 object-cover object-top rounded-2xl transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-400" /> Ay Ay Performans Matrisi
                  </div>
                  <div className="text-[10px] text-indigo-200 font-medium">
                    2021-2026 Toplam +%6.850,61 ₺ Kazanç Büyüme Performansı
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Screenshot Gallery Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl overflow-hidden border border-white/15 shadow-md bg-black/30 group">
                <img
                  src="/showcase/dashboard-overview.jpg"
                  alt="PortTakip Dashboard"
                  className="w-full h-14 object-cover object-top transition-transform group-hover:scale-110"
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/15 shadow-md bg-black/30 group">
                <img
                  src="/showcase/performance-heatmap.jpg"
                  alt="Performans Sıcaklık Haritası"
                  className="w-full h-14 object-cover object-top transition-transform group-hover:scale-110"
                />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/15 shadow-md bg-black/30 group">
                <img
                  src="/showcase/tefas-flows.jpg"
                  alt="TEFAS Katılım Akışları"
                  className="w-full h-14 object-cover object-top transition-transform group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="space-y-2 text-xs text-indigo-100 font-medium relative z-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Gelişmiş ₺ / $ Çoklu Para Birimi Desteği</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-amber-400 shrink-0" />
              <span>Yapay Zekâ Analiz Asistanı Erişimi</span>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-5 border-t border-white/10 text-[10px] text-indigo-300/70 font-semibold flex justify-between items-center relative z-10 mt-4">
            <span>© 2026 PortTrack. Ücretsiz Kayıt.</span>
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1 font-extrabold">
              <ArrowLeft size={12} /> Ana Sayfa
            </Link>
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="md:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between mb-6 pb-4 border-b border-[var(--color-border)]/40">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white font-black text-xs">
                  PT
                </div>
                <span className="font-black text-base">PortTrack</span>
              </Link>
              <Link href="/" className="text-xs font-bold text-[var(--color-brand-strong)] flex items-center gap-1">
                <ArrowLeft size={12} /> Ana Sayfa
              </Link>
            </div>

            {/* Form Title */}
            <div className="space-y-1.5 mb-8">
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                Yeni Hesabınızı Oluşturun
              </h1>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                Yatırımlarınızı profesyonelce izlemeye başlamak için kaydolun.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium"
                    placeholder="Adınız Soyadınız"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium"
                    placeholder="ornek@e-posta.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                  Şifre
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-10 pr-10 py-3 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium"
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-extrabold flex items-center gap-2">
                  <span>⚠️ {error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn btn-primary w-full py-3.5 text-xs font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>Hesap Oluşturuluyor...</span>
                ) : (
                  <>
                    <span>Ücretsiz Hesabımı Oluştur</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Login Link */}
          <div className="pt-8 border-t border-[var(--color-border)]/40 text-center text-xs font-medium text-[var(--color-muted)] mt-6">
            Zaten bir PortTrack hesabınız var mı?{" "}
            <Link
              href="/login"
              className="text-[var(--color-brand-strong)] hover:underline font-extrabold ml-1"
            >
              Giriş Yapın
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
