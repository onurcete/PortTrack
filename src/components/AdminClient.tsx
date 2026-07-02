"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/app/admin/actions";
import {
  Users,
  Database,
  Play,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  LineChart,
  RefreshCw,
  Table,
  List,
  Eye,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  transactionCount: number;
  instrumentCount: number;
}

export interface DbStatsDTO {
  users: number;
  transactions: number;
  notes: number;
  priceSnapshots: number;
  fxRates: number;
  technicalAnalyses: number;
}

export interface DbColumnDTO {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DbTableDTO {
  name: string;
  rowCount: number;
  totalSize: number;
  tableSize: number;
  indexSize: number;
  columns: DbColumnDTO[];
}

export interface DbEngineDTO {
  version: string;
  databaseName: string;
  user: string;
  totalSize: string;
}

interface AdminClientProps {
  initialUsers: AdminUserDTO[];
  dbStats: DbStatsDTO;
  dbTables: DbTableDTO[];
  dbEngine: DbEngineDTO;
}

type TabType = "overview" | "users" | "actions" | "tables";

export function AdminClient({ initialUsers, dbStats, dbTables, dbEngine }: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [users, setUsers] = useState<AdminUserDTO[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [selectedSchemaTable, setSelectedSchemaTable] = useState<DbTableDTO | null>(null);

  // States for running long server operations
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, { type: "success" | "error"; message: string } | null>>({});

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Secure user deletion function via Server Action
  async function handleDeleteUser(userId: string) {
    if (userId === "default-user-id") return;
    setDeletingUserId(userId);
    try {
      const updatedList = await deleteUser(userId);
      setUsers(updatedList);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingUserId(null);
    }
  }

  // Trigger API endpoints (prices/refresh, history/backfill, analysis/run)
  async function runSystemAction(key: string, url: string, params: Record<string, string> = {}) {
    if (runningAction) return;
    setRunningAction(key);
    setActionStatus((prev) => ({ ...prev, [key]: null }));
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `${url}?${query}` : url;
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        let msg = "İşlem başarıyla tamamlandı.";
        if (data.yahoo) msg += ` (Yahoo: ${data.yahoo.snapshots} snapshot eklendi)`;
        if (data.processed) msg += ` (TEFAS: ${data.processed} ay işlendi)`;
        if (data.analyzed) msg += ` (Analiz: ${data.analyzed} enstrüman güncellendi)`;
        setActionStatus((prev) => ({
          ...prev,
          [key]: { type: "success", message: msg },
        }));
        router.refresh();
      } else {
        setActionStatus((prev) => ({
          ...prev,
          [key]: { type: "error", message: data.error || "Sunucu hatası oluştu." },
        }));
      }
    } catch (err) {
      setActionStatus((prev) => ({
        ...prev,
        [key]: { type: "error", message: (err as Error).message },
      }));
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-8">
      {/* Başlık alanı */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Admin Kontrol Paneli</h1>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Sistem verilerini izleyin, kullanıcıları yönetin ve servisleri tetikleyin</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sol Menü: Sekmeler */}
        <aside className="w-full lg:w-64 flex lg:flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "overview"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Database size={16} />
            <span>Veritabanı Durumu</span>
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "tables"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Table size={16} />
            <span>Veritabanı Detayları</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "users"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Users size={16} />
            <span>Kullanıcı Yönetimi</span>
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "actions"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <RefreshCw size={16} />
            <span>Sistem Tetikleyicileri</span>
          </button>
        </aside>

        {/* Sağ İçerik Alanı */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: Genel Bakış */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Veritabanı İstatistikleri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <StatCard title="Kayıtlı Kullanıcı" count={dbStats.users} icon={<Users className="text-cyan-500" />} />
                <StatCard title="Toplam İşlem (Tx)" count={dbStats.transactions} icon={<FileText className="text-emerald-500" />} />
                <StatCard title="Portföy Notu" count={dbStats.notes} icon={<FileText className="text-amber-500" />} />
                <StatCard title="Fiyat Kaydı (Snapshot)" count={dbStats.priceSnapshots} icon={<LineChart className="text-purple-500" />} />
                <StatCard title="Kur Kaydı (USDTRY)" count={dbStats.fxRates} icon={<Database className="text-blue-500" />} />
                <StatCard title="Teknik Analiz Raporu" count={dbStats.technicalAnalyses} icon={<Shield className="text-pink-500" />} />
              </div>

              {/* Ek bilgi kartı */}
              <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                <h3 className="font-semibold text-sm text-[var(--color-text)] mb-2">Veritabanı Depolama Hakkında</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Fiyat kayıtları (PriceSnapshots) ve Döviz Kurları (FxRates) tüm kullanıcılar tarafından ortak şekilde önbellek olarak kullanılır. 
                  Bu sayede sistemde ortak enstrümanlar için yinelenen API istekleri engellenir ve genel sistem performansı artırılır. 
                  Kullanıcılara ait İşlemler, Portföy Notları ve Enstrüman Tanımları ise şema düzeyinde tamamen birbirlerinden izole durumdadır.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Kullanıcı Yönetimi */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Kayıtlı Kullanıcılar</h2>
              <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        <th className="px-6 py-4">Kullanıcı Bilgileri</th>
                        <th className="px-6 py-4">Kayıt Tarihi</th>
                        <th className="px-6 py-4 text-center">İşlem</th>
                        <th className="px-6 py-4 text-center">Takip</th>
                        <th className="px-6 py-4 text-right">Eylemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-sm">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-[var(--color-text)]">{u.name}</div>
                            <div className="text-xs text-[var(--color-muted)]">{u.email}</div>
                          </td>
                          <td className="px-6 py-4 text-[var(--color-muted)] text-xs">
                            {new Date(u.createdAt).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-[var(--color-text)]">{u.transactionCount}</td>
                          <td className="px-6 py-4 text-center font-semibold text-[var(--color-text)]">{u.instrumentCount}</td>
                          <td className="px-6 py-4 text-right">
                            {u.id !== "default-user-id" ? (
                              <button
                                onClick={() => {
                                  if (confirm(`"${u.name}" isimli kullanıcıyı ve ona ait tüm işlemleri veritabanından tamamen silmek istediğinize emin misiniz?`)) {
                                    handleDeleteUser(u.id);
                                  }
                                }}
                                disabled={deletingUserId !== null}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                              >
                                {deletingUserId === u.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            ) : (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20">
                                Sistem Yöneticisi
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Sistem Tetikleyicileri */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Sistem Kontrol Masası</h2>
              <div className="grid grid-cols-1 gap-6">
                {/* 1. Fiyat Güncelleme */}
                <TriggerCard
                  title="Anlık Fiyat Güncelleme (Refresh Prices)"
                  description="Tüm kullanıcıların sahip olduğu enstrümanların anlık fiyatlarını ve dünün kapanış fiyatlarını çekip PriceSnapshot tablosunu günceller. (Her 30 dakikada bir otomatik çalışır)."
                  btnText="Fiyatları Güncelle"
                  onClick={() => runSystemAction("refresh", "/api/prices/refresh")}
                  isRunning={runningAction === "refresh"}
                  isAnyRunning={runningAction !== null}
                  status={actionStatus["refresh"]}
                />

                {/* 2. Yahoo Tarihçe Güncelleme */}
                <TriggerCard
                  title="Geriye Dönük Yahoo Fiyatları (Backfill Yahoo)"
                  description="BIST ve Yabancı Borsa varlıklarının ilk işlem tarihinden itibaren ay sonu kapanış fiyatlarını geriye dönük olarak çekip kaydeder."
                  btnText="Yahoo Geçmişini Güncelle"
                  onClick={() => runSystemAction("backfillYahoo", "/api/history/backfill", { phase: "yahoo" })}
                  isRunning={runningAction === "backfillYahoo"}
                  isAnyRunning={runningAction !== null}
                  status={actionStatus["backfillYahoo"]}
                />

                {/* 3. TEFAS Tarihçe Güncelleme */}
                <TriggerCard
                  title="Geriye Dönük TEFAS Fiyatları (Backfill TEFAS)"
                  description="Kullanıcı portföylerine yeni eklenen TEFAS fonlarının geçmiş ay sonu verilerini indirir. Her tıklamada 45 saniyelik paketler halinde tarihçeyi tamamlar."
                  btnText="TEFAS Geçmişini Güncelle"
                  onClick={() => runSystemAction("backfillTefas", "/api/history/backfill", { phase: "tefas" })}
                  isRunning={runningAction === "backfillTefas"}
                  isAnyRunning={runningAction !== null}
                  status={actionStatus["backfillTefas"]}
                />

                {/* 4. Teknik Analiz Tetikleme */}
                <TriggerCard
                  title="Teknik Analizleri Yenile (Run Analysis)"
                  description="Açık pozisyonu olan tüm hisse ve fonların RSI, MACD ve hareketli ortalama indikatörlerini hesaplar, yapay zeka günlük teknik analiz özetlerini yeniden yazar."
                  btnText="Analizleri Yeniden Hesapla"
                  onClick={() => runSystemAction("analysis", "/api/analysis/run")}
                  isRunning={runningAction === "analysis"}
                  isAnyRunning={runningAction !== null}
                  status={actionStatus["analysis"]}
                />
              </div>
            </div>
          )}

          {/* TAB 4: Veritabanı Detayları */}
          {activeTab === "tables" && (
            <div className="space-y-6">
              {/* Veritabanı Sistem Bilgisi */}
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Veritabanı Motor Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="text-xs text-[var(--color-muted)] font-medium">Veritabanı Motoru</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">PostgreSQL</div>
                </div>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="text-xs text-[var(--color-muted)] font-medium">Veritabanı Adı</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">{dbEngine.databaseName}</div>
                </div>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="text-xs text-[var(--color-muted)] font-medium">Bağlantı Kullanıcısı</div>
                  <div className="text-base font-bold text-[var(--color-text)] mt-1">{dbEngine.user}</div>
                </div>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="text-xs text-[var(--color-muted)] font-medium">Toplam Veritabanı Boyutu</div>
                  <div className="text-base font-bold text-[var(--color-brand)] mt-1">{dbEngine.totalSize}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-4 border-t border-[var(--color-border)]">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">Veritabanı Tabloları</h2>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5 leading-normal max-w-[800px]">{dbEngine.version}</p>
                </div>
                <a
                  href="/api/admin/db/export"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white shadow-sm transition-all text-center focus:outline-none"
                >
                  <FileText size={16} />
                  <span>Tüm Veritabanını Dışa Aktar (.json)</span>
                </a>
              </div>

              <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        <th className="px-6 py-4">Tablo Adı</th>
                        <th className="px-6 py-4 text-center">Kayıt Sayısı</th>
                        <th className="px-6 py-4 text-center">Veri Boyutu</th>
                        <th className="px-6 py-4 text-center">İndeks Boyutu</th>
                        <th className="px-6 py-4 text-center">Toplam Boyut</th>
                        <th className="px-6 py-4 text-right">Eylemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-sm">
                      {dbTables.map((t) => (
                        <tr key={t.name} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="px-6 py-4 font-semibold text-[var(--color-text)]">
                            {t.name}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-[var(--color-text)]">
                            {t.rowCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-[var(--color-muted)] text-xs">
                            {formatBytes(t.tableSize)}
                          </td>
                          <td className="px-6 py-4 text-center text-[var(--color-muted)] text-xs">
                            {formatBytes(t.indexSize)}
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-[var(--color-text)] text-xs">
                            {formatBytes(t.totalSize)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedSchemaTable(t)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
                              >
                                <Eye size={12} />
                                <span>Şemayı İncele</span>
                              </button>
                              <a
                                href={`/api/admin/db/export?table=${t.name}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
                              >
                                <FileText size={12} />
                                <span>Dışa Aktar</span>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Şema Detay Modalı */}
      {selectedSchemaTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in duration-200">
            {/* Modal Başlık */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  "{selectedSchemaTable.name}" Tablo Şeması
                </h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Toplam {selectedSchemaTable.columns.length} kolon tanımlı
                </p>
              </div>
              <button
                onClick={() => setSelectedSchemaTable(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal İçerik (Kolon Listesi) */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                    <th className="pb-3">Kolon Adı</th>
                    <th className="pb-3">Veri Tipi</th>
                    <th className="pb-3 text-right">Boş Geçilebilir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-sm">
                  {selectedSchemaTable.columns.map((c) => (
                    <tr key={c.name} className="hover:bg-[var(--color-surface-hover)]/30">
                      <td className="py-3 font-mono font-medium text-[var(--color-brand)] text-xs">
                        {c.name}
                      </td>
                      <td className="py-3 font-mono text-[var(--color-text)] text-xs">
                        {c.type}
                      </td>
                      <td className="py-3 text-right text-xs">
                        {c.nullable ? (
                          <span className="text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">Evet</span>
                        ) : (
                          <span className="text-[var(--color-muted)] font-semibold bg-[var(--color-surface-muted)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">Hayır</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Alt Alan */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] flex justify-end">
              <button
                onClick={() => setSelectedSchemaTable(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Yardımcı Bileşen: İstatistik Kartı */
interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
}

function StatCard({ title, count, icon }: StatCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition-all">
      <div>
        <div className="text-sm font-medium text-[var(--color-muted)]">{title}</div>
        <div className="text-3xl font-bold text-[var(--color-text)] mt-1.5">{count.toLocaleString()}</div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
        {icon}
      </div>
    </div>
  );
}

/* Yardımcı Bileşen: Tetikleyici Kartı */
interface TriggerCardProps {
  title: string;
  description: string;
  btnText: string;
  onClick: () => void;
  isRunning: boolean;
  isAnyRunning: boolean;
  status?: { type: "success" | "error"; message: string } | null;
}

function TriggerCard({ title, description, btnText, onClick, isRunning, isAnyRunning, status }: TriggerCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
      <div className="space-y-1.5 flex-1">
        <h3 className="font-semibold text-base text-[var(--color-text)]">{title}</h3>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-[800px]">{description}</p>
        
        {/* İşlem Sonu Bildirimi */}
        {status && (
          <div className={cn(
            "flex items-start gap-2.5 p-3 rounded-xl text-xs mt-3 max-w-[800px] border",
            status.type === "success"
              ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10"
              : "bg-rose-500/5 text-rose-500 border-rose-500/10"
          )}>
            {status.type === "success" ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <XCircle size={14} className="shrink-0 mt-0.5" />}
            <span className="leading-normal font-medium">{status.message}</span>
          </div>
        )}
      </div>
      <div className="shrink-0">
        <button
          onClick={onClick}
          disabled={isAnyRunning}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
            isRunning
              ? "bg-[var(--color-surface-hover)] text-[var(--color-text)] cursor-wait"
              : "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] focus:ring-[var(--color-brand)] disabled:opacity-50"
          )}
        >
          {isRunning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          <span>{isRunning ? "Çalışıyor..." : btnText}</span>
        </button>
      </div>
    </div>
  );
}

/** Bayt değerlerini okunabilir KB, MB, GB biçimine dönüştürür. */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
