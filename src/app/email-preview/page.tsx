"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Smartphone, Monitor, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

export default function EmailPreviewPage() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [sentSuccess, setSentSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
            <ArrowLeft size={14} /> Ana Sayfa
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Mail size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white leading-none">
                Haftalık Portföy Özet E-Postası Şablonu
              </h1>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-1">
                Her Pazartesi Sabahı Kullanıcılara Gönderilecek Otomatik E-posta Ön İzlemesi
              </p>
            </div>
          </div>
        </div>

        {/* Action & Device Toggle Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === "desktop"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor size={14} /> Masaüstü
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === "mobile"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone size={14} /> Mobil
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSentSuccess(true);
              setTimeout(() => setSentSuccess(false), 4000);
            }}
            className="btn btn-primary py-2 px-4 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
          >
            {sentSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Test Maili Gönderildi!</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Test Maili Gönder</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Email Preview Frame */}
      <main className="flex-1 p-6 flex justify-center items-start overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950">
        <div
          className={`transition-all duration-300 ${
            device === "mobile" ? "w-[395px]" : "w-full max-w-[700px]"
          }`}
        >
          {/* Email Client Header Bar Mockup */}
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold text-slate-200">Konu:</span>
              <span className="text-white font-bold truncate">
                🚀 Geçen Hafta Portföyünüz %3,4 Büyüdü! | PortTrack Haftalık Özet
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              Pazartesi 08:00
            </span>
          </div>

          {/* Iframe rendering raw HTML email */}
          <div className="border-x border-b border-slate-800 rounded-b-2xl overflow-hidden shadow-2xl bg-[#090d16]">
            <iframe
              src="/api/email/preview"
              className="w-full min-h-[850px] border-none"
              title="PortTrack E-posta Ön İzlemesi"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
