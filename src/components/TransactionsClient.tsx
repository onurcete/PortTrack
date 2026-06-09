"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Upload, Search, Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { Badge } from "./ui";
import { ASSET_META, ASSET_TYPES, type AssetType } from "@/lib/assets";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importBundledCsv,
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
  const [toast, setToast] = useState<string | null>(null);

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
    const headers = ["Tarih", "Tür", "Sembol", "İşlem", "Birim Fiyat", "Adet", "Toplam", "Para Birimi", "Not"];
    const rows = filtered.map(t => [
      formatDate(t.date),
      ASSET_META[t.assetType]?.label ?? t.assetType,
      t.symbol,
      t.side === "BUY" ? "Alış" : "Satış",
      t.unitPrice,
      t.quantity,
      t.total,
      t.currency,
      t.note ?? ""
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
      "Para Birimi": t.currency,
      "Not": t.note ?? ""
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

  function handleImport() {
    if (
      !confirm(
        "transactions.csv içeri aktarılacak. Mevcut tüm işlemler silinip yeniden yüklenecek. Devam edilsin mi?",
      )
    )
      return;
    setImporting(true);
    startTransition(async () => {
      const res = await importBundledCsv();
      setImporting(false);
      setToast(res.message ?? (res.ok ? "Tamamlandı." : "Hata."));
      router.refresh();
      setTimeout(() => setToast(null), 4000);
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
        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={importing || pending}
            className="btn btn-outline"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">
              {importing ? "Aktarılıyor..." : "CSV İçe Aktar"}
            </span>
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

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
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
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-muted)]/60"
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
          onDone={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
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
  onDone,
}: {
  editing: TxDTO | null;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<AssetType>(
    editing?.assetType ?? "FOREIGN",
  );
  const [currency, setCurrency] = useState<"TRY" | "USD">(
    editing?.currency ?? "USD",
  );

  function onAssetChange(v: AssetType) {
    setAssetType(v);
    setCurrency(v === "FOREIGN" ? "USD" : "TRY");
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = editing
        ? await updateTransaction(editing.id, formData)
        : await createTransaction(formData);
      if (res.ok) onDone();
      else setError(res.message ?? "Hata oluştu.");
    });
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]";
  const labelCls = "block text-xs font-semibold text-[var(--color-muted)] mb-1.5";

  return (
    <form action={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tarih</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={
              editing ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>İşlem Tipi</label>
          <select
            name="side"
            defaultValue={editing?.side ?? "BUY"}
            className={inputCls}
          >
            <option value="BUY">Alış</option>
            <option value="SELL">Satış</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tür</label>
          <select
            name="assetType"
            value={assetType}
            onChange={(e) => onAssetChange(e.target.value as AssetType)}
            className={inputCls}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_META[t].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sembol</label>
          <input
            name="symbol"
            required
            defaultValue={editing?.symbol ?? ""}
            placeholder="AAPL, GTL, BTC/TRY"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Adet</label>
          <input
            name="quantity"
            type="number"
            step="any"
            required
            defaultValue={editing?.quantity ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Birim Fiyat</label>
          <input
            name="unitPrice"
            type="number"
            step="any"
            required
            defaultValue={editing?.unitPrice ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Para Birimi</label>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "TRY" | "USD")}
            className={inputCls}
          >
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Toplam (boş bırakılırsa adet × birim fiyat)
        </label>
        <input
          name="total"
          type="number"
          step="any"
          defaultValue={editing?.total ?? ""}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Not (opsiyonel)</label>
        <input name="note" defaultValue={editing?.note ?? ""} className={inputCls} />
      </div>

      {error && <p className="text-sm text-[var(--color-loss)]">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
