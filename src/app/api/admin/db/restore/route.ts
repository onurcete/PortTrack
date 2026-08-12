import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSystemEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Foreign key bağımlılıklarına göre tablo ekleme sırası
const INSERT_ORDER = [
  "User",
  "PriceSnapshot",
  "FxRate",
  "TechnicalAnalysis",
  "SystemLog",
  "Feedback",
  "Instrument",
  "Transaction",
  "PortfolioMonthSnapshot",
  "Note",
  "AnalysisBriefing",
];

// Silme işlemi için ters bağımlılık sırası
const DELETE_ORDER = [...INSERT_ORDER].reverse();

export async function POST(req: NextRequest) {
  let adminUserId: string | null = null;
  try {
    adminUserId = await requireAdmin();

    let backupJson: any;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ ok: false, error: "Yedek dosyası seçilmedi." }, { status: 400 });
      }
      const text = await file.text();
      backupJson = JSON.parse(text);
    } else {
      backupJson = await req.json();
    }

    if (!backupJson || typeof backupJson !== "object") {
      return NextResponse.json({ ok: false, error: "Geçersiz yedek JSON formatı." }, { status: 400 });
    }

    // Paket formatını veya doğrudan tablo verilerini ayıkla
    const data: Record<string, any[]> = backupJson.data || backupJson;
    const metadata = backupJson.metadata || null;

    if (typeof data !== "object" || Object.keys(data).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Yedek dosyasında içe aktarılacak tablo verisi bulunamadı." },
        { status: 400 }
      );
    }

    // Veritabanındaki tüm public tabloları al
    const existingTablesRes = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations';
    `;
    const existingTableNames = new Set(existingTablesRes.map((t) => t.table_name));

    // Sıralı tablo listesini belirle
    const knownTablesInOrder = INSERT_ORDER.filter((t) => existingTableNames.has(t));
    const extraTables = Array.from(existingTableNames).filter((t) => !INSERT_ORDER.includes(t));
    const finalInsertOrder = [...knownTablesInOrder, ...extraTables];
    const finalDeleteOrder = [...finalInsertOrder].reverse();

    const mode = req.nextUrl.searchParams.get("mode") || "overwrite"; // overwrite | merge

    const restoredStats: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // OVERWRITE Modunda: Veritabanını sırayla temizle
      if (mode === "overwrite") {
        for (const tableName of finalDeleteOrder) {
          await tx.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        }
      }

      // Verileri sırayla yükle
      for (const tableName of finalInsertOrder) {
        const rows = data[tableName];
        if (!Array.isArray(rows) || rows.length === 0) {
          restoredStats[tableName] = 0;
          continue;
        }

        // Tablonun kolon listesini sorgula
        const colsRes = await tx.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
          tableName
        );
        const colMap = new Map(colsRes.map((c) => [c.column_name, c.data_type]));

        let insertedCount = 0;

        // Satırları 100'erli paketler halinde aktar
        const BATCH_SIZE = 100;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);

          for (const row of batch) {
            const keys = Object.keys(row).filter((k) => colMap.has(k));
            if (keys.length === 0) continue;

            const colNames = keys.map((k) => `"${k}"`).join(", ");
            const valuePlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
            const values = keys.map((k) => {
              const val = row[k];
              // JSON / Obje alanlarını stringify et
              if (val !== null && typeof val === "object" && !(val instanceof Date)) {
                return JSON.stringify(val);
              }
              return val;
            });

            if (mode === "overwrite") {
              const query = `INSERT INTO "${tableName}" (${colNames}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING;`;
              await tx.$executeRawUnsafe(query, ...values);
              insertedCount++;
            } else {
              // MERGE Modu (Çakışmada atla)
              const query = `INSERT INTO "${tableName}" (${colNames}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING;`;
              await tx.$executeRawUnsafe(query, ...values);
              insertedCount++;
            }
          }
        }

        restoredStats[tableName] = insertedCount;
      }
    }, { timeout: 60000 });

    // Sistem logu ekle
    await logSystemEvent({
      userId: adminUserId,
      action: "LOGIN", // fallback system action
      status: "SUCCESS",
      details: {
        type: "DB_RESTORE_FULL",
        mode,
        tablesRestored: restoredStats,
        metadata,
      },
      req,
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      message: "Veritabanı yedeği başarıyla geri yüklendi.",
      restoredStats,
    });
  } catch (err: any) {
    console.error("Database restore error:", err);

    if (adminUserId) {
      await logSystemEvent({
        userId: adminUserId,
        action: "LOGIN",
        status: "FAILED",
        details: { type: "DB_RESTORE_FULL", error: err.message },
        req,
      }).catch(() => null);
    }

    return NextResponse.json(
      { ok: false, error: err?.message || "Geri yükleme sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
