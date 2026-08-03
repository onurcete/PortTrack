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
} from "lucide-react";
import { Modal } from "./Modal";
import { Badge } from "./ui";
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
  updateTransaction,
  deleteTransaction,
  confirmCsvImport,
  previewCsvImport,
  searchSymbols,
  getSymbolPrice,
} from "@/app/transactions/actions";

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

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(tx: TxDTO) {
    setEditing(tx);
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

      {/* Arama, Filtreleme ve Dışa Aktarma Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Kutusu */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sembol ara..."
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-brand)] w-full max-w-[200px]"
            />
          </div>

          {/* Tür Filtresi */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AssetType | "ALL")}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)] cursor-pointer"
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
              className="btn btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Sıfırla</span>
            </button>
          )}
        </div>

        {/* Dışa Aktarma Butonları */}
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={filtered.length === 0}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5"
            title="Excel olarak indir"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel İndir</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5"
            title="CSV olarak indir"
          >
            <Download size={14} className="text-blue-500" />
            <span>CSV İndir</span>
          </button>
        </div>
      </div>

      <BackfillStatusBanner />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
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
        title={editing ? "İşlemi Düzenle" : "Yeni İşlem"}
      >
        <TransactionForm
          editing={editing}
          transactions={transactions}
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

function TransactionForm({
  editing,
  transactions,
  onDone,
}: {
  editing: TxDTO | null;
  transactions: TxDTO[];
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

  const unitPriceRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  function onAssetChange(v: AssetType) {
    setAssetType(v);
    setCurrency(v === "FOREIGN" ? "USD" : "TRY");
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
    <form action={submit} className="space-y-5">
      {/* 1. İşlem Yönü Segmented Switcher (Alış / Satış) */}
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

      {/* 2. Varlık Türü & Sembol Seçimi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Varlık Türü */}
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

        {/* Sembol Combobox */}
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
      </div>

      {/* 3. Tarih & Para Birimi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tarih */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
              İşlem Tarihi
            </label>
            <button
              type="button"
              onClick={() => setDateInput(new Date().toISOString().slice(0, 10))}
              className="text-[10px] font-bold text-[var(--color-brand-strong)] hover:underline cursor-pointer"
            >
              Bugünü Seç
            </button>
          </div>
          <input
            type="date"
            name="date"
            required
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]"
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

      {/* 5. Live Total Summary Card */}
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

      {/* Custom Total Override (Optional) */}
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

      {/* Form Action Buttons */}
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
    </form>
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
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (val: string) => void;
  assetType: AssetType;
  transactions: TxDTO[];
  placeholder?: string;
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
    }, 400);

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
    suggestions.forEach((s) => {
      if (!list.some(item => item.symbol === s.symbol)) {
        list.push({ symbol: s.symbol, name: s.name, isPortfolio: false, isDefault: false });
      }
    });
    return list;
  }, [matchingPortfolioSymbols, matchingDefaultSuggestions, suggestions]);

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
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
      />

      {isOpen && (allOptions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl shadow-lg z-50 py-1 divide-y divide-[var(--color-border)]">
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

