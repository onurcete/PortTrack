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
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

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

          {/* Animated Glassmorphic Feature Dashboard Widget Showcase */}
          <div className="my-6 space-y-3.5 relative z-10">
            {/* Live Portfolio Value Summary Widget */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-indigo-200 font-extrabold flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Canlı Portföy Varlığı
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/30">
                  +%840,98 Toplam
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-2xl lg:text-3xl font-black tabular-nums tracking-tight text-white">
                    3.192.206 ₺
                  </div>
                  <div className="text-[11px] text-indigo-200 font-semibold">$67.449 USD</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-400">+100.530 ₺</div>
                  <div className="text-[10px] text-indigo-200">Bu Ay (MTD +%3,25)</div>
                </div>
              </div>

              {/* Sparkline Graphic Bars */}
              <div className="flex items-end gap-1.5 h-7 pt-1">
                {[40, 55, 35, 65, 80, 70, 90, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-emerald-500/30 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Asset Performance Grid Badges */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              {/* Asset 1: TEFAS Fonu */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-md">
                <div className="flex justify-between items-center text-indigo-200 text-[10px]">
                  <span>PHE (TEFAS)</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[9px]">88 Skor</span>
                </div>
                <div className="flex justify-between text-white font-black">
                  <span>498.250 ₺</span>
                  <span className="text-emerald-400">+%15,6</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[88%]" />
                </div>
              </div>

              {/* Asset 2: Yabancı Borsa Hissesi */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-md">
                <div className="flex justify-between items-center text-indigo-200 text-[10px]">
                  <span>INTC (Borsa)</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-black text-[9px]">+103,5%</span>
                </div>
                <div className="flex justify-between text-white font-black">
                  <span>143.200 ₺</span>
                  <span className="text-cyan-400">RSI &lt; 30</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[76%]" />
                </div>
              </div>
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
            <div className="space-y-1.5 mb-6">
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                Portföyünüze Giriş Yapın
              </h1>
              <p className="text-xs text-[var(--color-muted)] font-medium">
                Google, Apple veya e-posta/şifreniz ile güvenli erişin.
              </p>
            </div>

            {/* Sosyal Giriş Butonları (Google & Apple) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              <a
                href="/api/auth/google"
                onClick={() => {
                  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
                    (window as any).gtag("event", "google_auth_click", {
                      event_category: "Authentication",
                      button_location: "login_page",
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-black text-[var(--color-foreground)] transition-all shadow-xs hover:shadow-md cursor-pointer group"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </a>

              <a
                href="/api/auth/apple"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-neutral-700/60 bg-black text-white hover:bg-neutral-900 text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer group"
              >
                <svg className="w-4 h-4 shrink-0 fill-current transition-transform group-hover:scale-110" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.71-14.43-6.53-10.45-11.53-22.18-15-35.18-3.48-13-5.22-25.26-5.22-36.8 0-14.36 3.37-26.4 10.12-36.12 6.75-9.72 15.34-14.68 25.79-14.89 4.35 0 9.28 1.16 14.8 3.49 5.51 2.33 9.4 3.55 11.66 3.66 1.74-.11 5.76-1.38 12.06-3.81 6.3-2.44 11.39-3.55 15.26-3.35 14.14.76 25.13 5.99 32.99 15.69-12.39 7.51-18.47 17.52-18.26 30.04.22 9.79 3.96 17.9 11.22 24.32 7.26 6.42 15.77 10.12 25.53 11.1-2.28 6.96-5.06 14.03-8.33 21.21zM119.22 31.84c0-7.72 2.77-14.97 8.32-21.75 5.55-6.78 12.44-10.74 20.67-11.89.22 1.09.33 2.17.33 3.26 0 7.61-2.88 14.89-8.65 21.85-5.76 6.96-12.72 10.87-20.89 11.74-.22-1.09-.33-2.18-.33-3.21z" />
                </svg>
                <span>Apple</span>
              </a>
            </div>

            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-[var(--color-border)]/60 w-full" />
              <span className="bg-[var(--color-surface)] px-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] absolute">
                Veya E-Posta İle
              </span>
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
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[11px] font-bold text-[var(--color-brand-strong)] hover:underline cursor-pointer"
                  >
                    Şifremi Unuttum?
                  </button>
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
                onClick={() => {
                  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
                    (window as any).gtag("event", "login_click", {
                      event_category: "Authentication",
                      button_location: "login_page"
                    });
                  }
                }}
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

            {/* Demo Button */}
            <div className="relative flex items-center gap-3 my-4">
              <span className="flex-1 h-px bg-[var(--color-border)]/60" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-muted)]">veya</span>
              <span className="flex-1 h-px bg-[var(--color-border)]/60" />
            </div>
            <a
              href="/api/auth/demo"
              onClick={() => {
                if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
                  (window as any).gtag("event", "demo_click", {
                    event_category: "Engagement",
                    event_label: "login_page",
                    button_location: "login_page",
                  });
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-extrabold px-6 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-brand)]/40 text-[var(--color-foreground)] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm"
            >
              <Zap size={14} className="text-[var(--color-brand)]" />
              Hesap Oluşturmadan Demo'yu Dene
            </a>
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

      {/* Şifremi Unuttum Modalı */}
      {forgotModalOpen && (
        <ForgotPasswordModal
          initialEmail={email}
          onClose={() => setForgotModalOpen(false)}
        />
      )}
    </div>
  );
}

function ForgotPasswordModal({
  initialEmail,
  onClose,
}: {
  initialEmail: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [resetEmail, setResetEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGoogle, setHasGoogle] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // 1. Adım: Kod Gönder
  async function handleSendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Lütfen e-posta adresinizi giriniz.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setHasGoogle(!!data.hasGoogle);
        setStep("code");
        setResendTimer(60);
        const timer = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "Şifre sıfırlama kodu gönderilemedi.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Adım: Kodu Doğrula ve Şifreyi Güncelle
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || code.trim().length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu giriniz.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Girdiğiniz şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStep("success");
        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Şifre güncellenemedi.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-bold">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-black text-base text-[var(--color-foreground)]">
                Şifremi Sıfırla
              </h3>
              <p className="text-[11px] text-[var(--color-muted)] font-medium">
                {step === "email"
                  ? "Kayıtlı e-posta adresinize kod gönderin"
                  : step === "code"
                  ? "Doğrulama kodu ve yeni şifrenizi girin"
                  : "İşlem tamamlandı"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Adım 1: E-Posta ile Kod İsteme */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                E-posta Adresiniz
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
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
                  placeholder="ornek@e-posta.com"
                />
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Hesabınıza bağlı e-posta adresine 6 haneli tek kullanımlık güvenlik kodu göndereceğiz.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-extrabold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !resetEmail}
              className="btn btn-primary w-full py-3 text-xs font-black rounded-xl shadow-md cursor-pointer"
            >
              {loading ? "Kod Gönderiliyor..." : "Doğrulama Kodu Gönder"}
            </button>
          </form>
        )}

        {/* Adım 2: Kodu ve Yeni Şifreyi Girme */}
        {step === "code" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Bilgilendirme ve E-posta Değiştir Butonu */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/50 text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-[var(--color-muted)] block font-bold">Kod Gönderilen E-posta:</span>
                <span className="font-extrabold text-[var(--color-foreground)] truncate">{resetEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-[11px] font-bold text-[var(--color-brand-strong)] hover:underline shrink-0 cursor-pointer"
              >
                Değiştir
              </button>
            </div>

            {/* Google ile Bağlı Hesap Hatırlatması */}
            {hasGoogle && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-medium space-y-1">
                <p className="font-extrabold">💡 Google ile Bağlı Hesap</p>
                <p className="text-[11px] text-[var(--color-foreground)]/80">
                  Bu hesaba Google ile de giriş yapabilirsiniz veya aşağıdan doğrudan yeni bir şifre belirleyebilirsiniz.
                </p>
              </div>
            )}

            {/* 6 Haneli Kod */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                6 Haneli Güvenlik Kodu
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center text-xl tracking-[0.4em] font-black rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 py-2.5 outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all font-mono"
                placeholder="123456"
              />
            </div>

            {/* Yeni Şifre */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 pl-3.5 pr-10 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
                  placeholder="En az 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Yeni Şifre Tekrarı */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                Yeni Şifre Tekrarı
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all"
                placeholder="Yeni şifrenizi tekrar girin"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-extrabold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6 || !newPassword || !confirmPassword}
              className="btn btn-primary w-full py-3 text-xs font-black rounded-xl shadow-md cursor-pointer"
            >
              {loading ? "Şifre Güncelleniyor..." : "Şifreyi Güncelle ve Giriş Yap"}
            </button>

            {/* Tekrar Kod Gönder */}
            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={() => handleSendCode()}
                className={cn(
                  "text-[11px] font-bold transition-colors cursor-pointer",
                  resendTimer > 0
                    ? "text-[var(--color-muted)] cursor-not-allowed"
                    : "text-[var(--color-brand-strong)] hover:underline"
                )}
              >
                {resendTimer > 0
                  ? `Kodu tekrar gönder (${resendTimer}s)`
                  : "Yeni Kod Gönder"}
              </button>
            </div>
          </form>
        )}

        {/* Adım 3: Başarılı Ekranı */}
        {step === "success" && (
          <div className="py-6 text-center space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 mb-1">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-black text-[var(--color-foreground)]">
              Şifreniz Başarıyla Güncellendi!
            </h4>
            <p className="text-xs text-[var(--color-muted)]">
              Oturumunuz açıldı. Portföy panelinize yönlendiriliyorsunuz...
            </p>
          </div>
        )}
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
