"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Palette,
  DollarSign,
  Bell,
  Check,
  Sparkles,
  Save,
  RefreshCw,
  Mail,
  ShieldCheck,
  Moon,
  Sun,
  AlertCircle,
} from "lucide-react";
import { useCurrency } from "@/context/currency";
import { cn } from "@/lib/utils";

type ThemeId = "dark" | "light" | "solarized" | "harbor";

interface ThemeOption {
  id: ThemeId;
  label: string;
  sublabel: string;
  description: string;
  colors: [string, string, string];
  isDark: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    label: "Koyu Gece",
    sublabel: "Gece İndigosu",
    description: "Gözü yormayan koyu arka plan ve canlı mor-yeşil vurgular.",
    colors: ["#090d16", "#6366f1", "#22c55e"],
    isDark: true,
  },
  {
    id: "light",
    label: "Açık Indigo",
    sublabel: "Modern Aydınlık",
    description: "Ferah, yüksek kontrastlı ve temiz aydınlık görünüm.",
    colors: ["#f7f8fc", "#6366f1", "#16a34a"],
    isDark: false,
  },
  {
    id: "solarized",
    label: "Solarized Light",
    sublabel: "Sıcak & Göz Dostu",
    description: "Uzun süreli kullanım için geliştirilmiş sıcak pastel tonlar.",
    colors: ["#eee8d5", "#268bd2", "#859900"],
    isDark: false,
  },
  {
    id: "harbor",
    label: "Harbor Gold",
    sublabel: "Lacivert & Altın",
    description: "Krem zemin üzerine marin laciverti ve sıcak altın sarısı.",
    colors: ["#EFD2B0", "#1A3263", "#FFC570"],
    isDark: false,
  },
];

