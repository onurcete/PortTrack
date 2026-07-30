import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Detect if table has userId column → auto-JOIN with User table
    const hasUserId = columnNames.includes("userId") && table !== "User" && validTables.includes("User");

    // Build SELECT clause
    let selectClause: string;
    let fromClause: string;
    if (hasUserId) {
      selectClause = `"_u"."name" AS "__userName", "_u"."email" AS "__userEmail", "${table}".*`;
      fromClause = `"${table}" LEFT JOIN "User" AS "_u" ON "${table}"."userId" = "_u"."id"`;
    } else {
      selectClause = `"${table}".*`;
      fromClause = `"${table}"`;
    }

    // Validate sort column — prefix with table name to avoid ambiguity
    const safeSortCol = sortCol && columnNames.includes(sortCol)
      ? `"${table}"."${sortCol}"`
      : `"${table}"."${columnNames[0]}"`;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Exact filter
    if (filterCol && filterVal && columnNames.includes(filterCol)) {
      conditions.push(`"${table}"."${filterCol}"::text = $${paramIndex}`);
      params.push(filterVal);
      paramIndex++;
    }

    // Text search across all text-like columns (+ joined user name/email)
    if (search) {
      const textCols = columnsInfo
        .filter((c) => ["text", "character varying", "character"].includes(c.data_type))
        .map((c) => c.column_name);

      const searchClauses = textCols.map((col) => `"${table}"."${col}" ILIKE $${paramIndex}`);

      // Also search joined user name/email
      if (hasUserId) {
        searchClauses.push(`"_u"."name" ILIKE $${paramIndex}`);
        searchClauses.push(`"_u"."email" ILIKE $${paramIndex}`);
      }

      if (searchClauses.length > 0) {
        conditions.push(`(${searchClauses.join(" OR ")})`);
        params.push(`%${search}%`);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) as count FROM ${fromClause} ${whereClause}`,
      ...params
    );
    const totalRows = Number(countResult[0]?.count ?? "0");
    const totalPages = Math.ceil(totalRows / pageSize);
    const offset = (page - 1) * pageSize;

    // Fetch rows
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ${selectClause} FROM ${fromClause} ${whereClause} ORDER BY ${safeSortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      ...params
    );

    // Build output columns: prepend userName if JOIN was applied
    const outputColumns: Array<{ name: string; type: string; nullable: boolean; isVirtual?: boolean }> = [];

    if (hasUserId) {
      outputColumns.push({ name: "__userName", type: "text", nullable: true, isVirtual: true });
    }

    for (const c of columnsInfo) {
      outputColumns.push({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      });
    }

    // BigInt -> string replacer
    const jsonReplacer = (_key: string, value: any) =>
      typeof value === "bigint" ? value.toString() : value;

    const responseData = {
      ok: true,
      table,
      columns: outputColumns,
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
      hasUserJoin: hasUserId,
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
