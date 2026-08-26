"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
  Activity,
  LogIn,
  Clock,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Mail,
  Zap,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MessageSquare,
  Lightbulb,
  Bug,
  HelpCircle,
  Upload,
  AlertTriangle,
  Sparkles,
  Send,
  CheckSquare,
  Square,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeedbackDTO {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  type: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
}

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

export interface SystemLogDTO {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  status: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface UserStatDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  loginCount?: number;
  activeVisitCount?: number;
  transactionCount: number;
  totalSessions: number;
  lastActive: string | null;
}

export interface LogsDataResponse {
  logs: SystemLogDTO[];
  userStats: UserStatDTO[];
  actionCounts: {
    totalLogins: number;
    totalActiveVisits: number;
    totalManualRefreshes: number;
    totalCronRefreshes: number;
    totalDailyDigests: number;
  };
  dailyLoginsSeries: Array<{ date: string; count: number }>;
}

type TabType = "logs" | "overview" | "users" | "actions" | "tables" | "browse" | "feedback";

interface BrowseState {
  table: string;
  rows: any[];
  columns: Array<{ name: string; type: string; nullable: boolean; isVirtual?: boolean }>;
  pagination: { page: number; pageSize: number; totalRows: number; totalPages: number };
  sort: { column: string; direction: string };
  hasUserJoin: boolean;
  loading: boolean;
  search: string;
  filterCol: string | null;
  filterVal: string | null;
}

