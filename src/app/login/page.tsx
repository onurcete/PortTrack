"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LineChart } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = params.get("next") || "/";
        router.replace(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Giriş başarısız.");
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
          Devam etmek için şifrenizi girin.
        </p>

        <label className="block text-sm font-medium mb-1.5">Şifre</label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pl-9"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-loss)] mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn btn-primary w-full mt-5"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
