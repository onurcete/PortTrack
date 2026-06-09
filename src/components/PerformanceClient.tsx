"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "@/context/currency";
import { Card } from "@/components/ui";
import { ASSET_META, type AssetType } from "@/lib/assets";
import { formatPercent, monthLabel, cn } from "@/lib/utils";
import { Search } from "lucide-react";

export interface ProductPerfRowDTO {
  symbol: string;
  assetType: AssetType;
  returnsTRY: (number | null)[];
  returnsUSD: (number | null)[];
  totalTRY: number | null;
  totalUSD: number | null;
}

export interface ProductPerformanceDTO {
  months: string[];
  rows: ProductPerfRowDTO[];
}

function getCellStyle(v: number | null): React.CSSProperties {
  if (v == null) return {};
  
  const abs = Math.abs(v);
  const intensity = Math.min(abs / 20, 1); // %20 ve üstü getirilerde tam renk yoğunluğuna ulaşır
  
  if (v > 0) {
    const bgLightness = 96 - intensity * 50;
    const textColor = intensity > 0.45 ? "#ffffff" : "hsl(142, 80%, 25%)";
    return {
      backgroundColor: `hsl(142, 70%, ${bgLightness}%)`,
      color: textColor,
    };
  } else if (v < 0) {
    const bgLightness = 96 - intensity * 46;
    const textColor = intensity > 0.45 ? "#ffffff" : "hsl(347, 80%, 30%)";
    return {
      backgroundColor: `hsl(347, 80%, ${bgLightness}%)`,
      color: textColor,
    };
  }
  
  return {
    backgroundColor: "var(--color-surface-muted)",
    color: "var(--color-muted)",
  };
}

export function PerformanceClient({ data }: { data: ProductPerformanceDTO }) {
  const { currency } = useCurrency();
  const isTRY = currency === "TRY";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetType, setSelectedAssetType] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"symbol" | "total">("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const processedRows = useMemo(() => {
    // 1. Map returns and total depending on active currency
    let mapped = data.rows.map((r) => ({
      ...r,
      returns: isTRY ? r.returnsTRY : r.returnsUSD,
      total: isTRY ? r.totalTRY : r.totalUSD,
    }));

    // 2. Filter by search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      mapped = mapped.filter((r) => r.symbol.toLowerCase().includes(q));
    }

    // 3. Filter by asset type
    if (selectedAssetType !== "ALL") {
      mapped = mapped.filter((r) => r.assetType === selectedAssetType);
    }

    // 4. Sort
    mapped.sort((a, b) => {
      let comp = 0;
      if (sortField === "symbol") {
        comp = a.symbol.localeCompare(b.symbol);
      } else {
        const valA = a.total ?? -999999;
        const valB = b.total ?? -999999;
        comp = valA - valB;
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return mapped;
  }, [data.rows, isTRY, searchQuery, selectedAssetType, sortField, sortOrder]);

  if (data.rows.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Ürün Performansı</h1>
        <Card className="py-16 text-center text-sm text-[var(--color-muted)]">
          Veri yok. Önce &quot;Portföy Gelişimi&quot; sayfasından geçmişi oluşturun.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ürün Performansı</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Hâlâ elinizde olan ürünlerin ay-ay getirisi ({isTRY ? "₺ TL" : "$ USD"} bazında)
        </p>
      </div>

      {/* Filtre ve Arama Barı */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Arama Kutusu */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
            <input
              type="text"
              placeholder="Sembol ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Varlık Sınıfı Filtresi */}
          <select
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            className="input max-w-[180px] cursor-pointer"
          >
            <option value="ALL">Tüm Varlıklar</option>
            {Object.keys(ASSET_META).map((type) => (
              <option key={type} value={type}>
                {ASSET_META[type as AssetType]?.label ?? type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablo Kartı */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {processedRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--color-muted)]">
              Arama kriterlerine uygun ürün bulunamadı.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/10">
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/80">
                    <button
                      onClick={() => {
                        if (sortField === "symbol") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("symbol");
                          setSortOrder("asc");
                        }
                      }}
                      className="flex items-center gap-1 hover:text-[var(--color-foreground)] font-semibold transition-colors outline-none cursor-pointer"
                    >
                      <span>Ürün</span>
                      <span className={cn(
                        "text-[10px] font-normal transition-opacity",
                        sortField === "symbol" ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35"
                      )}>
                        {sortField === "symbol" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                  {data.months.map((m) => (
                    <th key={m} className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold whitespace-nowrap border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                    <button
                      onClick={() => {
                        if (sortField === "total") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("total");
                          setSortOrder("desc");
                        }
                      }}
                      className="flex items-center gap-1 ml-auto justify-end hover:text-[var(--color-foreground)] font-semibold transition-colors outline-none cursor-pointer"
                    >
                      <span>Toplam</span>
                      <span className={cn(
                        "text-[10px] font-normal transition-opacity",
                        sortField === "total" ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35"
                      )}>
                        {sortField === "total" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRows.map((r) => (
                  <tr
                    key={r.symbol}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-muted)]/20 transition-colors group"
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/80 group-hover:bg-[var(--color-surface-muted)]/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: ASSET_META[r.assetType]?.color }}
                        />
                        <span className="font-semibold tabular-nums">{r.symbol}</span>
                      </div>
                    </td>
                    {r.returns.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-3 py-2.5 text-right text-xs font-semibold tabular-nums border-[0.5px] border-[var(--color-border)]/30 transition-colors",
                          v == null ? "text-[var(--color-muted)]/30 bg-transparent" : ""
                        )}
                        style={getCellStyle(v)}
                      >
                        {v == null ? "–" : formatPercent(v)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-bold tabular-nums border-l border-[var(--color-border)] bg-[var(--color-surface)] group-hover:bg-[var(--color-surface-muted)]/20 transition-colors",
                        r.total == null
                          ? "text-[var(--color-muted)]"
                          : r.total >= 0
                            ? "text-[var(--color-profit)]"
                            : "text-[var(--color-loss)]",
                      )}
                    >
                      {r.total == null ? "–" : formatPercent(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      
      <p className="text-xs text-[var(--color-muted)] leading-relaxed">
        Getiriler ay sonu fiyatlarına göre hesaplanır. &quot;Toplam&quot;, gösterilen dönemdeki ilk veriden bugüne fiyat değişimidir (alım-satım zamanlamasından bağımsız, ürünün kendi performansı).
      </p>
    </div>
  );
}
