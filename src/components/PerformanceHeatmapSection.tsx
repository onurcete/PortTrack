"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "@/context/currency";
import { Card } from "@/components/ui";
import { ASSET_META, type AssetType } from "@/lib/assets";
import { formatPercent, monthLabel, cn } from "@/lib/utils";
import { Search, Flame, LineChart } from "lucide-react";

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

/** Tema token'larına dayalı ısı haritası hücresi (Solarized/Harbor dahil). */
export function getCellStyle(v: number | null): React.CSSProperties {
  if (v == null) {
    return {
      backgroundColor: "var(--color-surface-muted)",
      color: "var(--color-muted)",
    };
  }

  const intensity = Math.min(Math.abs(v) / 20, 1);
  const mixPct = Math.round(10 + intensity * 45);
  const tone =
    v > 0 ? "var(--color-profit)" : v < 0 ? "var(--color-loss)" : null;

  if (!tone) {
    return {
      backgroundColor: "var(--color-surface-muted)",
      color: "var(--color-muted)",
    };
  }

  return {
    backgroundColor: `color-mix(in srgb, ${tone} ${mixPct}%, var(--color-surface))`,
    color: tone,
    fontWeight: 700,
  };
}

export function PerformanceHeatmapSection({ data }: { data: ProductPerformanceDTO }) {
  const { currency } = useCurrency();
  const isTRY = currency === "TRY";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetType, setSelectedAssetType] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"symbol" | "total">("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [period, setPeriod] = useState<"1Y" | "YTD">("1Y");

  // Get current year based on latest month in the data
  const latestYear = useMemo(() => {
    if (!data || data.months.length === 0) return new Date().getFullYear().toString();
    return data.months[data.months.length - 1].split("-")[0];
  }, [data]);

  // Compute active months and indexes
  const { activeMonths, activeIndices } = useMemo(() => {
    if (!data || data.months.length === 0) return { activeMonths: [], activeIndices: [] };
    if (period === "1Y") {
      return {
        activeMonths: data.months,
        activeIndices: data.months.map((_, i) => i),
      };
    }

    // YTD: only months of the latest year
    const indices: number[] = [];
    const months: string[] = [];
    data.months.forEach((m, i) => {
      if (m.startsWith(`${latestYear}-`)) {
        indices.push(i);
        months.push(m);
      }
    });
    return { activeMonths: months, activeIndices: indices };
  }, [data, period, latestYear]);

  const processedRows = useMemo(() => {
    if (!data || data.rows.length === 0) return [];

    // 1. Map returns and total depending on active currency and period
    let mapped = data.rows.map((r) => {
      const returnsAll = isTRY ? r.returnsTRY : r.returnsUSD;
      const returns = activeIndices.map((i) => returnsAll[i]);

      let total: number | null = null;
      if (period === "1Y") {
        total = isTRY ? r.totalTRY : r.totalUSD;
      } else {
        // Calculate compound return for YTD
        let product = 1;
        let hasValue = false;
        for (const v of returns) {
          if (v != null) {
            product *= 1 + v / 100;
            hasValue = true;
          }
        }
        total = hasValue ? (product - 1) * 100 : null;
      }

      return {
        ...r,
        returns,
        total,
      };
    });

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
  }, [data, isTRY, searchQuery, selectedAssetType, sortField, sortOrder, activeIndices, period]);

  if (!data || data.rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
              <Flame size={18} />
            </div>
            <h3 className="text-base font-black text-[var(--color-foreground)] tracking-tight">
              Ürün Getiri Isı Haritası (Heatmap)
            </h3>
          </div>
          <p className="text-xs text-[var(--color-muted)] font-medium mt-0.5 ml-10">
            Hâlâ portföyünüzde bulunan varlıkların ay ay getirisi ({isTRY ? "₺ TL" : "$ USD"} bazında)
          </p>
        </div>

        {/* Filtre ve Dönem Seçimleri */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Kutusu */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={14} />
            <input
              type="text"
              placeholder="Varlık ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 py-1.5 text-xs w-36 sm:w-44 rounded-xl"
            />
          </div>

          {/* Varlık Sınıfı Filtresi */}
          <select
            value={selectedAssetType}
            onChange={(e) => setSelectedAssetType(e.target.value)}
            className="input py-1.5 text-xs rounded-xl max-w-[150px] cursor-pointer"
          >
            <option value="ALL">Tüm Varlıklar</option>
            {Object.keys(ASSET_META).map((type) => (
              <option key={type} value={type}>
                {ASSET_META[type as AssetType]?.label ?? type}
              </option>
            ))}
          </select>

          {/* 1Y / YTD Toggle */}
          <div className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/40 shrink-0">
            <button
              type="button"
              onClick={() => setPeriod("1Y")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 cursor-pointer",
                period === "1Y"
                  ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/40"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
              )}
            >
              1 Yıl
            </button>
            <button
              type="button"
              onClick={() => setPeriod("YTD")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 cursor-pointer",
                period === "YTD"
                  ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/40"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
              )}
            >
              YTD
            </button>
          </div>
        </div>
      </div>

      {/* Isı Haritası Tablo Kartı */}
      <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-xs">
        <div className="overflow-x-auto">
          {processedRows.length === 0 ? (
            <p className="py-12 text-center text-xs text-[var(--color-muted)] font-medium">
              Arama kriterlerine uygun ürün bulunamadı.
            </p>
          ) : (
            <table className="w-full text-xs border-collapse font-sans">
              <thead className="theme-table-head">
                <tr className="text-[11px] uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border)] font-extrabold">
                  <th className="px-4 py-3 text-left sticky left-0 bg-[var(--color-table-header)] z-10 border-r border-[var(--color-border)]/80">
                    <button
                      onClick={() => {
                        if (sortField === "symbol") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("symbol");
                          setSortOrder("asc");
                        }
                      }}
                      className="flex items-center gap-1 hover:text-[var(--color-foreground)] font-black transition-colors outline-none cursor-pointer"
                    >
                      <span>Varlık</span>
                      <span
                        className={cn(
                          "text-[10px] font-normal transition-opacity",
                          sortField === "symbol" ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35",
                        )}
                      >
                        {sortField === "symbol" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                  {activeMonths.map((m) => (
                    <th key={m} className="px-3 py-3 text-right font-black whitespace-nowrap">
                      {monthLabel(m)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-black whitespace-nowrap border-l border-[var(--color-border)] bg-[var(--color-surface)]">
                    <button
                      onClick={() => {
                        if (sortField === "total") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("total");
                          setSortOrder("desc");
                        }
                      }}
                      className="flex items-center gap-1 ml-auto justify-end hover:text-[var(--color-foreground)] font-black transition-colors outline-none cursor-pointer"
                    >
                      <span>Toplam</span>
                      <span
                        className={cn(
                          "text-[10px] font-normal transition-opacity",
                          sortField === "total" ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35",
                        )}
                      >
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
                    className="theme-surface-hover border-b border-[var(--color-border)]/50 last:border-0 transition-colors group"
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/80 group-hover:bg-[var(--color-surface-hover)] transition-colors">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: ASSET_META[r.assetType]?.color }}
                        />
                        <span className="font-extrabold text-[var(--color-foreground)] tabular-nums">{r.symbol}</span>
                      </div>
                    </td>
                    {r.returns.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-3 py-2.5 text-right text-xs font-bold tabular-nums border-[0.5px] border-[var(--color-border)]/25 transition-colors",
                          v == null ? "text-[var(--color-muted)]/30 bg-transparent" : "",
                        )}
                        style={getCellStyle(v)}
                      >
                        {v == null ? "–" : formatPercent(v)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-black tabular-nums border-l border-[var(--color-border)] bg-[var(--color-surface)] group-hover:bg-[var(--color-surface-hover)] transition-colors",
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

      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-medium">
        * Getiriler ay sonu kapanış fiyatlarına göre hesaplanır. &quot;Toplam&quot;, gösterilen dönemdeki ilk veriden bugüne bileşik fiyat değişimidir.
      </p>
    </div>
  );
}
