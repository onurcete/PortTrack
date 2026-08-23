"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  Upload,
  Search,
  Download,
  FileSpreadsheet,
  History,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  FileText,
  ScanSearch,
  GitCompareArrows,
  Copy,
  Zap,
  Table,
} from "lucide-react";
import { Modal } from "./Modal";
import { Badge } from "./ui";
import { ModernDatePicker } from "./ModernDatePicker";
import { BackfillStatusBanner, triggerBackfillBanner } from "./BackfillStatusBanner";
import {
  CsvImportPreview,
  type CsvImportMode,
} from "./CsvImportPreview";
import {
  ASSET_META,
  ASSET_TYPE_ALIASES,
  ASSET_TYPES,
  type AssetType,
} from "@/lib/assets";
import type { CsvImportPreview as CsvImportPreviewDTO } from "@/lib/csv";
import { formatDate, formatNumber, formatMoney, cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  createTransaction,
  createBulkTransactions,
  updateTransaction,
  deleteTransaction,
  confirmCsvImport,
  previewCsvImport,
  searchSymbols,
  getSymbolPrice,
  type BulkTxItemInput,
} from "@/app/transactions/actions";
import { updateBesBalance } from "@/app/growth/actions";
import { BES_MANUAL_FROM_YEAR } from "@/lib/backlog.constants";

export interface TxDTO {
  id: string;
  date: string;
  assetType: AssetType;
  symbol: string;
  side: "BUY" | "SELL";
  unitPrice: number;
  quantity: number;
  total: number;
  currency: "TRY" | "USD";
  note: string | null;
}

function curSym(c: string) {
  return c === "USD" ? "$" : "₺";
}

