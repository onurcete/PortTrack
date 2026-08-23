import { NextRequest, NextResponse } from "next/server";
import { getSessionUserIdOptional, requireUser } from "@/lib/auth";
import { PORTFOLIO_MCP_TOOLS } from "@/lib/mcp/schemas";
import { dispatchMcpTool } from "@/lib/mcp/portfolioTools";

export const runtime = "nodejs";

/**
 * PortTrack Model Context Protocol (MCP) JSON-RPC / REST Endpoint
 * Allows external LLMs (Claude Desktop, Cursor, Custom Agents) to discover and call PortTrack tools.
 */
export async function GET(req: NextRequest) {
  const toolList = PORTFOLIO_MCP_TOOLS.map((t: any) => t.function);
  return NextResponse.json({
    name: "porttrack-mcp-server",
    version: "1.0.0",
    protocol: "mcp-2024-11-05",
    description: "PortTrack Real-time Portfolio Intelligence MCP Server",
    tools: toolList,
  });
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;

    // 1. Bearer Token Auth (for external MCP clients) or Session Cookie Auth
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { getSessionUser } = await import("@/lib/auth");
      userId = await getSessionUser(token);
    }

    if (!userId) {
      userId = await getSessionUserIdOptional();
    }

    if (!userId) {
      return NextResponse.json(
        { jsonrpc: "2.0", error: { code: -32000, message: "Unauthorized - PortTrack session or token required" } },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { method, params, id } = body;

    // MCP Tools Discovery
    if (method === "tools/list" || method === "list_tools") {
      const tools = PORTFOLIO_MCP_TOOLS.map((t: any) => t.function);
      return NextResponse.json({
        jsonrpc: "2.0",
        id: id ?? 1,
        result: {
          tools,
        },
      });
    }

    // MCP Tool Call
    if (method === "tools/call" || method === "call_tool") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (!toolName) {
        return NextResponse.json(
          { jsonrpc: "2.0", id: id ?? 1, error: { code: -32602, message: "Missing tool name in params" } },
          { status: 400 },
        );
      }

      const { result } = await dispatchMcpTool(userId, toolName, args);

      return NextResponse.json({
        jsonrpc: "2.0",
        id: id ?? 1,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    }

    // Fallback: Direct Tool Call format { name: string, args: object }
    if (body.name) {
      const { result } = await dispatchMcpTool(userId, body.name, body.args || {});
      return NextResponse.json({ ok: true, name: body.name, result });
    }

    return NextResponse.json(
      { jsonrpc: "2.0", id: id ?? 1, error: { code: -32601, message: `Method '${method}' not found` } },
      { status: 404 },
    );
  } catch (err: any) {
    console.error("MCP Server Error:", err);
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: err?.message || "Internal MCP error" } },
      { status: 500 },
    );
  }
}