export function AdminClient({ initialUsers, dbStats, dbTables, dbEngine }: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("logs");
  const [users, setUsers] = useState<AdminUserDTO[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [selectedSchemaTable, setSelectedSchemaTable] = useState<DbTableDTO | null>(null);

  // System Logs & Analytics State
  const [logsData, setLogsData] = useState<LogsDataResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLogDetails, setSelectedLogDetails] = useState<SystemLogDTO | null>(null);

  // User Stats Sorting State (Girilen işlem, son aktif görülme, üye olma tarihi vb.)
  const [userSortField, setUserSortField] = useState<"transactions" | "lastActive" | "createdAt" | "sessions" | "name">("lastActive");
  const [userSortOrder, setUserSortOrder] = useState<"asc" | "desc">("desc");

  const sortedUserStats = useMemo(() => {
    if (!logsData?.userStats) return [];
    return [...logsData.userStats].sort((a, b) => {
      let cmp = 0;
      if (userSortField === "transactions") {
        cmp = (a.transactionCount ?? 0) - (b.transactionCount ?? 0);
      } else if (userSortField === "sessions") {
        cmp = (a.totalSessions ?? 0) - (b.totalSessions ?? 0);
      } else if (userSortField === "lastActive") {
        const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        cmp = timeA - timeB;
      } else if (userSortField === "createdAt") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      } else if (userSortField === "name") {
        cmp = (a.name || a.email).localeCompare(b.name || b.email, "tr");
      }
      return userSortOrder === "desc" ? -cmp : cmp;
    });
  }, [logsData?.userStats, userSortField, userSortOrder]);

  function handleToggleUserSort(field: "transactions" | "lastActive" | "createdAt" | "sessions" | "name") {
    if (userSortField === field) {
      setUserSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setUserSortField(field);
      setUserSortOrder("desc");
    }
  }

  // States for running long server operations
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, { type: "success" | "error"; message: string } | null>>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Feedbacks State
  const [feedbacks, setFeedbacks] = useState<FeedbackDTO[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>("ALL");
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);

  // DB Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<"overwrite" | "merge">("overwrite");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleRestoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return;
    setIsRestoring(true);
    setRestoreMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", restoreFile);

      const res = await fetch(`/api/admin/db/restore?mode=${restoreMode}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setRestoreMessage({
          type: "success",
          text: data.message || "Veritabanı yedeği başarıyla yüklendi ve sistem güncellendi.",
        });
        setTimeout(() => {
          router.refresh();
        }, 1800);
      } else {
        setRestoreMessage({
          type: "error",
          text: data.error || "Geri yükleme işlemi sırasında hata oluştu.",
        });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: "error",
        text: err?.message || "Sunucuyla bağlantı kurulurken hata oluştu.",
      });
    } finally {
      setIsRestoring(false);
    }
  }

  async function fetchFeedbacks() {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (res.ok && data.ok) {
        setFeedbacks(data.feedbacks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingFeedbacks(false);
    }
  }

  async function updateFeedbackStatus(id: string, status: string) {
    setUpdatingFeedbackId(id);
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status } : f))
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingFeedbackId(null);
    }
  }

  // Feedback Prompt Trigger Modal State
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptTargetType, setPromptTargetType] = useState<"ALL" | "SELECTED">("ALL");
  const [promptSelectedUserIds, setPromptSelectedUserIds] = useState<string[]>([]);
  const [promptUserSearch, setPromptUserSearch] = useState<string>("");
  const [promptTitle, setPromptTitle] = useState<string>("PortTrack'i Birlikte Geliştirelim! 💡");
  const [promptMessage, setPromptMessage] = useState<string>(
    "Görüşleriniz bizim için çok değerli. Sitede görmek istediğiniz yeni özellikler, öneri veya karşılaştığınız sorunları bizimle paylaşabilirsiniz."
  );
  const [triggeringPrompt, setTriggeringPrompt] = useState(false);
  const [promptTriggerResult, setPromptTriggerResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [promptStats, setPromptStats] = useState<{ pending: number; completed: number; dismissed: number; total: number } | null>(null);
  const [recentPromptsList, setRecentPromptsList] = useState<any[]>([]);
  const [loadingPromptStats, setLoadingPromptStats] = useState(false);

  async function fetchPromptStats() {
    setLoadingPromptStats(true);
    try {
      const res = await fetch("/api/admin/feedback/trigger");
      const data = await res.json();
      if (res.ok && data.ok) {
        setPromptStats(data.stats);
        setRecentPromptsList(data.prompts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPromptStats(false);
    }
  }

  async function handleTriggerPrompt() {
    if (promptTargetType === "SELECTED" && promptSelectedUserIds.length === 0) {
      setPromptTriggerResult({
        type: "error",
        message: "Lütfen en az bir kullanıcı seçiniz.",
      });
      return;
    }

    setTriggeringPrompt(true);
    setPromptTriggerResult(null);

    try {
      const res = await fetch("/api/admin/feedback/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: promptTargetType,
          userIds: promptTargetType === "SELECTED" ? promptSelectedUserIds : undefined,
          title: promptTitle.trim(),
          message: promptMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setPromptTriggerResult({
          type: "success",
          message: data.message || "Geri bildirim pop-up'ı başarıyla tetiklendi!",
        });
        fetchPromptStats();
        if (promptTargetType === "SELECTED") {
          setPromptSelectedUserIds([]);
        }
      } else {
        setPromptTriggerResult({
          type: "error",
          message: data.error || "Tetikleme sırasında hata oluştu.",
        });
      }
    } catch (err: any) {
      setPromptTriggerResult({
        type: "error",
        message: err?.message || "Sunucuyla bağlantı kurulamadı.",
      });
    } finally {
      setTriggeringPrompt(false);
    }
  }

  // Data Browser State
  const [browse, setBrowse] = useState<BrowseState>({
    table: "",
    rows: [],
    columns: [],
    pagination: { page: 1, pageSize: 50, totalRows: 0, totalPages: 0 },
    sort: { column: "", direction: "DESC" },
    hasUserJoin: false,
    loading: false,
    search: "",
    filterCol: null,
    filterVal: null,
  });

  async function fetchBrowseData(
    tableName: string,
    page = 1,
    sortCol?: string,
    sortDir?: string,
    search?: string,
    filterCol?: string | null,
    filterVal?: string | null
  ) {
    setBrowse((prev) => ({ ...prev, loading: true, table: tableName }));
    try {
      const params = new URLSearchParams({ table: tableName, page: String(page), pageSize: "50" });
      if (sortCol) params.set("sort", sortCol);
      if (sortDir) params.set("dir", sortDir);
      if (search) params.set("search", search);
      if (filterCol && filterVal) {
        params.set("filterCol", filterCol);
        params.set("filterVal", filterVal);
      }
      const res = await fetch(`/api/admin/db/browse?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setBrowse({
          table: tableName,
          rows: data.rows,
          columns: data.columns,
          pagination: data.pagination,
          sort: data.sort,
          hasUserJoin: Boolean(data.hasUserJoin),
          loading: false,
          search: search || "",
          filterCol: filterCol || null,
          filterVal: filterVal || null,
        });
      } else {
        setBrowse((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setBrowse((prev) => ({ ...prev, loading: false }));
    }
  }

  function openBrowseTable(tableName: string) {
    setActiveTab("browse");
    fetchBrowseData(tableName);
  }

  // Load system logs data
  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setLogsData(data);
      }
    } catch (err) {
      console.error("Loglar yuklenirken hata:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, actionFilter, statusFilter]);

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
        if (data.sentCount !== undefined) msg += ` (${data.sentCount}/${data.totalTargets} kullanıcının maili iletildi)`;
        setActionStatus((prev) => ({
          ...prev,
          [key]: { type: "success", message: msg },
        }));
        router.refresh();
        if (activeTab === "logs") fetchLogs();
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><LogIn size={11} /> Açık Giriş</span>;
      case "ACTIVE_VISIT":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><Activity size={11} /> Aktif Ziyaret</span>;
      case "LOGIN_FAILED":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle size={11} /> Başarısız Giriş</span>;
      case "PRICE_REFRESH_MANUAL":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><RefreshCw size={11} /> Manuel Fiyat</span>;
      case "CRON_PRICE_REFRESH":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Zap size={11} /> Cron Fiyat</span>;
      case "CRON_DAILY_DIGEST":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Mail size={11} /> Bülten Maili</span>;
      case "FEEDBACK_PROMPT_TRIGGERED":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Sparkles size={11} /> Pop-up Tetiklendi</span>;
      case "FEEDBACK_SUBMITTED":
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><MessageSquare size={11} /> Geri Bildirim Geldi</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{action}</span>;
    }
  };

  const maxLoginsCount = logsData?.dailyLoginsSeries
    ? Math.max(...logsData.dailyLoginsSeries.map((s) => s.count), 1)
    : 1;

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
            <p className="text-sm text-[var(--color-muted)] mt-0.5">Sistem hareketlerini, kullanıcı girişlerini ve servis günlüklerini izleyin</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sol Menü: Sekmeler */}
        <aside className="w-full lg:w-64 flex lg:flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "logs"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Activity size={16} />
            <span>Sistem Logları & Analiz</span>
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "overview"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
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
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
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
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Users size={16} />
            <span>Kullanıcı Yönetimi</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("feedback");
              fetchFeedbacks();
            }}
            className={cn(
              "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full cursor-pointer select-none",
              activeTab === "feedback"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={16} />
              <span>Geri Bildirimler</span>
            </div>
            {feedbacks.filter((f) => f.status === "OPEN").length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-black">
                {feedbacks.filter((f) => f.status === "OPEN").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "actions"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <RefreshCw size={16} />
            <span>Sistem Tetikleyicileri</span>
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left w-full",
              activeTab === "browse"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20 font-bold"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            )}
          >
            <Eye size={16} />
            <span>Veri Tarayıcı</span>
          </button>
        </aside>

        {/* Sağ İçerik Alanı */}
        <main className="flex-1 min-w-0">
          {/* TAB 0: Sistem Logları & Analiz */}
          {activeTab === "logs" && (
            <div className="space-y-8">
              {/* Özet Metrik Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Açık Girişler</span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <LogIn size={16} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[var(--color-text)]">
                    {logsData?.actionCounts.totalLogins ?? "-"}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">Formla oturum açma</span>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Aktif Ziyaretler</span>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Activity size={16} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[var(--color-text)]">
                    {logsData?.actionCounts.totalActiveVisits ?? "-"}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">Çerezle otomatik kullanım</span>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Manuel Fiyat</span>
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <RefreshCw size={16} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[var(--color-text)]">
                    {logsData?.actionCounts.totalManualRefreshes ?? "-"}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">Butonla güncelleme</span>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Cron Fiyat</span>
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                      <Zap size={16} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[var(--color-text)]">
                    {logsData?.actionCounts.totalCronRefreshes ?? "-"}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">Zamanlanmış otomatik</span>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">Bülten Mailleri</span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Mail size={16} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-[var(--color-text)]">
                    {logsData?.actionCounts.totalDailyDigests ?? "-"}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block">İletilen günlük özetler</span>
                </div>
              </div>

              {/* Kullanıcı Giriş & Aktif Ziyaret İstatistik Tablosu */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
                      <Users size={18} className="text-[var(--color-brand)]" />
                      Kullanıcı Aktivite & Oturum İstatistikleri
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      Kullanıcıların toplam oturumları, girdikleri işlem sayıları, üyelik ve son görülme zamanları
                    </p>
                  </div>

                  {/* Sıralama Hızlı Seçim Butonları */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)] text-xs">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-muted)] px-1.5">Sırala:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleUserSort("transactions")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                        userSortField === "transactions"
                          ? "bg-[var(--color-brand)] text-white shadow-xs"
                          : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      )}
                    >
                      <span>İşlem</span>
                      {userSortField === "transactions" && (
                        userSortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUserSort("lastActive")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                        userSortField === "lastActive"
                          ? "bg-[var(--color-brand)] text-white shadow-xs"
                          : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      )}
                    >
                      <span>Son Aktif</span>
                      {userSortField === "lastActive" && (
                        userSortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUserSort("createdAt")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                        userSortField === "createdAt"
                          ? "bg-[var(--color-brand)] text-white shadow-xs"
                          : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      )}
                    >
                      <span>Üyelik</span>
                      {userSortField === "createdAt" && (
                        userSortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUserSort("sessions")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                        userSortField === "sessions"
                          ? "bg-[var(--color-brand)] text-white shadow-xs"
                          : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      )}
                    >
                      <span>Oturum</span>
                      {userSortField === "sessions" && (
                        userSortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] font-semibold uppercase text-[10px]">
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
                          onClick={() => handleToggleUserSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            <span>Kullanıcı & E-Posta</span>
                            {userSortField === "name" && (userSortOrder === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                          </div>
                        </th>
                        <th className="py-3 px-3">Rol</th>
                        <th
                          className="py-3 px-3 text-center cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
                          onClick={() => handleToggleUserSort("transactions")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Girilen İşlem</span>
                            {userSortField === "transactions" ? (
                              userSortOrder === "desc" ? <ArrowDown size={11} className="text-emerald-400" /> : <ArrowUp size={11} className="text-emerald-400" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 text-center cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
                          onClick={() => handleToggleUserSort("sessions")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Toplam Oturum</span>
                            {userSortField === "sessions" ? (
                              userSortOrder === "desc" ? <ArrowDown size={11} className="text-[var(--color-brand)]" /> : <ArrowUp size={11} className="text-[var(--color-brand)]" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 text-center cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
                          onClick={() => handleToggleUserSort("createdAt")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>Üye Olma Tarihi</span>
                            {userSortField === "createdAt" ? (
                              userSortOrder === "desc" ? <ArrowDown size={11} className="text-cyan-400" /> : <ArrowUp size={11} className="text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 text-right cursor-pointer hover:text-[var(--color-text)] transition-colors select-none"
                          onClick={() => handleToggleUserSort("lastActive")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Son Aktif Görülme</span>
                            {userSortField === "lastActive" ? (
                              userSortOrder === "desc" ? <ArrowDown size={11} className="text-purple-400" /> : <ArrowUp size={11} className="text-purple-400" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {sortedUserStats.map((u) => (
                        <tr key={u.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[var(--color-text)]">{u.name}</div>
                            <div className="text-[11px] text-[var(--color-muted)]">{u.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", u.role === "ADMIN" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20")}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
                              {u.transactionCount ?? 0} İşlem
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[var(--color-text)] tabular-nums">
                            {u.totalSessions} Oturum
                          </td>
                          <td className="py-3 px-3 text-center text-[var(--color-muted)] tabular-nums">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
                              : "-"}
                          </td>
                          <td className="py-3 px-3 text-right text-[var(--color-muted)] tabular-nums">
                            {u.lastActive ? (
                              <span className="font-medium text-[var(--color-text)]">
                                {new Date(u.lastActive).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--color-muted)] italic">Henüz aktifleşmedi</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Son 14 Günün Giriş Grafiği */}
              {logsData?.dailyLoginsSeries && logsData.dailyLoginsSeries.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        Son 14 Günün Kullanım Yoğunluğu
                      </h3>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">Günlere göre sisteme yapılan giriş ve aktif kullanım grafiği</p>
                    </div>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
                    {logsData.dailyLoginsSeries.map((item, idx) => {
                      const heightPct = Math.max(12, Math.round((item.count / maxLoginsCount) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                          <span className="text-[10px] font-bold text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.count}
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={cn(
                              "w-full rounded-t-lg transition-all duration-200",
                              item.count > 0 ? "bg-emerald-500/80 group-hover:bg-emerald-400" : "bg-[var(--color-border)]/40"
                            )}
                          />
                          <span className="text-[9px] font-medium text-[var(--color-muted)] truncate w-full text-center">
                            {item.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filtrelenebilir Sistem Logları Tablosu */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
                      <Clock size={18} className="text-purple-400" />
                      Canlı Sistem Eylem & Denetim Logları
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">Tüm kullanıcı ve sistem eylemlerinin anlık zaman damgalı kayıtları</p>
                  </div>

                  {/* Filtreler */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                      <input
                        type="text"
                        placeholder="E-posta, IP veya detay ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)] w-48 sm:w-60"
                      />
                    </div>

                    {/* Action Filter Dropdown */}
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)]"
                    >
                      <option value="ALL">Tüm Eylemler</option>
                      <option value="LOGIN">Kullanıcı Girişi (LOGIN)</option>
                      <option value="ACTIVE_VISIT">Aktif Ziyaret (Session Active)</option>
                      <option value="LOGIN_FAILED">Başarısız Giriş</option>
                      <option value="PRICE_REFRESH_MANUAL">Manuel Fiyat Tıklama</option>
                      <option value="CRON_PRICE_REFRESH">Otomatik Cron Fiyat</option>
                      <option value="CRON_DAILY_DIGEST">Günlük Bülten Maili</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-brand)]"
                    >
                      <option value="ALL">Tüm Durumlar</option>
                      <option value="SUCCESS">Başarılı</option>
                      <option value="FAILED">Hatalı</option>
                    </select>

                    <button
                      onClick={fetchLogs}
                      disabled={loadingLogs}
                      className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                      title="Yenile"
                    >
                      <RefreshCw size={14} className={cn(loadingLogs && "animate-spin")} />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] font-semibold uppercase">
                        <th className="py-3 px-3">Tarih / Saat</th>
                        <th className="py-3 px-3">Eylem</th>
                        <th className="py-3 px-3">Kullanıcı</th>
                        <th className="py-3 px-3">Durum</th>
                        <th className="py-3 px-3">IP Adresi</th>
                        <th className="py-3 px-3 text-right">Detaylar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {loadingLogs ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[var(--color-muted)]">
                            <Loader2 size={20} className="animate-spin inline mr-2 text-[var(--color-brand)]" />
                            Loglar yükleniyor...
                          </td>
                        </tr>
                      ) : !logsData?.logs || logsData.logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[var(--color-muted)]">
                            Henüz kayıtlı sistem logu bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        logsData.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--color-surface-hover)]">
                            <td className="py-3 px-3 text-[var(--color-text)] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                            <td className="py-3 px-3 font-medium text-[var(--color-text)]">
                              {log.userEmail || <span className="text-[var(--color-muted)] italic">Sistem (Cron)</span>}
                            </td>
                            <td className="py-3 px-3">
                              {log.status === "SUCCESS" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                  <CheckCircle size={12} /> Başarılı
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                  <XCircle size={12} /> Hatalı
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[var(--color-muted)] font-mono text-[11px]">
                              {log.ipAddress || "-"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedLogDetails(log)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-xs text-[var(--color-brand)] font-medium transition-colors"
                              >
                                İncele
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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

              {/* Veritabanı Sunucu Bilgisi */}
              <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                <h3 className="text-base font-semibold text-[var(--color-text)] mb-4">Veritabanı Motoru & Bağlantı</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--color-muted)] block font-medium mb-1">Veritabanı Adı</span>
                    <span className="font-semibold text-[var(--color-text)]">{dbEngine.databaseName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block font-medium mb-1">Kullanıcı</span>
                    <span className="font-semibold text-[var(--color-text)]">{dbEngine.user}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block font-medium mb-1">Toplam Boyut</span>
                    <span className="font-semibold text-[var(--color-brand)]">{dbEngine.totalSize}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block font-medium mb-1">PostgreSQL Sürümü</span>
                    <span className="font-semibold text-[var(--color-text)] truncate block" title={dbEngine.version}>
                      {dbEngine.version}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Veritabanı Detayları (Tablo İstatistikleri & Şemaları) */}
          {activeTab === "tables" && (
            <div className="space-y-6">
              {/* Afet Kurtarma & Veritabanı Yedekleme Kartı */}
              <div className="rounded-2xl border border-[var(--color-brand)]/30 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-brand)]/10 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="text-[var(--color-brand)]" size={20} />
                      <h2 className="text-base font-extrabold text-[var(--color-text)]">
                        Veritabanı Tam Yedekleme & Afet Kurtarma (Disaster Recovery)
                      </h2>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] max-w-3xl leading-relaxed">
                      Veritabanınızın tüm tablo verilerini (Kullanıcılar, İşlemler, Portföy Bakiyeleri, Fiyat Geçmişleri, Notlar) tek tıkla yapılandırılmış JSON formatında indirin veya olası bir veri kaybında yedeğinizden tam sistem geri yüklemesi yapın.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <a
                      href="/api/admin/db/export"
                      download="porttrack_full_database.json"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-strong)] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      <Download size={16} /> Tüm Veritabanını İndir (JSON)
                    </a>
                    <button
                      onClick={() => {
                        setIsRestoreModalOpen(true);
                        setRestoreFile(null);
                        setRestoreMessage(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
                    >
                      <Upload size={16} /> Yedekten Geri Yükle (Restore)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <h2 className="text-base font-semibold text-[var(--color-text)]">Tablo Metrikleri & Şema Yapısı</h2>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {dbTables.map((table) => (
                  <div key={table.name} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--color-text)] font-mono">{table.name}</h3>
                        <span className="text-xs text-[var(--color-muted)]">{table.rowCount.toLocaleString("tr-TR")} Satır Kayıt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openBrowseTable(table.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-brand)]/10 hover:bg-[var(--color-brand)]/20 text-[var(--color-brand)] text-xs font-bold transition-colors border border-[var(--color-brand)]/20"
                          title={`${table.name} tablosunun verilerini incele`}
                        >
                          <Eye size={13} /> Verilere Göz At
                        </button>
                        <a
                          href={`/api/admin/db/export?table=${table.name}`}
                          download={`porttrack_table_${table.name}.json`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors border border-emerald-500/20"
                          title={`${table.name} tablosunu JSON olarak indir`}
                        >
                          <Download size={13} /> İndir
                        </a>
                        <button
                          onClick={() => setSelectedSchemaTable(table)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-brand)] text-xs font-semibold transition-colors border border-[var(--color-border)]"
                        >
                          <Table size={13} /> Şema
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]/50">
                        <span className="text-[var(--color-muted)] text-[10px] block">Toplam Boyut</span>
                        <span className="font-bold text-[var(--color-text)]">{(table.totalSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]/50">
                        <span className="text-[var(--color-muted)] text-[10px] block">Veri Boyutu</span>
                        <span className="font-bold text-[var(--color-text)]">{(table.tableSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]/50">
                        <span className="text-[var(--color-muted)] text-[10px] block">İndeks Boyutu</span>
                        <span className="font-bold text-[var(--color-text)]">{(table.indexSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Kullanıcı Yönetimi */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Sistem Kullanıcıları ({users.length})</h2>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] font-semibold uppercase">
                        <th className="py-3.5 px-4">Kullanıcı</th>
                        <th className="py-3.5 px-4">E-Posta</th>
                        <th className="py-3.5 px-4 text-center">İşlem (Tx)</th>
                        <th className="py-3.5 px-4 text-center">Takip Varlıkları</th>
                        <th className="py-3.5 px-4 text-right">Kayıt Tarihi</th>
                        <th className="py-3.5 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-[var(--color-surface-hover)]">
                          <td className="py-3.5 px-4 font-semibold text-[var(--color-text)]">{u.name || "Kullanıcı"}</td>
                          <td className="py-3.5 px-4 text-[var(--color-muted)]">{u.email}</td>
                          <td className="py-3.5 px-4 text-center font-bold">{u.transactionCount}</td>
                          <td className="py-3.5 px-4 text-center font-bold">{u.instrumentCount}</td>
                          <td className="py-3.5 px-4 text-right text-[var(--color-muted)]">
                            {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {u.id === "default-user-id" ? (
                              <span className="text-[10px] text-[var(--color-muted)] italic">Varsayılan Yönetici</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={deletingUserId === u.id}
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                                title="Kullanıcıyı Sil"
                              >
                                {deletingUserId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
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

          {/* TAB 4: Sistem Tetikleyicileri */}
          {activeTab === "actions" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Manuel Sistem Tetikleyicileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Action 1: Fiyatları Yenile */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
                      <RefreshCw size={18} className="text-blue-400" /> Fiyatları ve Kurları Yenile
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
                      Yahoo Finance, TEFAS ve FX API kaynaklarından portföydeki tüm varlıkların güncel fiyatlarını anlık sorgular.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => runSystemAction("prices", "/api/prices/refresh")}
                      disabled={runningAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-strong)] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {runningAction === "prices" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                      <span>Fiyat Güncellemesini Başlat</span>
                    </button>

                    {actionStatus["prices"] && (
                      <p className={cn("text-xs mt-3 flex items-center gap-1.5 font-medium", actionStatus["prices"]?.type === "success" ? "text-emerald-400" : "text-rose-400")}>
                        {actionStatus["prices"]?.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {actionStatus["prices"]?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action 2: TEFAS Geçmiş Ayları Tamamla */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
                      <Database size={18} className="text-purple-400" /> TEFAS Fon Geçmişini Tamamla
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
                      Portföydeki TEFAS fonlarının eksik geçmiş ay sonu fiyat verilerini toplu olarak çekip veritabanına işler.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => runSystemAction("tefas", "/api/cron")}
                      disabled={runningAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {runningAction === "tefas" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                      <span>TEFAS Geçmişini Doldur</span>
                    </button>

                    {actionStatus["tefas"] && (
                      <p className={cn("text-xs mt-3 flex items-center gap-1.5 font-medium", actionStatus["tefas"]?.type === "success" ? "text-emerald-400" : "text-rose-400")}>
                        {actionStatus["tefas"]?.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {actionStatus["tefas"]?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action 3: Admin Bülten Maili Gönder (Test) */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
                      <Mail size={18} className="text-amber-400" /> Admin Bülten Maili Gönder (Test)
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
                      Sadece Admin e-posta adreslerine (<code className="text-amber-400 font-mono">ceteonur@gmail.com, denizbag@gmail.com</code>) güncel portföy özet bültenini test amaçlı anlık olarak gönderir.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => runSystemAction("admin_mail", "/api/cron/daily-digest", { test: "1" })}
                      disabled={runningAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {runningAction === "admin_mail" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      <span>Admin Maili Gönder (Test)</span>
                    </button>

                    {actionStatus["admin_mail"] && (
                      <p className={cn("text-xs mt-3 flex items-center gap-1.5 font-medium", actionStatus["admin_mail"]?.type === "success" ? "text-emerald-400" : "text-rose-400")}>
                        {actionStatus["admin_mail"]?.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {actionStatus["admin_mail"]?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action 4: Tüm Kullanıcılara Bülten Maili Gönder */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
                      <Users size={18} className="text-emerald-400" /> Tüm Kullanıcılara Mail Gönder
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
                      Sistemde kayıtlı e-posta adresi olan tüm kullanıcılara kişiselleştirilmiş günlük portföy özet bültenini toplu olarak gönderir.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => {
                        if (confirm("Sistemdeki TÜM kullanıcılara bülten e-postası gönderilecek. Onaylıyor musunuz?")) {
                          runSystemAction("all_users_mail", "/api/cron/daily-digest");
                        }
                      }}
                      disabled={runningAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {runningAction === "all_users_mail" ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      <span>Tüm Kullanıcılara Mail Gönder</span>
                    </button>

                    {actionStatus["all_users_mail"] && (
                      <p className={cn("text-xs mt-3 flex items-center gap-1.5 font-medium", actionStatus["all_users_mail"]?.type === "success" ? "text-emerald-400" : "text-rose-400")}>
                        {actionStatus["all_users_mail"]?.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {actionStatus["all_users_mail"]?.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action 5: Kullanıcı Geri Bildirim & İstek-Öneri Pop-up'ı Tetikle */}
                <div className="rounded-2xl border border-[var(--color-brand)]/40 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-brand-soft)]/20 p-6 flex flex-col justify-between shadow-sm md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] text-[11px] font-extrabold mb-1">
                        <Sparkles size={12} />
                        <span>Kullanıcı Etkileşim Aracı</span>
                      </div>
                      <h3 className="font-black text-base text-[var(--color-foreground)] flex items-center gap-2">
                        <MessageSquare size={18} className="text-[var(--color-brand)]" /> Geri Bildirim & İstek-Öneri Pop-up'ı Tetikle
                      </h3>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                        Kullanıcıların bir sonraki siteye girişlerinde karşılarına <strong>tek seferlik</strong> zarif bir anket ve istek/öneri/yorum penceresi çıkarır. Tüm kullanıcılara veya seçtiğiniz özel kullanıcılara gönderebilirsiniz.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPromptModalOpen(true);
                          setPromptTriggerResult(null);
                          fetchPromptStats();
                        }}
                        className="py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
                      >
                        <Sparkles size={16} />
                        <span>Pop-up Yönet & Tetikle</span>
                      </button>
                    </div>
                  </div>

                  {promptStats && (
                    <div className="mt-5 pt-4 border-t border-[var(--color-border)]/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/50">
                        <span className="text-[10px] text-[var(--color-muted)] font-bold block">Toplam Tetiklenen</span>
                        <span className="text-sm font-black text-[var(--color-foreground)]">{promptStats.total}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <span className="text-[10px] font-bold block">Giriş Bekleyen</span>
                        <span className="text-sm font-black">{promptStats.pending}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                        <span className="text-[10px] font-bold block">Yanıtlanan / Alınan</span>
                        <span className="text-sm font-black">{promptStats.completed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400">
                        <span className="text-[10px] font-bold block">Kapatılan</span>
                        <span className="text-sm font-black">{promptStats.dismissed}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Veri Tarayıcı */}
          {activeTab === "browse" && (
            <div className="space-y-6">
              {/* Tablo Seçici */}
              {!browse.table ? (
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Tablo Seçin</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {dbTables.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => openBrowseTable(t.name)}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-brand)]/30 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Table size={14} className="text-[var(--color-brand)]" />
                          <span className="font-bold text-sm text-[var(--color-text)] font-mono">{t.name}</span>
                        </div>
                        <span className="text-xs text-[var(--color-muted)]">{t.rowCount.toLocaleString("tr-TR")} kayıt · {t.columns.length} kolon</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Header: Tablo adı + Geri */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBrowse((prev) => ({ ...prev, table: "", rows: [], columns: [], filterCol: null, filterVal: null, search: "" }))}
                        className="p-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] transition-colors"
                        title="Tablo Listesine Dön"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div>
                        <h2 className="text-lg font-bold text-[var(--color-text)] font-mono flex items-center gap-2">
                          <Table size={18} className="text-[var(--color-brand)]" />
                          {browse.table}
                        </h2>
                        <span className="text-xs text-[var(--color-muted)]">
                          {browse.pagination.totalRows.toLocaleString("tr-TR")} toplam kayıt
                          {browse.filterCol && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              Filtre: {browse.filterCol} = {browse.filterVal}
                              <button
                                onClick={() => fetchBrowseData(browse.table, 1, browse.sort.column, browse.sort.direction, browse.search, null, null)}
                                className="ml-1 hover:text-amber-200"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Arama kutusu */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                      <input
                        type="text"
                        placeholder="Metin ara..."
                        defaultValue={browse.search}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            fetchBrowseData(browse.table, 1, browse.sort.column, browse.sort.direction, (e.target as HTMLInputElement).value, browse.filterCol, browse.filterVal);
                          }
                        }}
                        className="pl-9 pr-3 py-2 w-full sm:w-64 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand)]/50"
                      />
                    </div>
                  </div>

                  {/* Loading */}
                  {browse.loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={28} className="animate-spin text-[var(--color-brand)]" />
                      <span className="ml-3 text-sm text-[var(--color-muted)]">Veriler yükleniyor...</span>
                    </div>
                  ) : (
                    <>
                      {/* Data Grid */}
                      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                                <th className="py-3 px-3 text-[var(--color-muted)] font-semibold text-[10px] uppercase">#</th>
                                {browse.columns.map((col) => {
                                  const isUserCol = col.name === "__userName";
                                  const displayName = isUserCol ? "Kullanıcı Adı" : col.name;
                                  return (
                                    <th
                                      key={col.name}
                                      onClick={() => {
                                        if (isUserCol) return;
                                        const newDir = browse.sort.column === col.name && browse.sort.direction === "DESC" ? "asc" : "desc";
                                        fetchBrowseData(browse.table, browse.pagination.page, col.name, newDir, browse.search, browse.filterCol, browse.filterVal);
                                      }}
                                      className={cn(
                                        "py-3 px-3 font-semibold text-[10px] uppercase select-none whitespace-nowrap",
                                        isUserCol
                                          ? "text-cyan-400 bg-cyan-500/10 font-bold"
                                          : "text-[var(--color-muted)] cursor-pointer hover:text-[var(--color-brand)]"
                                      )}
                                    >
                                      <span className="flex items-center gap-1">
                                        {displayName}
                                        {!isUserCol && browse.sort.column === col.name && (
                                          <ArrowUpDown size={10} className="text-[var(--color-brand)]" />
                                        )}
                                      </span>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                              {browse.rows.length === 0 ? (
                                <tr>
                                  <td colSpan={browse.columns.length + 1} className="py-12 text-center text-sm text-[var(--color-muted)]">
                                    Kayıt bulunamadı.
                                  </td>
                                </tr>
                              ) : (
                                browse.rows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-[var(--color-surface-hover)]">
                                    <td className="py-2.5 px-3 text-[var(--color-muted)] font-mono text-[10px]">
                                      {(browse.pagination.page - 1) * browse.pagination.pageSize + idx + 1}
                                    </td>
                                    {browse.columns.map((col) => {
                                      const val = row[col.name];
                                      const isUserCol = col.name === "__userName";

                                      if (isUserCol) {
                                        const userName = row.__userName;
                                        const userEmail = row.__userEmail;
                                        return (
                                          <td key={col.name} className="py-2.5 px-3 whitespace-nowrap bg-cyan-500/5 border-r border-cyan-500/10">
                                            <div className="flex flex-col">
                                              <span className="font-bold text-xs text-cyan-300">
                                                {userName || "İsimsiz Kullanıcı"}
                                              </span>
                                              {userEmail && (
                                                <span className="text-[10px] text-[var(--color-muted)]">
                                                  {userEmail}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      }

                                      // Format cell value
                                      let displayVal: string;
                                      if (val === null || val === undefined) {
                                        displayVal = "—";
                                      } else if (col.type === "timestamp with time zone" || col.type === "timestamp without time zone") {
                                        displayVal = new Date(val).toLocaleString("tr-TR");
                                      } else if (col.type === "json" || col.type === "jsonb") {
                                        displayVal = typeof val === "string" ? val : JSON.stringify(val);
                                        if (displayVal.length > 60) displayVal = displayVal.slice(0, 60) + "...";
                                      } else if (typeof val === "boolean") {
                                        displayVal = val ? "Evet" : "Hayır";
                                      } else {
                                        displayVal = String(val);
                                        if (displayVal.length > 80) displayVal = displayVal.slice(0, 80) + "...";
                                      }

                                      return (
                                        <td key={col.name} className="py-2.5 px-3 font-mono text-[11px] text-[var(--color-text)] whitespace-nowrap max-w-[300px] truncate" title={String(val ?? "")}>
                                          <span className={val === null ? "text-[var(--color-muted)] italic" : ""}>{displayVal}</span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      {browse.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                          <span className="text-xs text-[var(--color-muted)]">
                            Sayfa {browse.pagination.page} / {browse.pagination.totalPages}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchBrowseData(browse.table, browse.pagination.page - 1, browse.sort.column, browse.sort.direction, browse.search, browse.filterCol, browse.filterVal)}
                              disabled={browse.pagination.page <= 1}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronLeft size={14} /> Önceki
                            </button>
                            <button
                              onClick={() => fetchBrowseData(browse.table, browse.pagination.page + 1, browse.sort.column, browse.sort.direction, browse.search, browse.filterCol, browse.filterVal)}
                              disabled={browse.pagination.page >= browse.pagination.totalPages}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Sonraki <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: Geri Bildirimler & İstekler */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
                    <MessageSquare size={20} className="text-[var(--color-brand)]" />
                    Kullanıcı Geri Bildirimleri, Öneri ve Şikayetler
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] mt-1 font-medium">
                    Kullanıcıların site içindeki widget veya iletişim sayfasından gönderdikleri geri bildirimler.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPromptModalOpen(true);
                      setPromptTriggerResult(null);
                      fetchPromptStats();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Pop-up Tetikle</span>
                  </button>

                  <button
                    onClick={fetchFeedbacks}
                    disabled={loadingFeedbacks}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--color-border)] text-xs font-extrabold hover:bg-[var(--color-surface-hover)] transition-all shrink-0 cursor-pointer"
                  >
                    <RefreshCw size={14} className={cn(loadingFeedbacks && "animate-spin")} />
                    Yenile
                  </button>
                </div>
              </div>

              {/* Type Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {["ALL", "SUGGESTION", "BUG", "COMPLAINT", "OTHER"].map((typeKey) => {
                  const labels: Record<string, string> = {
                    ALL: "Tümü",
                    SUGGESTION: "💡 İstek & Öneri",
                    BUG: "🐛 Hata Bildirimi",
                    COMPLAINT: "🔴 Şikayet",
                    OTHER: "💬 Diğer",
                  };
                  const isSel = feedbackTypeFilter === typeKey;
                  return (
                    <button
                      key={typeKey}
                      onClick={() => setFeedbackTypeFilter(typeKey)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap",
                        isSel
                          ? "bg-[var(--color-brand)]/15 border-[var(--color-brand)]/40 text-[var(--color-brand-strong)]"
                          : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      )}
                    >
                      {labels[typeKey]}
                    </button>
                  );
                })}
              </div>

              {/* Feedback List */}
              {loadingFeedbacks ? (
                <div className="p-12 text-center text-xs font-bold text-[var(--color-muted)] flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-[var(--color-brand)]" />
                  Geri bildirimler yükleniyor...
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="p-12 text-center border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] text-xs font-bold text-[var(--color-muted)] space-y-2">
                  <MessageSquare size={32} className="mx-auto text-[var(--color-muted)]/50" />
                  <p>Henüz geri bildirim kaydı bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacks
                    .filter((f) => feedbackTypeFilter === "ALL" || f.type === feedbackTypeFilter)
                    .map((f) => {
                      const typeBadgeMap: Record<string, { label: string; style: string }> = {
                        SUGGESTION: { label: "💡 Öneri", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
                        BUG: { label: "🐛 Hata", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
                        COMPLAINT: { label: "🔴 Şikayet", style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
                        OTHER: { label: "💬 Diğer", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
                      };
                      const typeInfo = typeBadgeMap[f.type] || { label: f.type, style: "bg-gray-500/10 text-gray-400" };

                      return (
                        <div
                          key={f.id}
                          className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]/40 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className={cn("px-2.5 py-1 rounded-xl text-xs font-extrabold border", typeInfo.style)}>
                                {typeInfo.label}
                              </span>
                              <span className="font-extrabold text-xs text-[var(--color-foreground)]">
                                {f.userName || "Kullanıcı"} ({f.userEmail || "Bilinmiyor"})
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-[var(--color-muted)]">
                                {new Date(f.createdAt).toLocaleString("tr-TR")}
                              </span>

                              {/* Status Selector */}
                              <select
                                value={f.status}
                                disabled={updatingFeedbackId === f.id}
                                onChange={(e) => updateFeedbackStatus(f.id, e.target.value)}
                                className={cn(
                                  "px-2.5 py-1 rounded-xl text-xs font-extrabold border outline-none cursor-pointer",
                                  f.status === "OPEN" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                                  f.status === "IN_PROGRESS" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                                  f.status === "RESOLVED" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                                  f.status === "CLOSED" && "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                )}
                              >
                                <option value="OPEN">🟡 Açık (Bekliyor)</option>
                                <option value="IN_PROGRESS">🔵 İnceleniyor</option>
                                <option value="RESOLVED">🟢 Çözüldü</option>
                                <option value="CLOSED">⚫ Kapatıldı</option>
                              </select>
                            </div>
                          </div>

                          {f.subject && (
                            <h4 className="text-xs font-extrabold text-[var(--color-foreground)]">
                              Konu: {f.subject}
                            </h4>
                          )}

                          <p className="text-xs font-medium text-[var(--color-foreground)]/90 leading-relaxed bg-[var(--color-surface-muted)]/40 p-3.5 rounded-xl border border-[var(--color-border)]/40 whitespace-pre-wrap">
                            {f.message}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Log Detay Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
                <Activity size={18} className="text-[var(--color-brand)]" />
                Sistem Eylemi Detayı
              </h3>
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">Zaman Damgası</span>
                <span className="font-mono text-[var(--color-text)]">
                  {new Date(selectedLogDetails.createdAt).toLocaleString("tr-TR")}
                </span>
              </div>

              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">Eylem Türü</span>
                <div>{getActionBadge(selectedLogDetails.action)}</div>
              </div>

              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">Kullanıcı</span>
                <span className="font-medium text-[var(--color-text)]">
                  {selectedLogDetails.userEmail || "Sistem (Cron Görevi)"}
                </span>
              </div>

              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">IP Adresi</span>
                <span className="font-mono text-[var(--color-text)]">{selectedLogDetails.ipAddress || "Bilinmiyor"}</span>
              </div>

              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">Tarayıcı / Cihaz (User-Agent)</span>
                <span className="font-mono text-[11px] text-[var(--color-muted)] break-all bg-[var(--color-bg)] p-2 rounded-lg block">
                  {selectedLogDetails.userAgent || "Cihaz bilgisi yok"}
                </span>
              </div>

              <div>
                <span className="text-[var(--color-muted)] font-semibold block mb-0.5">Detay Açıklaması</span>
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl font-mono text-[11px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                  {selectedLogDetails.details || "Açıklama bulunmuyor."}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="px-4 py-2 rounded-xl bg-[var(--color-brand)] text-white font-bold text-xs hover:bg-[var(--color-brand-strong)] transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şema Detay Modal */}
      {selectedSchemaTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-[var(--color-text)] font-mono">
                  {selectedSchemaTable.name}
                </h3>
                <span className="text-xs text-[var(--color-muted)]">Veritabanı Kolon & Şema Detayı</span>
              </div>
              <button
                onClick={() => setSelectedSchemaTable(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] font-semibold uppercase">
                    <th className="py-2 px-3">Kolon Adı</th>
                    <th className="py-2 px-3">Veri Tipi</th>
                    <th className="py-2 px-3 text-right">Boş Olabilir mi?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-mono">
                  {selectedSchemaTable.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-[var(--color-surface-hover)]">
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-brand)]">{col.name}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text)]">{col.type}</td>
                      <td className="py-2.5 px-3 text-right text-[var(--color-muted)]">
                        {col.nullable ? "EVET (NULL)" : "HAYIR"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between mt-4">
              <a
                href={`/api/admin/db/export?table=${selectedSchemaTable.name}`}
                download={`porttrack_table_${selectedSchemaTable.name}.json`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                <Download size={15} /> Tablo Verisini İndir (JSON)
              </a>
              <button
                onClick={() => setSelectedSchemaTable(null)}
                className="px-4 py-2 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YEDEKTEN GERİ YÜKLEME MODAL'I */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-base text-[var(--color-text)]">Veritabanını Yedekten Geri Yükle</h3>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 leading-relaxed space-y-1">
              <span className="font-bold block">⚠️ DİKKAT: KURTARMA İŞLEMİ UYARISI</span>
              <p>
                Yedek dosyası içe aktarıldığında veritabanı tablolarınız seçtiğiniz moda göre güncellenecektir. Yanlış veri yüklemesini önlemek için mevcut yedeğinizi indirdiğinizden emin olun.
              </p>
            </div>

            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text)]">
                  JSON Yedek Dosyası Seçin (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  required
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[var(--color-text)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--color-brand)] file:text-white hover:file:bg-[var(--color-brand-strong)] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text)]">
                  Geri Yükleme Modu
                </label>
                <select
                  value={restoreMode}
                  onChange={(e) => setRestoreMode(e.target.value as "overwrite" | "merge")}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 text-xs text-[var(--color-text)] font-medium outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="overwrite">
                    Tam Üzerine Yaz (Mevcut verileri temizle & Yedeği yükle - Felaket Kurtarma)
                  </option>
                  <option value="merge">
                    Çakışmayanları Ekle (Mevcut verileri koru, sadece eksik kayıtları ekle)
                  </option>
                </select>
              </div>

              {restoreMessage && (
                <div
                  className={cn(
                    "p-3 rounded-xl text-xs font-semibold flex items-center gap-2",
                    restoreMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  )}
                >
                  {restoreMessage.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>{restoreMessage.text}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!restoreFile || isRestoring}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-colors shadow-md"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Yükleniyor & Geri Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload size={15} /> Yedeği Geri Yükle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GERİ BİLDİRİM & İSTEK-ÖNERİ POP-UP TETİKLEYİCİ MODALI */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-muted)]/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--color-foreground)]">
                    Geri Bildirim & İstek-Öneri Pop-up Tetikleyici
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] font-medium">
                    Kullanıcıların bir sonraki girişlerinde tek seferlik gösterilecek pop-up penceresi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Target Selector */}
              <div className="space-y-2">
                <label className="font-extrabold uppercase tracking-wider text-[var(--color-muted)] text-[10px] block">
                  1. Hedef Kitle
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPromptTargetType("ALL")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5",
                      promptTargetType === "ALL"
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40 text-[var(--color-brand-strong)] shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)]"
                    )}
                  >
                    <div className="flex items-center justify-between font-black text-xs">
                      <span className="flex items-center gap-1.5">
                        <Users size={15} /> Tüm Kullanıcılar
                      </span>
                      {promptTargetType === "ALL" ? <CheckSquare size={16} /> : <Square size={16} className="text-[var(--color-muted)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] font-medium leading-relaxed">
                      Sistemdeki tüm kayıtlı kullanıcılara ({users.filter(u => u.id !== "default-user-id").length} kullanıcı) bir sonraki oturumlarında gösterilir.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromptTargetType("SELECTED")}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5",
                      promptTargetType === "SELECTED"
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/40 text-[var(--color-brand-strong)] shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)]"
                    )}
                  >
                    <div className="flex items-center justify-between font-black text-xs">
                      <span className="flex items-center gap-1.5">
                        <UserCheck size={15} /> Seçili Kullanıcılar
                      </span>
                      {promptTargetType === "SELECTED" ? <CheckSquare size={16} /> : <Square size={16} className="text-[var(--color-muted)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] font-medium leading-relaxed">
                      Yalnızca aşağıda arayarak işaretleyeceğiniz özel kullanıcılara ({promptSelectedUserIds.length} seçili) gösterilir.
                    </p>
                  </button>
                </div>
              </div>

              {/* User Selection Multi-Select List (if SELECTED) */}
              {promptTargetType === "SELECTED" && (
                <div className="space-y-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/20 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                      <input
                        type="text"
                        placeholder="Kullanıcı adı veya e-posta ile filtrele..."
                        value={promptUserSearch}
                        onChange={(e) => setPromptUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = users
                          .filter(u => u.name?.toLowerCase().includes(promptUserSearch.toLowerCase()) || u.email?.toLowerCase().includes(promptUserSearch.toLowerCase()))
                          .map(u => u.id);
                        if (promptSelectedUserIds.length === filteredIds.length) {
                          setPromptSelectedUserIds([]);
                        } else {
                          setPromptSelectedUserIds(filteredIds);
                        }
                      }}
                      className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold hover:bg-[var(--color-surface-hover)] whitespace-nowrap cursor-pointer"
                    >
                      {promptSelectedUserIds.length > 0 ? "Tümünü Temizle" : "Listelenenleri Seç"}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-[var(--color-border)]/40 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] p-2">
                    {users
                      .filter(u => u.name?.toLowerCase().includes(promptUserSearch.toLowerCase()) || u.email?.toLowerCase().includes(promptUserSearch.toLowerCase()))
                      .map(u => {
                        const isSelected = promptSelectedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-surface-hover)] cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPromptSelectedUserIds([...promptSelectedUserIds, u.id]);
                                  } else {
                                    setPromptSelectedUserIds(promptSelectedUserIds.filter(id => id !== u.id));
                                  }
                                }}
                                className="rounded text-[var(--color-brand)] focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-[var(--color-foreground)] block">
                                  {u.name || "Kullanıcı"}
                                </span>
                                <span className="text-[10px] text-[var(--color-muted)]">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-muted)]">
                              {u.transactionCount} işlem
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Title & Message Inputs */}
              <div className="space-y-4">
                <label className="font-extrabold uppercase tracking-wider text-[var(--color-muted)] text-[10px] block">
                  2. Pop-up Başlık & Açıklama
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-foreground)] block">
                    Pop-up Başlığı:
                  </label>
                  <input
                    type="text"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)] font-bold focus:outline-none focus:border-[var(--color-brand)]"
                    placeholder="Pop-up başlığı giriniz..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-foreground)] block">
                    Pop-up Açıklama Metni:
                  </label>
                  <textarea
                    rows={3}
                    value={promptMessage}
                    onChange={(e) => setPromptMessage(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] resize-none leading-relaxed"
                    placeholder="Pop-up açıklama metnini giriniz..."
                  />
                </div>
              </div>

              {/* Result Notification */}
              {promptTriggerResult && (
                <div
                  className={cn(
                    "p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200",
                    promptTriggerResult.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  )}
                >
                  {promptTriggerResult.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <span>{promptTriggerResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-all cursor-pointer"
              >
                Kapat
              </button>

              <button
                type="button"
                onClick={handleTriggerPrompt}
                disabled={triggeringPrompt}
                className="btn btn-primary px-6 py-2.5 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                {triggeringPrompt ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Tetikleniyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Pop-up'ı Tetikle ve Yayınla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block mb-1">
          {title}
        </span>
        <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
          {count.toLocaleString("tr-TR")}
        </span>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-inner">
        {icon}
      </div>
    </div>
  );
}