function applyThemeToDOM(theme: ThemeId) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function SettingsClient() {
  const { currency, setCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // User Settings State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const [isDemo, setIsDemo] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("dark");
  const [defaultCurrency, setDefaultCurrencyState] = useState<"TRY" | "USD">("TRY");
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);

  // Load initial settings
  useEffect(() => {
    // Sync theme from localStorage first
    const savedTheme = localStorage.getItem("theme") as ThemeId;
    if (THEME_OPTIONS.some((t) => t.id === savedTheme)) {
      setTheme(savedTheme);
      applyThemeToDOM(savedTheme);
    }

    // Sync currency from context
    setDefaultCurrencyState(currency);

    // Fetch user settings from API
    fetch("/api/user/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
          setName(s.name || "");
          setEmail(s.email || "");
          setRole(s.role || "USER");
          setIsDemo(Boolean(s.isDemo));

          if (s.theme && THEME_OPTIONS.some((t) => t.id === s.theme)) {
            setTheme(s.theme as ThemeId);
            applyThemeToDOM(s.theme as ThemeId);
            localStorage.setItem("theme", s.theme);
          }

          if (s.defaultCurrency === "TRY" || s.defaultCurrency === "USD") {
            setDefaultCurrencyState(s.defaultCurrency);
            setCurrency(s.defaultCurrency);
          }

          setDailyDigestEnabled(Boolean(s.dailyDigestEnabled));
        }
      })
      .catch((err) => {
        console.error("Ayarlar yüklenirken hata oluştu:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleThemeChange = (nextTheme: ThemeId) => {
    setTheme(nextTheme);
    applyThemeToDOM(nextTheme);
    localStorage.setItem("theme", nextTheme);
    window.dispatchEvent(new CustomEvent("porttrack:theme-changed", { detail: nextTheme }));

    // Persist to server asynchronously
    saveSettingsToServer({ theme: nextTheme });
  };

  const handleCurrencyChange = (nextCurrency: "TRY" | "USD") => {
    setDefaultCurrencyState(nextCurrency);
    setCurrency(nextCurrency);

    // Persist to server asynchronously
    saveSettingsToServer({ defaultCurrency: nextCurrency });
  };

  const saveSettingsToServer = async (overrideParams?: Record<string, unknown>) => {
    setSaving(true);
    setToast(null);

    const payload = {
      name,
      theme,
      defaultCurrency,
      dailyDigestEnabled,
      ...overrideParams,
    };

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Ayarlarınız başarıyla kaydedildi.", "success");
      } else {
        showToast(data.error || "Ayarlar kaydedilemedi.", "error");
      }
    } catch {
      showToast("Bağlantı hatası oluştu.", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--color-muted)]">
          <RefreshCw size={28} className="animate-spin text-[var(--color-brand)]" />
          <p className="text-sm font-medium">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-3 py-6 sm:px-6 md:py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 border animate-in fade-in slide-in-from-bottom-4",
            toast.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
          )}
        >
          {toast.type === "success" ? (
            <Check size={20} className="shrink-0" />
          ) : (
            <AlertCircle size={20} className="shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Sayfa Başlığı ve Kullanıcı Kartı Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 shadow-sm">
        {/* Arka plan süsleme ışığı */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-brand)]/10 blur-3xl" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Settings size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
                  Ayarlar
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-brand-strong)]">
                  <Sparkles size={12} /> Tercihler
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)] sm:text-sm">
                Tema, varsayılan para birimi, e-posta bülteni ve hesap tercihlerinizi yönetin.
              </p>
            </div>
          </div>

          {/* Profil Özeti Rozeti */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white font-bold text-base shadow-xs">
              {name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--color-foreground)] truncate max-w-[180px]">
                {name || "Kullanıcı"}
              </p>
              <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[180px]">
                {email}
              </p>
            </div>
            <div className="ml-auto pl-2 border-l border-[var(--color-border)]">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase",
                  role === "ADMIN"
                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                    : isDemo
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                )}
              >
                <ShieldCheck size={11} /> {role === "ADMIN" ? "Yönetici" : isDemo ? "Demo" : "Standart"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Düzeni: Sol ve Sağ Sütunlar */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sol Sütun (2 Birim): Tema, Para Birimi & Bildirimler */}
        <div className="space-y-8 lg:col-span-2">
          {/* 1. TEMA VE GÖRÜNÜM SEÇİMİ */}
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  Görünüm & Tema Seçimi
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  Uygulama renk paletini ve modunu anında özelleştirin.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {THEME_OPTIONS.map((item) => {
                const active = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleThemeChange(item.id)}
                    className={cn(
                      "relative flex flex-col justify-between text-left rounded-2xl border p-4 transition-all duration-200 group hover:shadow-md",
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/30 ring-2 ring-[var(--color-brand)]/20"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-brand)]/50"
                    )}
                  >
                    <div>
                      {/* Üst Renk Paleti Önizleme Çubuğu */}
                      <div className="flex h-10 w-full overflow-hidden rounded-xl border border-black/10 shadow-xs mb-3">
                        {item.colors.map((c, i) => (
                          <div
                            key={i}
                            className="h-full flex-1"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                          {item.isDark ? <Moon size={14} /> : <Sun size={14} />}
                          {item.label}
                        </span>
                        {active && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--color-brand-strong)]">
                        {item.sublabel}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between text-[10px] text-[var(--color-muted)] font-semibold">
                      <span>{item.isDark ? "Koyu Mod" : "Aydınlık Mod"}</span>
                      {active && <span className="text-[var(--color-brand-strong)]">Aktif Tema</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. VARSAYILAN PARA BİRİMİ SEÇİMİ */}
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-foreground)]">
                    Varsayılan Para Birimi Gösterimi
                  </h2>
                  <p className="text-xs text-[var(--color-muted)]">
                    Portföy toplam tutarlarının gösterileceği varsayılan para birimini belirleyin.
                  </p>
                </div>
              </div>

              {/* Canlı sync uyarısı */}
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] px-2.5 py-1 rounded-xl">
                Üst bar ile senkronize
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* TRY Kartı */}
              <button
                type="button"
                onClick={() => handleCurrencyChange("TRY")}
                className={cn(
                  "relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md",
                  defaultCurrency === "TRY"
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/30 ring-2 ring-[var(--color-brand)]/20"
                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-brand)]/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl font-black text-lg shadow-xs",
                      defaultCurrency === "TRY"
                        ? "bg-[var(--color-brand)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)]"
                    )}
                  >
                    ₺
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-foreground)]">
                      Türk Lirası (TRY)
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Yerel para birimi ile portföy takibi (₺)
                    </p>
                  </div>
                </div>
                {defaultCurrency === "TRY" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shrink-0">
                    <Check size={12} />
                  </span>
                )}
              </button>

              {/* USD Kartı */}
              <button
                type="button"
                onClick={() => handleCurrencyChange("USD")}
                className={cn(
                  "relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md",
                  defaultCurrency === "USD"
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/30 ring-2 ring-[var(--color-brand)]/20"
                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-brand)]/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl font-black text-lg shadow-xs",
                      defaultCurrency === "USD"
                        ? "bg-[var(--color-brand)] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-foreground)] border border-[var(--color-border)]"
                    )}
                  >
                    $
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-foreground)]">
                      Amerikan Doları (USD)
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      Dolar bazlı portföy ve kazanç takibi ($)
                    </p>
                  </div>
                </div>
                {defaultCurrency === "USD" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shrink-0">
                    <Check size={12} />
                  </span>
                )}
              </button>
            </div>
            
            <p className="mt-4 text-[11px] text-[var(--color-muted)] bg-[var(--color-surface-muted)] p-3 rounded-xl border border-[var(--color-border)]">
              💡 <strong>İpucu:</strong> Ekranınızın sağ üst köşesinde (mobilde menüde) yer alan Dolar/TL butonu ile dilediğiniz an tek tıkla görünüm para birimini değiştirebilirsiniz.
            </p>
          </section>

          {/* 3. MAIL BÜLTEN & BİLDİRİM TERCİHLERİ */}
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">
                  E-Posta Bildirim Tercihleri
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  Almak istediğiniz günlük e-posta özeti bildirimlerini buradan yönetin.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Günlük Portföy Özeti Switch */}
              <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 transition-colors">
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] mt-0.5">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--color-foreground)]">
                        Günlük Portföy Özeti (Daily Digest)
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          dailyDigestEnabled
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-gray-500/15 text-gray-500"
                        )}
                      >
                        {dailyDigestEnabled ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                      Borsa ve piyasa kapanışının ardından günlük portföy değerinizi, kar/zarar özetinizi e-posta ile alın. Varsayılan olarak pasiftir; sadece aktif eden kullanıcılara gönderilir.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={dailyDigestEnabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setDailyDigestEnabled(val);
                      saveSettingsToServer({ dailyDigestEnabled: val });
                    }}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-[var(--color-brand)] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Sağ Sütun (1 Birim): Kullanıcı Profil Kartı & Kaydetme Formu */}
        <div className="space-y-8">
          {/* PROFİL & HESAP BİLGİLERİ */}
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-foreground)]">
                    Profil Bilgileri
                  </h2>
                  <p className="text-xs text-[var(--color-muted)]">
                    Kullanıcı bilgilerinizi düzenleyin.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSettingsToServer();
                }}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand)] focus:outline-hidden transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                    E-Posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3.5 py-2.5 text-sm font-medium text-[var(--color-muted)] cursor-not-allowed"
                  />
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    E-posta adresi hesap güvenliği nedeniyle değiştirilemez.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-foreground)] mb-1.5">
                    Hesap Türü
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-foreground)]">
                    <span>{role === "ADMIN" ? "Yönetici Hesabı" : isDemo ? "Demo Hesabı" : "Standart Kullanıcı"}</span>
                    <ShieldCheck size={16} className="text-[var(--color-brand-strong)]" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full btn btn-primary py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-150"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{saving ? "Kaydediliyor..." : "Tüm Değişiklikleri Kaydet"}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--color-border)] text-center">
              <p className="text-[11px] text-[var(--color-muted)]">
                PortTrack v1.0 • Tüm tercihler veritabanında güvenle saklanır.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
