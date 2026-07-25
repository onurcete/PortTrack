"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, FileWarning } from "lucide-react";
import { ASSET_META, ASSET_TYPES, type AssetType } from "@/lib/assets";
import type { CsvImportPreview as CsvImportPreviewDTO } from "@/lib/csv";
import { Badge } from "./ui";

export type CsvImportMode = "replace" | "append";

interface CsvImportPreviewProps {
  preview: CsvImportPreviewDTO;
  currentTransactionCount: number;
  mode: CsvImportMode;
  overrides: Record<number, AssetType>;
  importing: boolean;
  error: string | null;
  onModeChange: (mode: CsvImportMode) => void;
  onOverrideChange: (lineNo: number, assetType: AssetType) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function CsvImportPreview({
  preview,
  currentTransactionCount,
  mode,
  overrides,
  importing,
  error,
  onModeChange,
  onOverrideChange,
  onBack,
  onConfirm,
}: CsvImportPreviewProps) {
  const canConfirm =
    preview.validRows > 0 &&
    preview.unresolved.every((row) => Boolean(overrides[row.lineNo])) &&
    !importing;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Toplam satır" value={preview.totalRows} />
        <SummaryCard label="Geçerli" value={preview.validRows} tone="good" />
        <SummaryCard label="Hatalı" value={preview.invalidRows} tone="bad" />
        <SummaryCard
          label="Doğrulama"
          value={preview.requiresReview}
          tone={preview.requiresReview ? "warn" : "good"}
        />
      </div>

      <section>
        <p className="mb-2 text-xs font-semibold text-[var(--color-muted)]">
          Algılanan varlık türleri
        </p>
        <div className="flex flex-wrap gap-2">
          {preview.distribution.map(({ assetType, count }) => (
            <Badge key={assetType} color={ASSET_META[assetType].color}>
              {ASSET_META[assetType].label}: {count}
            </Badge>
          ))}
          {preview.distribution.length === 0 && (
            <span className="text-sm text-[var(--color-muted)]">
              Geçerli satır bulunamadı.
            </span>
          )}
        </div>
      </section>

      {preview.requiresReview > 0 && (
        <section className="rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-3.5">
          <div className="mb-3 flex gap-2 text-[var(--color-brand-strong)]">
            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
            <div className="text-xs">
              <p className="font-bold">Tür doğrulaması gerekli</p>
              <p className="mt-0.5">
                Bu satırlar için sistem güvenilir bir varlık türü belirleyemedi.
                Devam etmek için her satırı seçin.
              </p>
            </div>
          </div>
          <div className="max-h-48 overflow-auto rounded-lg border border-[var(--color-brand)]/20 bg-[var(--color-surface)]">
            {preview.unresolved.map((row) => (
              <div
                key={row.lineNo}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--color-border)] px-3 py-2.5 last:border-0"
              >
                <span className="text-xs font-bold text-[var(--color-muted)]">
                  #{row.lineNo}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.symbol}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    Tür: {row.rawType || "boş"} · {row.reason}
                  </p>
                </div>
                <select
                  value={overrides[row.lineNo] ?? ""}
                  onChange={(event) =>
                    onOverrideChange(
                      row.lineNo,
                      event.target.value as AssetType,
                    )
                  }
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-semibold outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="">Tür seçin</option>
                  {ASSET_TYPES.map((assetType) => (
                    <option key={assetType} value={assetType}>
                      {ASSET_META[assetType].label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold text-[var(--color-muted)]">
          Tür bazlı örnekler
        </p>
        <div className="max-h-48 overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-left text-xs">
            <thead className="theme-table-head sticky top-0 text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Satır</th>
                <th className="px-3 py-2 font-semibold">Sembol</th>
                <th className="px-3 py-2 font-semibold">CSV türü</th>
                <th className="px-3 py-2 font-semibold">Sistem türü</th>
                <th className="px-3 py-2 font-semibold">PB</th>
              </tr>
            </thead>
            <tbody>
              {preview.examples.map((row) => (
                <tr key={row.lineNo} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-muted)]">#{row.lineNo}</td>
                  <td className="px-3 py-2 font-semibold">{row.symbol}</td>
                  <td className="px-3 py-2">{row.rawType || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge color={ASSET_META[row.assetType].color}>
                      {ASSET_META[row.assetType].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{row.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {preview.errors.length > 0 && (
        <section className="rounded-xl border border-[var(--color-loss)]/30 bg-[var(--color-loss-soft)] p-3">
          <div className="flex gap-2 text-xs text-[var(--color-loss)]">
            <FileWarning className="mt-0.5 shrink-0" size={16} />
            <div>
              <p className="font-bold">{preview.errors.length} satır atlanacak</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {preview.errors.slice(0, 5).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/25 p-3.5">
        <p className="mb-2 text-xs font-bold">İçe aktarma yöntemi</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ModeOption
            active={mode === "replace"}
            onClick={() => onModeChange("replace")}
            title="Tümünü değiştir"
            description={`${currentTransactionCount} mevcut işlem silinir; CSV yeni kaynak kabul edilir.`}
          />
          <ModeOption
            active={mode === "append"}
            onClick={() => onModeChange("append")}
            title="Sadece ekle"
            description="Mevcut işlemler korunur; aynı satırlar mükerrer kontrolüyle atlanır."
          />
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss-soft)] px-3 py-2 text-xs font-medium text-[var(--color-loss)]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <button
          type="button"
          onClick={onBack}
          disabled={importing}
          className="btn btn-outline px-3 py-2 text-xs"
        >
          <ArrowLeft size={14} />
          Geri
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="btn btn-primary px-3 py-2 text-xs"
        >
          {importing ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-on-brand)] border-t-transparent" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {mode === "replace" ? "Değiştir ve İçe Aktar" : "Ekle ve İçe Aktar"}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-[var(--color-profit)]"
      : tone === "bad"
        ? "text-[var(--color-loss)]"
        : tone === "warn"
          ? "text-[var(--color-brand-strong)]"
          : "text-[var(--color-foreground)]";
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-brand)]"
      }`}
    >
      <p className="text-xs font-bold">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">
        {description}
      </p>
    </button>
  );
}
