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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isValidEmail = EMAIL_REGEX.test(email.trim());

  // Step 1: Send OTP Code to User's Email via Resend
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isValidEmail) {
      setError("Lütfen geçerli bir e-posta adresi girin (Örn: ad@domain.com).");
      return;
    }

    if (password.length < 6) {
      setError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStep("OTP");
        setInfo(`${email} adresinize 6 haneli doğrulama kodu gönderildi.`);
        startCountdown();
      } else {
        setError(data.error || "Doğrulama kodu gönderilemedi. Lütfen bilgilerinizi kontrol edin.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify 6-digit OTP Code and Complete Registration
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (otpCode.trim().length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu eksiksiz girin.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        const next = params.get("next") || "/";
        router.replace(next);
        router.refresh();
      } else {
        setError(data.error || "Doğrulama kodu hatalı veya süresi dolmuş.");
      }
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function startCountdown() {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[var(--color-brand)]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Left Side: Brand Showcase & Rich Features (Always Visible) */}
        <div className="col-span-12 md:col-span-6 p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-[var(--color-brand-strong)] via-indigo-950 to-slate-950 text-white flex flex-col justify-between relative overflow-hidden order-1">
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

          {/* Animated Glassmorphic Feature Dashboard Widget Showcase */}
          <div className="my-6 space-y-3.5 relative z-10">
            {/* Free Account Capabilities Card */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-extrabold text-indigo-200">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-cyan-400" /> Ücretsiz Hesabınız Neleri Kapsar?
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-white">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-black">✓</span> Sınırsız İşlem Takibi
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-black">✓</span> CSV Ekstre İçe Aktarımı
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-black">✓</span> TEFAS Akış Haritası
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <span className="text-emerald-400 font-black">✓</span> Performans Matrisleri
                </div>
              </div>
            </div>

            {/* Portfolio Growth Sparkline Preview Card */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 backdrop-blur-md">
              <div className="flex justify-between text-indigo-200 text-[10px] font-bold">
                <span>Örnek Toplam Portföy Büyüklüğü</span>
                <span className="text-emerald-400 font-black">+%840,98 Kazanç</span>
              </div>
              <div className="flex justify-between items-baseline text-white font-black">
                <span className="text-xl">3.192.206 ₺</span>
                <span className="text-indigo-200 text-xs font-semibold">$67.449 USD</span>
              </div>
              <div className="flex items-end gap-1.5 h-6 pt-1">
                {[30, 45, 60, 50, 75, 90, 80, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-400 rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
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

            {step === "FORM" ? (
              /* STEP 1: USER INFO FORM */
              <div>
                <div className="space-y-1.5 mb-6">
                  <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                    Yeni Hesabınızı Oluşturun
                  </h1>
                  <p className="text-xs text-[var(--color-muted)] font-medium">
                    Yatırımlarınızı profesyonelce izlemeye başlamak için bilgilerinizi girin.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
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

                  {/* Email Address Input & Live Format Check */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                        E-posta Adresi
                      </label>
                      {email.length > 0 && (
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 ${
                            isValidEmail ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isValidEmail ? "✓ Geçerli E-posta Formatı" : "⚠️ Geçersiz e-posta adresi"}
                        </span>
                      )}
                    </div>
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
                        className={`w-full rounded-xl border pl-10 pr-4 py-3 text-xs font-bold outline-none transition-all placeholder:font-medium bg-[var(--color-surface-muted)]/40 ${
                          email.length > 0
                            ? isValidEmail
                              ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                              : "border-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                            : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20"
                        }`}
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
                    disabled={loading || !email || !password || !isValidEmail}
                    className="btn btn-primary w-full py-3.5 text-xs font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? (
                      <span>Doğrulama Kodu Gönderiliyor...</span>
                    ) : (
                      <>
                        <span>E-Posta Doğrulama Kodu Gönder</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */
              <div>
                <div className="space-y-2 mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold">
                    <CheckCircle2 size={14} />
                    <span>E-Posta Onay Kodu Gönderildi</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                    Doğrulama Kodunu Girin
                  </h1>
                  <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                    <strong className="text-[var(--color-foreground)]">{email}</strong> adresinize 6 haneli bir doğrulama kodu gönderildi.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase text-[var(--color-muted)] tracking-wider">
                      6 Haneli Güvenlik Kodu
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full text-center tracking-[12px] font-mono font-black text-2xl py-3.5 rounded-2xl border border-[var(--color-brand)] bg-[var(--color-brand-soft)]/20 outline-none focus:ring-4 focus:ring-[var(--color-brand)]/20 transition-all text-[var(--color-brand-strong)]"
                      placeholder="123456"
                    />
                  </div>

                  {/* Info / Error Notification */}
                  {info && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                      📩 {info}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-extrabold flex items-center gap-2">
                      <span>⚠️ {error}</span>
                    </div>
                  )}

                  {/* Confirm OTP Button */}
                  <button
                    type="submit"
                    disabled={loading || otpCode.trim().length !== 6}
                    className="btn btn-primary w-full py-3.5 text-xs font-black rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>Doğrulanıyor...</span>
                    ) : (
                      <>
                        <span>Kodu Onayla ve Hesabımı Oluştur</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  {/* Resend & Back buttons */}
                  <div className="flex justify-between items-center text-xs font-bold pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode("");
                        setStep("FORM");
                      }}
                      className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
                    >
                      ← E-posta Adresini Değiştir
                    </button>

                    <button
                      type="button"
                      disabled={countdown > 0 || loading}
                      onClick={handleSendOtp}
                      className={`transition-colors ${
                        countdown > 0
                          ? "text-[var(--color-muted)] cursor-not-allowed"
                          : "text-[var(--color-brand-strong)] hover:underline"
                      }`}
                    >
                      {countdown > 0 ? `Tekrar Gönder (${countdown}s)` : "Kodu Tekrar Gönder"}
                    </button>
                  </div>
                </form>
              </div>
            )}
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
