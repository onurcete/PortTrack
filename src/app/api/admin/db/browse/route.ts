import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Foreign key map: columnName -> { table, column }
const FK_MAP: Record<string, { table: string; column: string; displayColumn?: string }> = {
  userId: { table: "User", column: "id", displayColumn: "email" },
};

// Known table names for safe querying
async function getPublicTables(): Promise<string[]> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  return tables.map((t) => t.table_name);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const table = sp.get("table");

    if (!table) {
      return NextResponse.json({ ok: false, error: "Tablo adı gerekli (?table=...)" }, { status: 400 });
    }

    // Validate table name exists
    const validTables = await getPublicTables();
    if (!validTables.includes(table)) {
      return NextResponse.json({ ok: false, error: "Geçersiz tablo adı" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(sp.get("pageSize") || "50", 10)));
    const sortCol = sp.get("sort") || null;
    const sortDir = sp.get("dir") === "asc" ? "ASC" : "DESC";
    const search = sp.get("search")?.trim() || null;
    const filterCol = sp.get("filterCol") || null;
    const filterVal = sp.get("filterVal") || null;

    // Get column info
    const columnsInfo = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      table
    );

    const columnNames = columnsInfo.map((c) => c.column_name);

    // Validate sort column
    const safeSortCol = sortCol && columnNames.includes(sortCol) ? `"${sortCol}"` : `"${columnNames[0]}"`;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Exact filter (FK navigation)
    if (filterCol && filterVal && columnNames.includes(filterCol)) {
      conditions.push(`"${filterCol}"::text = $${paramIndex}`);
      params.push(filterVal);
      paramIndex++;
    }

    // Text search across all text-like columns
    if (search) {
      const textCols = columnsInfo
        .filter((c) => ["text", "character varying", "character"].includes(c.data_type))
        .map((c) => c.column_name);

      if (textCols.length > 0) {
        const searchClauses = textCols.map((col) => {
          const clause = `"${col}" ILIKE $${paramIndex}`;
          return clause;
        });
        conditions.push(`(${searchClauses.join(" OR ")})`);
        params.push(`%${search}%`);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) as count FROM "${table}" ${whereClause}`,
      ...params
    );
    const totalRows = Number(countResult[0]?.count ?? "0");
    const totalPages = Math.ceil(totalRows / pageSize);
    const offset = (page - 1) * pageSize;

    // Fetch rows
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "${table}" ${whereClause} ORDER BY ${safeSortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      ...params
    );

    // Build FK metadata for this table
    const fkColumns: Record<string, { table: string; column: string; displayColumn?: string }> = {};
    for (const col of columnNames) {
      if (FK_MAP[col]) {
        // Check if the target table exists
        if (validTables.includes(FK_MAP[col].table)) {
          fkColumns[col] = FK_MAP[col];
        }
      }
    }

    // BigInt -> string replacer
    const jsonReplacer = (_key: string, value: any) =>
      typeof value === "bigint" ? value.toString() : value;

    const responseData = {
      ok: true,
      table,
      columns: columnsInfo.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      })),
      rows: JSON.parse(JSON.stringify(rows, jsonReplacer)),
      pagination: {
        page,
        pageSize,
        totalRows,
        totalPages,
      },
      sort: {
        column: sortCol || columnNames[0],
        direction: sortDir,
      },
      fkColumns,
    };

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("❌ DB Browse API Error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