export function TransactionsClient({ transactions }: { transactions: TxDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TxDTO | null>(null);
  const [filter, setFilter] = useState<AssetType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleHistoryBackfill() {
    setHistoryLoading(true);
    triggerBackfillBanner();
    startTransition(async () => {
      try {
        const res = await fetch("/api/history/backfill?mode=smart", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          setToast(data.message || "Geçmiş verileri başarıyla güncellendi.");
          router.refresh();
        } else {
          setToast(data.error || "Geçmiş güncellenemedi.");
        }
      } catch {
        setToast("Geçmiş güncellenirken bağlantı hatası oluştu.");
      } finally {
        setHistoryLoading(false);
        setTimeout(() => setToast(null), 6000);
      }
    });
  }

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<
    "select" | "format_info" | "upload" | "preview"
  >("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvImportPreviewDTO | null>(
    null,
  );
  const [importMode, setImportMode] = useState<CsvImportMode>("replace");
  const [typeOverrides, setTypeOverrides] = useState<Record<number, AssetType>>(
    {},
  );
  const acceptedTypeLabels = useMemo(
    () =>
      ASSET_TYPES.map(
        (assetType) =>
          `${ASSET_META[assetType].label} (${ASSET_TYPE_ALIASES[assetType]
            .slice(0, 2)
            .join(", ")})`,
      ).join(" · "),
    [],
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "ALL" && t.assetType !== filter) return false;
      if (query && !t.symbol.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [transactions, filter, query]);

  const stats = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    let totalTRY = 0;
    let totalUSD = 0;

    for (const t of filtered) {
      if (t.side === "BUY") buyCount++;
      else sellCount++;

      if (t.currency === "TRY") totalTRY += t.total;
      else totalUSD += t.total;
    }

    return {
      total: filtered.length,
      buyCount,
      sellCount,
      totalTRY,
      totalUSD,
    };
  }, [filtered]);

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ["Tarih", "Tür", "Sembol", "İşlem", "Birim Fiyat", "Adet", "Toplam", "Para Birimi"];
    const rows = filtered.map(t => [
      formatDate(t.date),
      ASSET_META[t.assetType]?.label ?? t.assetType,
      t.symbol,
      t.side === "BUY" ? "Alış" : "Satış",
      t.unitPrice,
      t.quantity,
      t.total,
      t.currency
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `porttrack_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel function
  const exportToExcel = () => {
    const data = filtered.map(t => ({
      "Tarih": formatDate(t.date),
      "Tür": ASSET_META[t.assetType]?.label ?? t.assetType,
      "Sembol": t.symbol,
      "İşlem": t.side === "BUY" ? "Alış" : "Satış",
      "Birim Fiyat": t.unitPrice,
      "Adet": t.quantity,
      "Toplam": t.total,
      "Para Birimi": t.currency
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "İşlemler");
    XLSX.writeFile(workbook, `porttrack_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const [modalMode, setModalMode] = useState<"single" | "bulk">("single");

  function openNew() {
    setEditing(null);
    setModalMode("single");
    setModalOpen(true);
  }
  function openEdit(tx: TxDTO) {
    setEditing(tx);
    setModalMode("single");
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await deleteTransaction(id);
      router.refresh();
    });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadError("Lütfen geçerli bir CSV dosyası (.csv) seçin.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUploadAndPreview = () => {
    if (!selectedFile) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setUploadError("Dosya içeriği boş veya okunamadı.");
        setImporting(false);
        return;
      }
      startTransition(async () => {
        const preview = await previewCsvImport(text);
        setImporting(false);
        setCsvContent(text);
        setCsvPreview(preview);
        setTypeOverrides({});
        setImportMode("replace");
        setUploadError(null);
        setImportStep("preview");
      });
    };
    reader.onerror = () => {
      setUploadError("Dosya okunurken bir hata oluştu.");
      setImporting(false);
    };
    reader.readAsText(selectedFile, "utf-8");
  };

  function handleConfirmImport() {
    if (!csvPreview || !csvContent) return;
    setImporting(true);
    startTransition(async () => {
      const result = await confirmCsvImport(
        csvContent,
        importMode,
        typeOverrides,
      );
      setImporting(false);
      if (result.ok) {
        setImportModalOpen(false);
        setToast(result.message ?? "CSV başarıyla içe aktarıldı.");
        triggerBackfillBanner();
        fetch("/api/history/backfill?mode=smart", { method: "POST" })
          .then((r) => r.json())
          .then(() => router.refresh())
          .catch(() => null);
        setTimeout(() => setToast(null), 5000);
      } else {
        setUploadError(result.message ?? "İçe aktarım sırasında bir hata oluştu.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">İşlemler</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Toplam {transactions.length} kayıt
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleHistoryBackfill}
            disabled={historyLoading || importing || pending}
            className="btn btn-outline gap-1.5"
            title="Sadece eksik sembollerin geçmiş verilerini ultra-hızlı günceller"
          >
            <History size={15} className={cn(historyLoading && "animate-spin")} />
            <span className="hidden sm:inline">{historyLoading ? "Güncelleniyor..." : "Geçmişi Güncelle"}</span>
          </button>
          <button
            onClick={() => {
              setImportStep("select");
              setSelectedFile(null);
              setUploadError(null);
              setCsvContent(null);
              setCsvPreview(null);
              setTypeOverrides({});
              setImportModalOpen(true);
            }}
            disabled={importing || pending}
            className="btn btn-outline"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">CSV İçe Aktar</span>
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus size={16} />
            Yeni İşlem
          </button>
        </div>
      </div>

      {/* İşlem Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">Filtrelenen İşlemler</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">{stats.total} adet</p>
          </div>
          <Badge className="bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-semibold">Toplam</Badge>
        </div>

        <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">Alış / Satış Dağılımı</p>
            <p className="text-xl font-bold mt-0.5 tabular-nums">
              <span className="text-[var(--color-profit)]">{stats.buyCount} Al</span>
              <span className="text-[var(--color-muted)] mx-1.5">/</span>
              <span className="text-[var(--color-loss)]">{stats.sellCount} Sat</span>
            </p>
          </div>
          <Badge className="bg-[var(--color-surface-muted)] text-[var(--color-muted)] font-semibold">İşlem Yönü</Badge>
        </div>
      </div>

      {/* Arama, Filtreleme ve Dışa Aktarma Çubuğu (Mobilde Tek Satır) */}
      <div className="flex items-center justify-between gap-1.5 mb-6 bg-[var(--color-surface)] p-2.5 sm:p-3 rounded-2xl border border-[var(--color-border)] shadow-sm">
        {/* Sol: Sembol Arama + Tür Seçici + Sıfırla */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Sembol Arama Input */}
          <div className="relative flex-1 min-w-[90px] max-w-[170px] sm:max-w-[200px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sembol..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-8 pr-2 text-xs outline-none focus:border-[var(--color-brand)] font-semibold"
            />
          </div>

          {/* Tür Filtresi Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AssetType | "ALL")}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-semibold outline-none focus:border-[var(--color-brand)] cursor-pointer min-w-[85px] sm:min-w-[120px]"
          >
            <option value="ALL">Tüm türler</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_META[t].label}
              </option>
            ))}
          </select>

          {/* Filtreleri Temizle */}
          {(query || filter !== "ALL") && (
            <button
              onClick={() => {
                setQuery("");
                setFilter("ALL");
              }}
              title="Filtreleri Sıfırla"
              className="p-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors shrink-0"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Sağ: Excel & CSV İndir Butonları */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={exportToExcel}
            disabled={filtered.length === 0}
            title="Excel olarak indir"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
            <span className="hidden sm:inline">Excel İndir</span>
            <span className="sm:hidden">Excel</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            title="CSV olarak indir"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold hover:bg-[var(--color-surface-muted)] transition-colors disabled:opacity-40"
          >
            <Download size={14} className="text-blue-500 shrink-0" />
            <span className="hidden sm:inline">CSV İndir</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      <BackfillStatusBanner />

      {/* İşlem Listesi (Mobil Kart + Masaüstü Tablo) */}
      <div className="card overflow-hidden">
        {/* Mobilde Görünüm (Mobil İşlem Kartları) */}
        <div className="md:hidden divide-y divide-[var(--color-border)]/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-muted)] font-medium">
              Kayıt yok. &quot;CSV İçe Aktar&quot; ile başlayabilirsiniz.
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="p-3.5 hover:bg-[var(--color-surface-muted)]/30 transition-colors flex items-center justify-between gap-2.5"
              >
                {/* Sol: Sembol, Tür & Tarih */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ASSET_META[t.assetType]?.color || "#3b82f6" }}
                    />
                    <span className="font-black text-xs sm:text-sm text-[var(--color-foreground)] truncate">
                      {t.symbol}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shrink-0",
                        t.side === "BUY"
                          ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                          : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]"
                      )}
                    >
                      {t.side === "BUY" ? "Alış" : "Satış"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)] font-semibold truncate">
                    <span>{ASSET_META[t.assetType]?.label ?? t.assetType}</span>
                    <span>•</span>
                    <span>{formatDate(t.date)}</span>
                  </div>
                </div>

                {/* Sağ: Tutar, Adet × Fiyat & Butonlar */}
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div>
                    <div className="text-xs font-black tabular-nums text-[var(--color-foreground)]">
                      {formatNumber(t.total, 2)} {curSym(t.currency)}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted)] font-semibold tabular-nums mt-0.5">
                      {formatNumber(t.quantity, 4)} × {formatNumber(t.unitPrice, 2)} {curSym(t.currency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 pl-1 border-l border-[var(--color-border)]/40">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                      title="Düzenle"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-loss-soft)] hover:text-[var(--color-loss)]"
                      title="Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Masaüstünde Görünüm (Tablo) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="theme-table-head">
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Tür</th>
                <th className="px-4 py-3 font-semibold">Sembol</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
                <th className="px-4 py-3 font-semibold text-right">Adet</th>
                <th className="px-4 py-3 font-semibold text-right">Birim Fiyat</th>
                <th className="px-4 py-3 font-semibold text-right">Toplam</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[var(--color-muted)]"
                  >
                    Kayıt yok. &quot;CSV İçe Aktar&quot; ile başlayabilirsiniz.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="theme-surface-hover border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-muted)]">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={ASSET_META[t.assetType]?.color}>
                      {ASSET_META[t.assetType]?.label ?? t.assetType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{t.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-semibold",
                        t.side === "BUY"
                          ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                          : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
                      )}
                    >
                      {t.side === "BUY" ? "Alış" : "Satış"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(t.quantity, 6)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {formatNumber(t.unitPrice, 4)} {curSym(t.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">
                    {formatNumber(t.total, 2)} {curSym(t.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-loss-soft)] hover:text-[var(--color-loss)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "İşlemi Düzenle" : modalMode === "bulk" ? "Toplu İşlem Girişi (Grid)" : "Yeni İşlem Ekle"}
        size={modalMode === "bulk" && !editing ? "3xl" : "md"}
      >
        <TransactionForm
          editing={editing}
          transactions={transactions}
          formMode={modalMode}
          onFormModeChange={setModalMode}
          onDone={() => {
            setModalOpen(false);
            triggerBackfillBanner();
            router.refresh();
          }}
        />
      </Modal>

      <Modal
        open={importModalOpen}
        onClose={() => !importing && setImportModalOpen(false)}
        title={
          importStep === "select"
            ? "CSV İçe Aktarma"
            : importStep === "format_info"
            ? "Veri Formatı ve Kurallar"
            : importStep === "upload"
              ? "Yeni CSV Yükle"
              : "CSV Önizleme ve Onay"
        }
      >
        {importStep === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted)]">
              Dosyanız veritabanına yazılmadan önce satır satır analiz edilir.
              Tür eşleşmelerini kontrol edip kayıt yöntemini siz seçersiniz.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                <div className="mb-3 flex items-center gap-2 text-[var(--color-brand-strong)]">
                  <ScanSearch size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    1. Dosya analizi
                  </h3>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)] theme-inset">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--color-border)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                    <span>Sembol</span>
                    <span>Tür</span>
                    <span>Durum</span>
                  </div>
                  {[
                    { symbol: "VPG", type: "Nasdaq", ok: true },
                    { symbol: "PHE", type: "TEFAS", ok: true },
                    { symbol: "???", type: "Diğer", ok: false },
                  ].map((row) => (
                    <div
                      key={row.symbol}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-[var(--color-border)] px-2.5 py-1.5 text-[11px] last:border-0"
                    >
                      <span className="font-semibold text-[var(--color-foreground)]">
                        {row.symbol}
                      </span>
                      <span className="text-[var(--color-muted)]">{row.type}</span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                          row.ok
                            ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                            : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
                        )}
                      >
                        {row.ok ? "OK" : "Kontrol"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
                  Geçerli / hatalı satırlar sayılır; eksik veya bozuk alanlar
                  işaretlenir.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
                <div className="mb-3 flex items-center gap-2 text-[var(--color-brand-strong)]">
                  <GitCompareArrows size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    2. Tür eşleştirme
                  </h3>
                </div>
                <div className="space-y-2">
                  {[
                    { from: "Nasdaq", to: "Yabancı Borsa" },
                    { from: "TEFAS", to: "TEFAS Fon" },
                    { from: "Kripto", to: "Kripto" },
                  ].map((pair) => (
                    <div
                      key={pair.from}
                      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] theme-inset px-2.5 py-2"
                    >
                      <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
                        {pair.from}
                      </span>
                      <ArrowRight
                        size={12}
                        className="shrink-0 text-[var(--color-brand)]"
                      />
                      <span className="rounded-md bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-brand-strong)]">
                        {pair.to}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
                  CSV’deki tür etiketleri PortTrack varlık türlerine eşlenir;
                  belirsiz olanları siz seçersiniz.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() => setImportModalOpen(false)}
                className="btn btn-outline text-xs py-2 px-4"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => setImportStep("format_info")}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Upload size={13} />
                Dosya yüklemeye geç
              </button>
            </div>
          </div>
        )}

        {importStep === "format_info" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-xs flex items-start gap-2.5">
              <AlertTriangle className="shrink-0 mt-0.5" size={16} />
              <div>
                Dosya önce analiz edilir. Sonraki adımda tüm işlemleri
                değiştirme veya yalnızca yeni satırları ekleme seçeneklerinden
                birini seçersiniz.
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-[var(--color-foreground)]">Gerekli CSV Sütun Yapısı ve Örnek Satır:</h4>
              <div className="overflow-x-auto text-[11px] font-mono theme-inset border border-[var(--color-border)] p-2.5 rounded-lg text-[var(--color-muted)] whitespace-nowrap">
                <div className="text-[var(--color-foreground)] font-semibold mb-1">
                  Tarih,Tür,Sembol,İşlem Tipi,Birim Fiyat (₺),Adet,Toplam (₺)
                </div>
                <div>
                  &quot;29.05.2026&quot;,&quot;Nasdaq&quot;,&quot;VPG&quot;,&quot;Alış&quot;,&quot;124.49&quot;,&quot;0.803&quot;,&quot;99.97&quot;
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--color-muted)]">
              <h4 className="font-semibold text-xs text-[var(--color-foreground)]">Sütun Kuralları:</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <span className="font-medium text-[var(--color-foreground)]">Tarih:</span> <code className="font-mono">GG.AA.YYYY</code> formatında olmalıdır (Örn: <code className="font-mono">29.05.2026</code>).
                </li>
                <li>
                  <span className="font-medium text-[var(--color-foreground)]">Tür:</span>{" "}
                  <span>
                    Kabul edilen etiketler: {acceptedTypeLabels}. Dosya
                    yüklendikten sonra tüm tür eşleşmeleri ayrıca
                    doğrulanabilir.
                  </span>
                </li>
                <li>
                  <span className="font-medium text-[var(--color-foreground)]">İşlem Tipi:</span> İşlem yönü: <code className="font-mono">Alış</code> veya <code className="font-mono">Satış</code>.
                </li>
                <li>
                  <span className="font-medium text-[var(--color-foreground)]">Birim Fiyat & Adet:</span> Ondalıklı sayılar için Türkçe/Excel uyumlu virgül (,) veya nokta (.) kullanılabilir (Örn: <code className="font-mono">124,49</code> veya <code className="font-mono">124.49</code>).
                </li>
                <li>
                  <span className="font-medium text-[var(--color-foreground)]">Toplam (Opsiyonel):</span> Boş bırakılırsa Birim Fiyat * Adet olarak hesaplanır.
                </li>
              </ul>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() => setImportStep("select")}
                className="btn btn-outline text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                Geri
              </button>
              <button
                onClick={() => setImportStep("upload")}
                className="btn btn-primary text-xs py-2 px-4"
              >
                Anladım, Devam Et
              </button>
            </div>
          </div>
        )}

        {importStep === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--color-foreground)]">
                CSV Dosyası Seçin
              </label>
              
              <div className="relative border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand)] rounded-xl p-6 transition-all theme-inset text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="rounded-full p-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                    <FileText size={24} />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">{selectedFile.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-[var(--color-foreground)]">Tıklayın veya dosyanızı buraya sürükleyin</p>
                      <p className="text-xs text-[var(--color-muted)] mt-1">Yalnızca .csv dosyaları</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl border border-[var(--color-loss)]/30 bg-[var(--color-loss-soft)] text-[var(--color-loss)] text-xs font-medium">
                {uploadError}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() => {
                  setUploadError(null);
                  setImportStep("format_info");
                }}
                disabled={importing}
                className="btn btn-outline text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                Geri
              </button>
              <button
                onClick={handleUploadAndPreview}
                disabled={!selectedFile || importing}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {importing && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                {importing ? "Analiz ediliyor..." : "Yükle ve Analiz Et"}
              </button>
            </div>
          </div>
        )}

        {importStep === "preview" && csvPreview && (
          <CsvImportPreview
            preview={csvPreview}
            currentTransactionCount={transactions.length}
            mode={importMode}
            overrides={typeOverrides}
            importing={importing}
            error={uploadError}
            onModeChange={setImportMode}
            onOverrideChange={(lineNo, assetType) =>
              setTypeOverrides((current) => ({
                ...current,
                [lineNo]: assetType,
              }))
            }
            onBack={() => {
              setUploadError(null);
              setImportStep("upload");
            }}
            onConfirm={handleConfirmImport}
          />
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--color-foreground)] px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

