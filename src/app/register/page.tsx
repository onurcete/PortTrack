"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User, LineChart } from "lucide-react";
import Link from "next/link";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setError(data.error || "Kayıt başarısız.");
      }
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <div className="card p-8">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white">
            <LineChart size={18} />
          </span>
          <span className="text-lg font-bold">PortTrack</span>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          Yeni bir portföy hesabı oluşturun.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Ad Soyad</label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input pl-9"
                placeholder="Adınız Soyadınız"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">E-posta</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="ornek@e-posta.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Şifre</label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-9"
                placeholder="En az 6 karakter"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-loss)] mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn btn-primary w-full mt-6"
        >
          {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
        </button>

        <p className="text-xs text-center text-[var(--color-muted)] mt-5">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="text-[var(--color-brand-strong)] hover:underline font-semibold">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
