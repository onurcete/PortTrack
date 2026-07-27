"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const next = params.get("next") || "/";
        router.replace(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  const [activeImg, setActiveImg] = useState<{ src: string; title: string; desc: string }>({
    src: "/api/showcase/dashboard-overview.jpg",
    title: "PortTrack Canlı Dashboard",
    desc: "3.192.206 ₺ Toplam Varlık, MTD +%3,25, YTD +%53,75",
  });

  const screenshots = [
    {
      src: "/api/showcase/dashboard-overview.jpg",
      title: "PortTrack Canlı Dashboard",
      desc: "3.192.206 ₺ Toplam Varlık, MTD +%3,25, YTD +%53,75",
      label: "Genel Bakış",
    },
    {
      src: "/api/showcase/growth-matrix.jpg",
      title: "Ay Ay Büyüme Matrisi",
      desc: "2021-2026 Toplam +%6.850,61 ₺ Kazanç Büyüme Performansı",
      label: "Büyüme Matrisi",
    },
    {
      src: "/api/showcase/performance-heatmap.jpg",
      title: "Performans Sıcaklık Haritası",
      desc: "Varlık bazında kâr/zarar ve ay ay getiri dağılımları",
      label: "Sıcaklık Haritası",
    },
    {
      src: "/api/showcase/asset-scores.jpg",
      title: "Varlık Sağlık Skorları",
      desc: "0-100 kural tabanlı teknik analiz ve momentum puanlaması",
      label: "Sağlık Skorları",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[var(--color-brand)]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Side: Brand Showcase & Rich Application Mockups (Always Visible) */}
        <div className="col-span-12 md:col-span-6 p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-[var(--color-brand-strong)] via-indigo-950 to-slate-950 text-white flex flex-col justify-between relative overflow-hidden order-1">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--color-brand)]/25 rounded-full blur-2xl pointer-events-none" />

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
              <h2 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight">
                Finansal Yatırımlarınızı Profesyonelce Yönetin.
              </h2>
              <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                BIST, TEFAS fonları, Yabancı borsalar, Kripto, Döviz ve BES birikimlerinizin tamamını anlık takip edin.
              </p>
            </div>
          </div>

          {/* Real Application Screenshot Image Gallery with Interactive Tabs */}
          <div className="my-6 space-y-3 relative z-10">
            {/* Main Active Screenshot Image Preview */}
            <div className="relative group rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/40">
              {/* eslint-disable-next-html-extension / next-image */}
              <img
                src={activeImg.src}
                alt={activeImg.title}
                className="w-full h-48 sm:h-56 object-cover object-top rounded-2xl transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-400" /> {activeImg.title}
                  </div>
                  <div className="text-[10px] text-indigo-200 font-medium">
                    {activeImg.desc}
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Gallery Switches */}
            <div className="grid grid-cols-4 gap-1.5">
              {screenshots.map((s) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => setActiveImg(s)}
                  className={`rounded-xl overflow-hidden border transition-all text-left group relative ${
                    activeImg.src === s.src
                      ? "border-emerald-400 ring-2 ring-emerald-400/40 opacity-100 scale-105"
                      : "border-white/15 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={s.src}
                    alt={s.label}
                    className="w-full h-12 object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-0.5 text-[9px] font-black text-white text-center">
                    {s.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="space-y-2 text-xs text-indigo-100 font-medium relative z-10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>Ay Ay & Yıl Yıl Büyüme Matrisleri</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-amber-400 shrink-0" />
              <span>TEFAS Yatırımcı Katılım & Ayrılış Akışları</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-cyan-400 shrink-0" />
              <span>Tek Tıkla CSV Borsa Ekstre Yükleme</span>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-5 border-t border-white/10 text-[10px] text-indigo-300/70 font-semibold flex justify-between items-center relative z-10 mt-4">
            <span>© 2026 PortTrack. Güvenli Giriş.</span>
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1 font-extrabold">
              <ArrowLeft size={12} /> Ana Sayfa
            </Link>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="col-span-12 md:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between order-2">
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
                Portföyünüze Giriş Yapın
              </h1>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                E-posta ve şifreniz ile güvenli hesabınıza erişin.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-5">
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
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium"
                    placeholder="ornek@e-posta.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                    Şifre
                  </label>
                </div>
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
                    placeholder="••••••••"
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
                className="btn btn-primary w-full py-3.5 text-xs font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Giriş Yapılıyor...</span>
                ) : (
                  <>
                    <span>Portföy Paneline Giriş Yap</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Register Link */}
          <div className="pt-8 border-t border-[var(--color-border)]/40 text-center text-xs font-medium text-[var(--color-muted)] mt-6">
            Henüz PortTrack hesabınız yok mu?{" "}
            <Link
              href="/register"
              className="text-[var(--color-brand-strong)] hover:underline font-extrabold ml-1"
            >
              Ücretsiz Kayıt Olun
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