interface BulkRow {
  id: string;
  assetType: AssetType;
  side: "BUY" | "SELL";
  symbol: string;
  date: string;
  currency: "TRY" | "USD";
  quantity: string;
  unitPrice: string;
  note: string;
  fetchingPrice?: boolean;
}

function createDefaultBulkRow(): BulkRow {
  return {
    id: Math.random().toString(36).substring(2, 9),
    assetType: "BIST",
    side: "BUY",
    symbol: "",
    date: new Date().toISOString().slice(0, 10),
    currency: "TRY",
    quantity: "",
    unitPrice: "",
    note: "",
  };
}

function BulkTransactionGrid({
  transactions,
  onDone,
}: {
  transactions: TxDTO[];
  onDone: () => void;
}) {
  const [rows, setRows] = useState<BulkRow[]>([
    createDefaultBulkRow(),
    createDefaultBulkRow(),
    createDefaultBulkRow(),
  ]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, field: keyof BulkRow, val: any) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };
        if (field === "assetType") {
          updated.currency = val === "FOREIGN" ? "USD" : "TRY";
        }
        return updated;
      })
    );
  }

  function updateRowMultiple(id: string, updates: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  }

  async function handleRowSymbolSelect(id: string, selectedSym: string) {
    if (!selectedSym) return;
    const cleanSym = selectedSym.trim().toUpperCase().replace(/\.IS$/, "").replace(/-USD$/, "");
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    let targetType = row.assetType;
    let targetCurrency = row.currency;

    const historyMatch = transactions.find(
      (t) => t.symbol.toUpperCase().replace(/\.IS$/, "") === cleanSym
    );
    if (historyMatch) {
      targetType = historyMatch.assetType;
      targetCurrency = historyMatch.currency as "TRY" | "USD";
    } else if (selectedSym.toUpperCase().endsWith(".IS")) {
      targetType = "BIST";
      targetCurrency = "TRY";
    } else if (targetType === "FOREIGN") {
      targetCurrency = "USD";
    }

    updateRowMultiple(id, {
      symbol: cleanSym,
      assetType: targetType,
      currency: targetCurrency,
      fetchingPrice: true,
    });

    try {
      const res = await getSymbolPrice(cleanSym, targetType);
      if (res && res.price) {
        updateRowMultiple(id, {
          unitPrice: String(res.price),
          currency: res.currency,
          fetchingPrice: false,
        });
      } else {
        updateRow(id, "fetchingPrice", false);
      }
    } catch {
      updateRow(id, "fetchingPrice", false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, createDefaultBulkRow()]);
  }

  function duplicateRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const cloned = { ...row, id: Math.random().toString(36).substring(2, 9) };
    const idx = rows.findIndex((r) => r.id === id);
    const newRows = [...rows];
    newRows.splice(idx + 1, 0, cloned);
    setRows(newRows);
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSubmit() {
    setError(null);
    const todayStr = new Date().toISOString().slice(0, 10);

    const hasFutureDate = rows.some((r) => r.symbol.trim() !== "" && r.date > todayStr);
    if (hasFutureDate) {
      setError("Gelecek bir tarih seçilemez. Lütfen satırlardaki tarihleri kontrol edin.");
      return;
    }

    const hasInvalidNumber = rows.some(
      (r) => r.symbol.trim() !== "" && ((r.quantity !== "" && parseFloat(r.quantity) <= 0) || (r.unitPrice !== "" && parseFloat(r.unitPrice) <= 0))
    );
    if (hasInvalidNumber) {
      setError("Adet ve Birim Fiyat 0'dan büyük olmalıdır (Negatif veya 0 girilemez).");
      return;
    }

    const validRows = rows.filter(
      (r) => r.symbol.trim() !== "" && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0 && r.date <= todayStr
    );

    if (validRows.length === 0) {
      setError("Lütfen en az 1 satır için geçerli Sembol, Adet ve Birim Fiyat girin.");
      return;
    }

    startTransition(async () => {
      const payload: BulkTxItemInput[] = validRows.map((r) => ({
        date: r.date,
        assetType: r.assetType,
        symbol: r.symbol.trim().toUpperCase(),
        side: r.side,
        unitPrice: parseFloat(r.unitPrice),
        quantity: parseFloat(r.quantity),
        total: parseFloat(r.quantity) * parseFloat(r.unitPrice),
        currency: r.currency,
        note: r.note.trim() || undefined,
      }));

      const res = await createBulkTransactions(payload);
      if (res.ok) {
        onDone();
        triggerBackfillBanner();
        fetch("/api/history/backfill?mode=smart", { method: "POST" }).catch(() => null);
      } else {
        setError(res.message || "Toplu kaydetme sırasında hata oluştu.");
      }
    });
  }

  const validCount = rows.filter(
    (r) => r.symbol.trim() !== "" && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0
  ).length;

  const totalEstimateTRY = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const p = parseFloat(r.unitPrice) || 0;
    return sum + (r.currency === "TRY" ? q * p : 0);
  }, 0);

  const totalEstimateUSD = rows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const p = parseFloat(r.unitPrice) || 0;
    return sum + (r.currency === "USD" ? q * p : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Grid Table Container */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
        <div className="max-h-[480px] overflow-x-auto overflow-y-auto pb-44">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] font-extrabold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-md">
                <th className="py-2.5 px-2 text-center w-7">#</th>
                <th className="py-2.5 px-2 min-w-[105px]">Varlık Türü</th>
                <th className="py-2.5 px-2 w-[70px] text-center">Yön</th>
                <th className="py-2.5 px-2 min-w-[130px]">Sembol</th>
                <th className="py-2.5 px-2 min-w-[120px]">Tarih</th>
                <th className="py-2.5 px-2 w-[65px] text-center">Birim</th>
                <th className="py-2.5 px-2 min-w-[85px] text-right">Adet</th>
                <th className="py-2.5 px-2 min-w-[105px] text-right">Birim Fiyat</th>
                <th className="py-2.5 px-2 min-w-[95px] text-right">Toplam</th>
                <th className="py-2.5 px-2 min-w-[100px]">Not</th>
                <th className="py-2.5 px-1 text-center w-14">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 font-medium">
              {rows.map((row, idx) => {
                const q = parseFloat(row.quantity) || 0;
                const p = parseFloat(row.unitPrice) || 0;
                const total = q * p;
                const isRowValid = row.symbol.trim() !== "" && q > 0 && p > 0;

                return (
                  <tr
                    key={row.id}
                    style={{ position: "relative", zIndex: 100 - idx }}
                    className={cn(
                      "transition-colors hover:bg-[var(--color-surface-muted)]/40",
                      isRowValid ? "bg-emerald-500/[0.02]" : ""
                    )}
                  >
                    {/* Index */}
                    <td className="py-2 px-2 text-center font-bold text-[var(--color-muted)]">
                      {idx + 1}
                    </td>

                    {/* Varlık Türü */}
                    <td className="py-2 px-1">
                      <select
                        value={row.assetType}
                        onChange={(e) => updateRow(row.id, "assetType", e.target.value as AssetType)}
                        className="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)] px-1.5 py-1.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] cursor-pointer"
                      >
                        {ASSET_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {ASSET_META[t].label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Yön (AL / SAT) */}
                    <td className="py-2 px-1">
                      <div className="grid grid-cols-2 gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)]/60">
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, "side", "BUY")}
                          className={cn(
                            "py-1 text-[10px] font-black rounded transition-all cursor-pointer text-center",
                            row.side === "BUY"
                              ? "bg-[var(--color-profit)] text-white shadow-2xs"
                              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          )}
                        >
                          AL
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, "side", "SELL")}
                          className={cn(
                            "py-1 text-[10px] font-black rounded transition-all cursor-pointer text-center",
                            row.side === "SELL"
                              ? "bg-[var(--color-loss)] text-white shadow-2xs"
                              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          )}
                        >
                          SAT
                        </button>
                      </div>
                    </td>

                    {/* Sembol (Combobox Autocomplete) */}
                    <td className="py-2 px-1">
                      <SymbolCombobox
                        value={row.symbol}
                        onChange={(val) => updateRow(row.id, "symbol", val)}
                        onSelect={(selectedSym) => handleRowSymbolSelect(row.id, selectedSym)}
                        assetType={row.assetType}
                        transactions={transactions}
                        placeholder="Sembol..."
                        inputClassName="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)] px-2 py-1.5 text-xs font-extrabold uppercase outline-none focus:border-[var(--color-brand)]"
                      />
                    </td>

                    {/* Tarih (Modern Custom Date Picker) */}
                    <td className="py-2 px-1">
                      <ModernDatePicker
                        value={row.date}
                        onChange={(newDate) => updateRow(row.id, "date", newDate)}
                        compact
                      />
                    </td>

                    {/* Para Birimi (Segmented Toggle ₺ / $) */}
                    <td className="py-2 px-1">
                      <div className="grid grid-cols-2 gap-0.5 bg-[var(--color-surface-muted)] p-0.5 rounded-lg border border-[var(--color-border)]/60">
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, "currency", "TRY")}
                          className={cn(
                            "py-1 px-1 text-xs sm:text-sm font-black rounded transition-all cursor-pointer text-center",
                            row.currency === "TRY"
                              ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs border border-[var(--color-border)]/60"
                              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          )}
                        >
                          ₺
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, "currency", "USD")}
                          className={cn(
                            "py-1 px-1 text-xs sm:text-sm font-black rounded transition-all cursor-pointer text-center",
                            row.currency === "USD"
                              ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs border border-[var(--color-border)]/60"
                              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          )}
                        >
                          $
                        </button>
                      </div>
                    </td>

                    {/* Adet */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)] px-2 py-1.5 text-xs font-bold tabular-nums text-right outline-none focus:border-[var(--color-brand)]"
                      />
                    </td>

                    {/* Birim Fiyat */}
                    <td className="py-2 px-1">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="any"
                          value={row.unitPrice}
                          onChange={(e) => updateRow(row.id, "unitPrice", e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)] pl-2 pr-6 py-1.5 text-xs font-bold tabular-nums text-right outline-none focus:border-[var(--color-brand)]"
                        />
                        {row.fetchingPrice && (
                          <span className="absolute right-1.5 text-[var(--color-brand-strong)] flex items-center">
                            <span className="w-3 h-3 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin"></span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tahmini Toplam */}
                    <td className="py-2 px-2 text-right font-extrabold tabular-nums text-[var(--color-foreground)]">
                      {total > 0 ? `${formatNumber(total, 2)} ${curSym(row.currency)}` : "-"}
                    </td>

                    {/* Not */}
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) => updateRow(row.id, "note", e.target.value)}
                        placeholder="Not..."
                        className="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)] px-2 py-1.5 text-xs font-medium outline-none focus:border-[var(--color-brand)]"
                      />
                    </td>

                    {/* Aksiyonlar */}
                    <td className="py-2 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateRow(row.id)}
                          title="Satırı Kopyala"
                          className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length <= 1}
                          title="Satırı Sil"
                          className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-loss)] hover:bg-[var(--color-loss-soft)] disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Bar */}
        <div className="p-2.5 border-t border-[var(--color-border)]/70 bg-[var(--color-surface-muted)]/30 flex items-center justify-between">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-brand-soft)] hover:bg-[var(--color-brand)]/20 text-[var(--color-brand-strong)] text-xs font-extrabold transition-all cursor-pointer border border-[var(--color-brand)]/30"
          >
            <Plus size={14} /> Yeni Satır Ekle
          </button>

          <span className="text-[11px] font-bold text-[var(--color-muted)]">
            Toplam {rows.length} satırdan {validCount} adedi dolduruldu
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs font-bold text-[var(--color-loss)] bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          {error}
        </p>
      )}

      {/* Summary Footer & Action Button */}
      <div className="p-4 bg-gradient-to-br from-[var(--color-brand-soft)]/20 to-[var(--color-surface-muted)]/30 border border-[var(--color-brand)]/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
            Toplu İşlem Özeti
          </span>
          <div className="text-sm font-black text-[var(--color-foreground)] mt-0.5 flex items-center gap-3">
            <span>{validCount} Geçerli Satır</span>
            {totalEstimateTRY > 0 && (
              <span className="text-[var(--color-brand-strong)]">
                ₺{formatNumber(totalEstimateTRY, 2)}
              </span>
            )}
            {totalEstimateUSD > 0 && (
              <span className="text-emerald-500">
                ${formatNumber(totalEstimateUSD, 2)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || validCount === 0}
          className="w-full sm:w-auto btn btn-primary text-xs py-2.5 px-6 font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {pending ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {validCount} İşlem Kaydediliyor...
            </span>
          ) : (
            `${validCount} Adet İşlemi Kaydet`
          )}
        </button>
      </div>
    </div>
  );
}

