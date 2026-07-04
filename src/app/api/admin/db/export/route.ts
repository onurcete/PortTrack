import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Yetki kontrolü (sadece admin)
    await requireAdmin();

    const table = req.nextUrl.searchParams.get("table");

    // Replacer function to handle BigInt values during JSON.stringify
    const jsonReplacer = (key: string, value: any) => {
      return typeof value === "bigint" ? value.toString() : value;
    };

    if (!table) {
      // TÜM VERİTABANINI DIŞA AKTAR
      // Bütün tabloları sorgula
      const tablesList = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `;

      const fullDb: Record<string, any[]> = {};
      for (const t of tablesList) {
        const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${t.table_name}"`);
        fullDb[t.table_name] = rows;
      }

      const jsonString = JSON.stringify(fullDb, jsonReplacer, 2);
      
      return new NextResponse(jsonString, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=porttrack_full_database.json",
        },
      });
    }

    // TEKİL TABLO DIŞA AKTAR
    // Güvenlik: Sadece public şemasındaki var olan bir tablo ismini çalıştır
    const checkTable = await prisma.$queryRawUnsafe<any[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      table
    );
    if (checkTable.length === 0) {
      return new NextResponse("Geçersiz Tablo İsmi", { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "${table}"`);
    const jsonString = JSON.stringify(rows, jsonReplacer, 2);

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=porttrack_table_${table}.json`,
      },
    });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 500 });
  }
}
