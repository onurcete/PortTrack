import React from "react";

interface PortTrackLogoProps {
  size?: number;
  variant?: "icon" | "horizontal" | "vertical";
  showTagline?: boolean;
  className?: string;
}

export function PortTrackLogo({
  size = 36,
  variant = "horizontal",
  showTagline = false,
  className = "",
}: PortTrackLogoProps) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm"
    >
      <defs>
        <linearGradient id="webPMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="webBar1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="webBar2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="webBar3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      {/* P Harfi Dış Gövdesi & Üst Kavis */}
      <path
        d="M 42 12
           L 68 12
           C 85 12, 94 22, 94 38
           C 94 54, 84 64, 68 64
           L 54 64
           L 54 48
           L 66 48
           C 74 48, 79 43, 79 38
           C 79 32, 74 27, 66 27
           L 42 27
           C 30 27, 20 37, 20 50
           L 20 62
           C 20 40, 29 25, 42 12 Z"
        fill="url(#webPMainGrad)"
      />

      {/* 1. Bar: Sol Kısa Çubuk */}
      <path
        d="M 22 88
           C 22 75, 27 65, 33 55
           L 38 55
           C 34 65, 31 75, 31 88
           Z"
        fill="url(#webBar1Grad)"
      />

      {/* 2. Bar: Orta Çubuk */}
      <rect
        x="42"
        y="42"
        width="9"
        height="46"
        rx="4.5"
        fill="url(#webBar2Grad)"
      />

      {/* 3. Bar: Sağ Uzun Çubuk */}
      <rect
        x="56"
        y="25"
        width="10"
        height="63"
        rx="5"
        fill="url(#webBar3Grad)"
      />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{icon}</div>;
  }

  if (variant === "horizontal") {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {icon}
        <div className="flex flex-col">
          <div className="flex items-center text-lg font-black tracking-tight leading-none">
            <span className="text-[var(--color-foreground)]">Port</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Track
            </span>
          </div>
          {showTagline && (
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-muted)] mt-0.5">
              Yatırım Takip Platformu
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="mb-2">{icon}</div>
      <div className="flex items-center text-2xl font-black tracking-tight leading-none">
        <span className="text-[var(--color-foreground)]">Port</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Track
        </span>
      </div>
      {showTagline && (
        <span className="text-xs font-semibold text-[var(--color-muted)] mt-1.5">
          Yatırım Takip Platformu
        </span>
      )}
    </div>
  );
}