function TransactionForm({
  editing,
  transactions,
  formMode,
  onFormModeChange,
  onDone,
}: {
  editing: TxDTO | null;
  transactions: TxDTO[];
  formMode: "single" | "bulk";
  onFormModeChange: (mode: "single" | "bulk") => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<AssetType>(
    editing?.assetType ?? "FOREIGN",
  );
  const [currency, setCurrency] = useState<"TRY" | "USD">(
    editing?.currency ?? (assetType === "FOREIGN" ? "USD" : "TRY"),
  );
  const [symbol, setSymbol] = useState(editing?.symbol ?? "");
  const [side, setSide] = useState<"BUY" | "SELL">(editing?.side ?? "BUY");
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [qtyInput, setQtyInput] = useState<string>(editing ? String(editing.quantity) : "");
  const [priceInput, setPriceInput] = useState<string>(editing ? String(editing.unitPrice) : "");
  const [dateInput, setDateInput] = useState<string>(
    editing ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  const [besMonth, setBesMonth] = useState(
    editing ? editing.date.slice(0, 7) : new Date().toISOString().slice(0, 7)
  );
  const [besBalance, setBesBalance] = useState<string>(
    editing?.assetType === "BES" ? String(editing.total || editing.unitPrice) : ""
  );

  const unitPriceRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  function onAssetChange(v: AssetType) {
    setAssetType(v);
    if (v === "BES") {
      setSymbol("BES");
      setCurrency("TRY");
    } else {
      if (symbol === "BES") setSymbol("");
      setCurrency(v === "FOREIGN" ? "USD" : "TRY");
    }
  }

  function cleanSymbol(sym: string): string {
    if (!sym) return "";
    let s = sym.trim().toUpperCase();
    if (s.endsWith(".IS")) {
      s = s.substring(0, s.length - 3);
    }
    if (s.endsWith("-USD")) {
      s = s.substring(0, s.length - 4);
    }
    return s;
  }

  function getCurrentHoldingQty(sym: string): number {
    if (!sym) return 0;
    const cleanSym = cleanSymbol(sym);
    let qty = 0;
    
    transactions.forEach((t) => {
      if (cleanSymbol(t.symbol) === cleanSym) {
        if (t.side === "BUY") {
          qty += t.quantity;
        } else if (t.side === "SELL") {
          qty -= t.quantity;
        }
      }
    });
    
    return qty > 0 ? qty : 0;
  }

  function handleSymbolChange(newSymbol: string) {
    const cleanSym = cleanSymbol(newSymbol);
    setSymbol(cleanSym);
    
    // Auto-detect currency and asset type based on user's history
    const historyMatch = transactions.find(
      (t) => cleanSymbol(t.symbol) === cleanSym
    );
    if (historyMatch) {
      setAssetType(historyMatch.assetType);
      setCurrency(historyMatch.currency);
    } else {
      const upper = newSymbol.trim().toUpperCase();
      if (upper.endsWith(".IS")) {
        setAssetType("BIST");
        setCurrency("TRY");
      }
    }
  }

  async function handleSymbolSelect(selectedSymbol: string) {
    if (!selectedSymbol) return;
    
    const cleanSym = cleanSymbol(selectedSymbol);
    setSymbol(cleanSym);
    
    // Auto-detect from history first
    const historyMatch = transactions.find(
      (t) => cleanSymbol(t.symbol) === cleanSym
    );
    let currentType = assetType;
    if (historyMatch) {
      setAssetType(historyMatch.assetType);
      setCurrency(historyMatch.currency);
      currentType = historyMatch.assetType;
    } else {
      const upper = selectedSymbol.trim().toUpperCase();
      if (upper.endsWith(".IS")) {
        setAssetType("BIST");
        setCurrency("TRY");
        currentType = "BIST";
      }
    }

    // Auto-fill quantity if SELL transaction
    if (side === "SELL") {
      const qty = getCurrentHoldingQty(cleanSym);
      if (qty > 0) {
        setQtyInput(String(qty));
        if (quantityRef.current) quantityRef.current.value = String(qty);
      }
    }

    setFetchingPrice(true);
    try {
      const result = await getSymbolPrice(selectedSymbol, currentType);
      if (result && result.price) {
        setPriceInput(String(result.price));
        if (unitPriceRef.current) {
          unitPriceRef.current.value = String(result.price);
        }
        setCurrency(result.currency);
      }
    } catch (err) {
      console.error("Failed to fetch price:", err);
    } finally {
      setFetchingPrice(false);
    }
  }

  function submit(formData: FormData) {
    setError(null);

    // BES Özel İşlem Gönderimi
    if (assetType === "BES") {
      const besVal = parseFloat(besBalance);
      if (!Number.isFinite(besVal) || besVal < 0) {
        setError("Geçerli bir BES bakiyesi giriniz.");
        return;
      }
      startTransition(async () => {
        const res = await updateBesBalance(formData);
        if (res.ok) {
          onDone();
          triggerBackfillBanner();
          fetch("/api/history/backfill?mode=smart", { method: "POST" }).catch(() => null);
        } else {
          setError(res.message ?? "Hata oluştu.");
        }
      });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const parsedQty = parseFloat(qtyInput) || 0;
    const parsedPrice = parseFloat(priceInput) || 0;

    if (parsedQty <= 0) {
      setError("Adet 0'dan büyük olmalıdır.");
      return;
    }
    if (parsedPrice <= 0) {
      setError("Birim fiyat 0'dan büyük olmalıdır.");
      return;
    }
    if (dateInput > todayStr) {
      setError("Gelecek bir tarih seçilemez.");
      return;
    }

    startTransition(async () => {
      const res = editing
        ? await updateTransaction(editing.id, formData)
        : await createTransaction(formData);
      if (res.ok) {
        onDone();
        // Güncel fiyatlar alındı, şimdi arka planda geçmiş doldurmayı başlat
        triggerBackfillBanner();
        fetch("/api/history/backfill?mode=smart", { method: "POST" }).catch(() => null);
      } else {
        setError(res.message ?? "Hata oluştu.");
      }
    });
  }

  const currentQty = getCurrentHoldingQty(symbol);
  const parsedQty = parseFloat(qtyInput) || 0;
  const parsedPrice = parseFloat(priceInput) || 0;
  const computedTotal = parsedQty * parsedPrice;

  return (
    <div className="space-y-5">
      {!editing && (
        <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-muted)]/60 p-1.5 rounded-2xl border border-[var(--color-border)]/60">
          <button
            type="button"
            onClick={() => onFormModeChange("single")}
            className={cn(
              "py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
              formMode === "single"
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs border border-[var(--color-border)]/70"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <Plus size={14} /> Tekil İşlem Ekle
          </button>
          <button
            type="button"
            onClick={() => onFormModeChange("bulk")}
            className={cn(
              "py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
              formMode === "bulk"
                ? "bg-[var(--color-brand)] text-white shadow-xs"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <Table size={14} /> Toplu İşlem Gir (Grid)
          </button>
        </div>
      )}

      {formMode === "bulk" && !editing ? (
        <BulkTransactionGrid transactions={transactions} onDone={onDone} />
      ) : (
        <form action={submit} className="space-y-5">
          {/* Varlık Türü Seçici (Her zaman en üstte erişilebilir) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
              Varlık Türü
            </label>
            <div className="relative">
              <select
                name="assetType"
                value={assetType}
                onChange={(e) => onAssetChange(e.target.value as AssetType)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] cursor-pointer"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ASSET_META[t].label} ({t === "FOREIGN" ? "USD $" : "TRY ₺"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {assetType === "BES" ? (
            /* BES Özel Bakiye Güncelleme Formu */
            <div className="space-y-4 pt-1">
              <div className="rounded-2xl border border-[var(--color-brand)]/20 bg-gradient-to-br from-[var(--color-brand-soft)]/20 to-[var(--color-surface-muted)]/30 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-[var(--color-foreground)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white text-xs">
                    🛡️
                  </span>
                  <span>Bireysel Emeklilik Sistemi (BES) Bakiye Güncelleme</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
                  BES için ilgili ayın toplam güncel fon/hesap bakiyesini girin. Sistem bu tutarı portföy gelişiminizin seçilen ayına işler ve işlemler tablosundaki BES satırını günceller.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ay Seçimi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Dönem (Ay / Yıl)
                  </label>
                  <input
                    type="month"
                    name="month"
                    required
                    min={`${BES_MANUAL_FROM_YEAR}-01`}
                    value={besMonth}
                    onChange={(e) => setBesMonth(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] cursor-pointer"
                  />
                </div>

                {/* BES Güncel Bakiyesi (₺) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Toplam BES Bakiyesi (₺)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="besTRY"
                      step="any"
                      required
                      min={0}
                      value={besBalance}
                      onChange={(e) => setBesBalance(e.target.value)}
                      placeholder="Örn: 850000"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-3.5 pr-10 py-2.5 text-xs font-bold tabular-nums outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--color-muted)] pointer-events-none">
                      ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Hata Bildirimi */}
              {error && (
                <p className="text-xs font-bold text-[var(--color-loss)] bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {error}
                </p>
              )}

              {/* Aksiyon Butonu */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]/50">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary text-xs py-2.5 px-6 font-extrabold shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                >
                  {pending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      BES Bakiyesi Kaydediliyor...
                    </span>
                  ) : (
                    "BES Bakiyesini Kaydet"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Standart Varlık İşlemi Alanları */
            <>
              {/* 1. İşlem Yönü Switcher */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    İşlem Yönü
                  </label>
                  {side === "SELL" && symbol && (
                    <span className="text-[11px] font-bold text-[var(--color-brand-strong)]">
                      Mevcut Varlık: {formatNumber(currentQty, 4)} adet
                    </span>
                  )}
                </div>
                <input type="hidden" name="side" value={side} />
                <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-muted)]/50 p-1.5 rounded-2xl border border-[var(--color-border)]/60">
                  <button
                    type="button"
                    onClick={() => setSide("BUY")}
                    className={cn(
                      "py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
                      side === "BUY"
                        ? "bg-[var(--color-profit)] text-white shadow-md ring-2 ring-emerald-500/20"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    <Plus size={15} />
                    Alış İle Ekle (BUY)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSide("SELL");
                      if (symbol) {
                        const qty = getCurrentHoldingQty(symbol);
                        if (qty > 0) {
                          setQtyInput(String(qty));
                          if (quantityRef.current) quantityRef.current.value = String(qty);
                        }
                      }
                    }}
                    className={cn(
                      "py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2",
                      side === "SELL"
                        ? "bg-[var(--color-loss)] text-white shadow-md ring-2 ring-rose-500/20"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    <Minus size={15} />
                    Satış İle Çıkar (SELL)
                  </button>
                </div>
              </div>

              {/* 2. Sembol Seçimi */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                  Sembol Kodu
                </label>
                <SymbolCombobox
                  value={symbol}
                  onChange={handleSymbolChange}
                  onSelect={handleSymbolSelect}
                  assetType={assetType}
                  transactions={transactions}
                  placeholder="Örn: AAPL, THYAO, BTC..."
                />
              </div>

              {/* 3. Tarih & Para Birimi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarih */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    İşlem Tarihi
                  </label>
                  <input type="hidden" name="date" value={dateInput} />
                  <ModernDatePicker
                    value={dateInput}
                    onChange={(newDate) => setDateInput(newDate)}
                  />
                </div>

                {/* Para Birimi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Para Birimi
                  </label>
                  <input type="hidden" name="currency" value={currency} />
                  <div className="grid grid-cols-2 gap-1.5 bg-[var(--color-surface-muted)]/50 p-1 rounded-xl border border-[var(--color-border)]/60">
                    <button
                      type="button"
                      onClick={() => setCurrency("TRY")}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                        currency === "TRY"
                          ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs border border-[var(--color-border)]/60"
                          : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                      )}
                    >
                      ₺ Türk Lirası (TRY)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                        currency === "USD"
                          ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs border border-[var(--color-border)]/60"
                          : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                      )}
                    >
                      $ Amerikan Doları (USD)
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Adet & Birim Fiyat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adet */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    İşlem Adedi
                  </label>
                  <input
                    ref={quantityRef}
                    name="quantity"
                    type="number"
                    step="any"
                    required
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold tabular-nums outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                  />
                </div>

                {/* Birim Fiyat */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                      Birim Fiyat ({curSym(currency)})
                    </label>
                    {fetchingPrice && (
                      <span className="text-[10px] font-bold text-[var(--color-brand-strong)] flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin"></span>
                        Fiyat Getiriliyor...
                      </span>
                    )}
                  </div>
                  <input
                    ref={unitPriceRef}
                    name="unitPrice"
                    type="number"
                    step="any"
                    required
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold tabular-nums outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                  />
                </div>
              </div>

              {/* 5. Canlı Toplam Kartı */}
              <div className="p-4 bg-gradient-to-br from-[var(--color-brand-soft)]/30 to-[var(--color-surface-muted)]/20 border border-[var(--color-brand)]/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Tahmini Toplam İşlem Tutarı
                  </span>
                  <div className="text-lg font-black tracking-tight tabular-nums text-[var(--color-foreground)] mt-0.5">
                    {formatMoney(computedTotal, currency)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[var(--color-muted)] block">Hesaplama:</span>
                  <span className="text-xs font-bold tabular-nums text-[var(--color-brand-strong)]">
                    {parsedQty} × {parsedPrice.toFixed(2)} {curSym(currency)}
                  </span>
                </div>
              </div>

              {/* Özel Toplam Tutar (Opsiyonel) */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                  Özel Toplam Tutar (Opsiyonel — Boş bırakılırsa Adet × Birim Fiyat alınır)
                </label>
                <input
                  name="total"
                  type="number"
                  step="any"
                  defaultValue={editing?.total ?? ""}
                  placeholder={computedTotal > 0 ? String(computedTotal) : "Otomatik hesaplanır"}
                  className="w-full rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-3.5 py-2 text-xs font-medium tabular-nums outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              {error && (
                <p className="text-xs font-bold text-[var(--color-loss)] bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {error}
                </p>
              )}

              {/* Standart İşlem Butonu */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]/50">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary text-xs py-2.5 px-6 font-extrabold shadow-md hover:shadow-lg transition-all"
                >
                  {pending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Kaydediliyor & Güncel Fiyat Alınıyor...
                    </span>
                  ) : (
                    editing ? "Değişiklikleri Kaydet" : "Yeni İşlemi Kaydet"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

interface SearchResult {
  symbol: string;
  name: string;
  assetType: AssetType;
  source: "db" | "yahoo";
}

function SymbolCombobox({
  value,
  onChange,
  onSelect,
  assetType,
  transactions,
  placeholder,
  inputClassName,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (val: string) => void;
  assetType: AssetType;
  transactions: TxDTO[];
  placeholder?: string;
  inputClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter unique symbols in portfolio history of current assetType
  const portfolioSymbols = useMemo(() => {
    const unique = new Map<string, string>();
    transactions.forEach((t) => {
      if (t.assetType === assetType && t.symbol) {
        unique.set(t.symbol.toUpperCase(), t.note || t.symbol);
      }
    });
    return Array.from(unique.entries()).map(([symbol, name]) => ({
      symbol,
      name,
    })).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [transactions, assetType]);

  // Matching portfolio symbols based on typed input
  const matchingPortfolioSymbols = useMemo(() => {
    if (!inputValue) return portfolioSymbols;
    const cleanInput = inputValue.trim().toUpperCase();
    return portfolioSymbols.filter(
      (item) =>
        item.symbol.includes(cleanInput) ||
        item.name.toUpperCase().includes(cleanInput)
    );
  }, [portfolioSymbols, inputValue]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    if (inputValue.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchSymbols(inputValue, assetType);
        const filteredRes = res.filter(
          (item) => !portfolioSymbols.some((p) => p.symbol === item.symbol.toUpperCase())
        );
        setSuggestions(filteredRes);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [inputValue, assetType, isOpen, portfolioSymbols]);

  const defaultSuggestions = useMemo(() => {
    if (assetType === "METAL") {
      return [
        { symbol: "ALTIN", name: "Gram Altın (TL/Gram)", assetType: "METAL" as const, source: "db" as const },
        { symbol: "GUMUS", name: "Gram Gümüş (TL/Gram)", assetType: "METAL" as const, source: "db" as const },
        { symbol: "XAU", name: "Ons Altın (USD/Ons)", assetType: "METAL" as const, source: "db" as const },
        { symbol: "XAG", name: "Ons Gümüş (USD/Ons)", assetType: "METAL" as const, source: "db" as const },
        { symbol: "XPT", name: "Ons Platin (USD/Ons)", assetType: "METAL" as const, source: "db" as const },
        { symbol: "XPD", name: "Ons Paladyum (USD/Ons)", assetType: "METAL" as const, source: "db" as const },
      ];
    }
    if (assetType === "FX") {
      return [
        { symbol: "USD/TRY", name: "Amerikan Doları (USD)", assetType: "FX" as const, source: "db" as const },
        { symbol: "EUR/TRY", name: "Euro (EUR)", assetType: "FX" as const, source: "db" as const },
        { symbol: "GBP/TRY", name: "İngiliz Sterlini (GBP)", assetType: "FX" as const, source: "db" as const },
        { symbol: "CHF/TRY", name: "İsviçre Frangı (CHF)", assetType: "FX" as const, source: "db" as const },
        { symbol: "EUR/USD", name: "Euro / Dolar Paritesi", assetType: "FX" as const, source: "db" as const },
      ];
    }
    return [];
  }, [assetType]);

  const matchingDefaultSuggestions = useMemo(() => {
    if (!defaultSuggestions.length) return [];
    if (!inputValue) return defaultSuggestions;
    const cleanInput = inputValue.trim().toUpperCase();
    return defaultSuggestions.filter(
      (item) =>
        item.symbol.includes(cleanInput) ||
        item.name.toUpperCase().includes(cleanInput)
    );
  }, [defaultSuggestions, inputValue]);

  const matchingServerSuggestions = useMemo(() => {
    if (!suggestions.length) return [];
    if (!inputValue) return suggestions;
    const cleanInput = inputValue.trim().toUpperCase();
    return suggestions.filter(
      (item) =>
        item.symbol.includes(cleanInput) ||
        item.name.toUpperCase().includes(cleanInput)
    );
  }, [suggestions, inputValue]);

  const allOptions = useMemo(() => {
    const list: Array<{ symbol: string; name: string; isPortfolio: boolean; isDefault: boolean }> = [];
    matchingPortfolioSymbols.forEach((p) => {
      list.push({ symbol: p.symbol, name: p.name, isPortfolio: true, isDefault: false });
    });
    matchingDefaultSuggestions.forEach((d) => {
      if (!list.some(item => item.symbol === d.symbol)) {
        list.push({ symbol: d.symbol, name: d.name, isPortfolio: false, isDefault: true });
      }
    });
    matchingServerSuggestions.forEach((s) => {
      if (!list.some(item => item.symbol === s.symbol)) {
        list.push({ symbol: s.symbol, name: s.name, isPortfolio: false, isDefault: false });
      }
    });

    if (inputValue.trim().length >= 2) {
      const cleanUpper = inputValue.trim().toUpperCase();
      if (!list.some((item) => item.symbol === cleanUpper)) {
        list.push({
          symbol: cleanUpper,
          name: `${cleanUpper} (İşleme Ekle)`,
          isPortfolio: false,
          isDefault: false,
        });
      }
    }

    return list;
  }, [matchingPortfolioSymbols, matchingDefaultSuggestions, matchingServerSuggestions, inputValue]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [allOptions]);

  const selectOption = (opt: { symbol: string; name: string }) => {
    onChange(opt.symbol);
    setInputValue(opt.symbol);
    setIsOpen(false);
    if (onSelect) {
      onSelect(opt.symbol);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setActiveIndex((prev) => (prev + 1 < allOptions.length ? prev + 1 : 0));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allOptions.length - 1));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < allOptions.length) {
        selectOption(allOptions[activeIndex]);
        e.preventDefault();
      } else if (inputValue.trim()) {
        const sym = inputValue.trim().toUpperCase();
        onChange(sym);
        setIsOpen(false);
        if (onSelect) onSelect(sym);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input type="hidden" name="symbol" value={value} />
      
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value.toUpperCase());
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          if (inputValue.trim() && onSelect) {
            onSelect(inputValue.trim().toUpperCase());
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required
        autoComplete="off"
        className={inputClassName || "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"}
      />

      {isOpen && (allOptions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-2xl z-[999] py-1 divide-y divide-[var(--color-border)]">
          {allOptions.some(o => o.isPortfolio) && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] bg-[var(--color-surface-muted)]/30">
                Portföyümdeki Varlıklar
              </div>
              {allOptions.map((item, idx) => {
                if (!item.isPortfolio) return null;
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={`port-${item.symbol}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(item)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      isActive ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-semibold" : "hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <span>{item.symbol}</span>
                    <span className="text-xs text-[var(--color-muted)] truncate max-w-[200px]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {allOptions.some(o => o.isDefault) && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] bg-[var(--color-surface-muted)]/30">
                Popüler Seçenekler
              </div>
              {allOptions.map((item, idx) => {
                if (!item.isDefault) return null;
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={`def-${item.symbol}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(item)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      isActive ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-semibold" : "hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <span>{item.symbol}</span>
                    <span className="text-xs text-[var(--color-muted)] truncate max-w-[200px]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {allOptions.some(o => !o.isPortfolio && !o.isDefault) && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] bg-[var(--color-surface-muted)]/30">
                Genel Arama Sonuçları
              </div>
              {allOptions.map((item, idx) => {
                if (item.isPortfolio || item.isDefault) return null;
                const isActive = activeIndex === idx;
                return (
                  <button
                    key={`gen-${item.symbol}-${idx}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(item)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                      isActive ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-semibold" : "hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-xs text-[var(--color-muted)] truncate max-w-[200px]">{item.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {loading && (
            <div className="px-4 py-2 text-xs text-[var(--color-muted)] flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-muted)] border-t-transparent rounded-full animate-spin"></span>
              <span>Aranıyor...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

