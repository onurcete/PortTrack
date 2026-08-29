import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

export const AUTH_COOKIE = "pt_session";
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "porttrack-secure-auth-secret-key-fallback-2025-production-resilient";

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(str: string): string {
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(str)
      : Buffer.from(str).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) {
    b64 += "=";
  }
  return typeof atob !== "undefined"
    ? atob(b64)
    : Buffer.from(b64, "base64").toString("utf-8");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return arrayBufferToHex(signature);
}

async function verifyPayload(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await signPayload(payload, secret);
  return signature === expected;
}

/** Şifreyi tuzlayarak (salted) SHA-256 ile hashler. */
export async function hashPassword(password: string): Promise<string> {
  const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hash = arrayBufferToHex(hashBuffer);
  return `${salt}:${hash}`;
}

/** Girilen şifreyi kayıtlı hash ile doğrular. */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const actualHash = arrayBufferToHex(hashBuffer);
  return actualHash === expectedHash;
}

/** Oturum çerezi için imzalı bir jeton üretir. */
export async function createSession(
  userId: string,
  durationMs: number = 60 * 24 * 60 * 60 * 1000, // 60 gün
): Promise<string> {
  const payload = JSON.stringify({
    userId,
    expires: Date.now() + durationMs,
  });
  const signature = await signPayload(payload, AUTH_SECRET);
  const encodedPayload = toBase64Url(payload);
  return `${encodedPayload}.${signature}`;
}

/** İmzalı jetondan kullanıcı kimliğini doğrular (hem URL-safe hem legacy formatları destekler). */
export async function getSessionUser(token: string): Promise<string | null> {
  try {
    if (!token || typeof token !== "string") return null;
    const cleanToken = decodeURIComponent(token.trim());
    const parts = cleanToken.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const payloadStr = fromBase64Url(encodedPayload);
    const verified = await verifyPayload(payloadStr, signature, AUTH_SECRET);
    if (!verified) return null;
    const payload = JSON.parse(payloadStr) as { userId: string; expires: number };
    if (payload.expires && payload.expires < Date.now()) return null;
    return payload.userId || null;
  } catch {
    return null;
  }
}

/** Sunucu eylemleri ve server component'leri için aktif oturum kimliğini getirir. */
export async function requireUser(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (token) {
      const userId = await getSessionUser(token);
      if (userId) return userId;
    }
  } catch {}

  try {
    const headerStore = await headers();
    const xUser = headerStore.get("x-user-id");
    if (xUser) return xUser;

    const authHeader = headerStore.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : null;
    if (bearer) {
      const userId = await getSessionUser(bearer);
      if (userId) return userId;
    }
  } catch {}

  throw new Error("Unauthorized");
}

export async function getSessionUserIdOptional(): Promise<string | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

export const ADMIN_EMAILS = ["ceteonur@gmail.com", "denizbag@gmail.com"];

export function isAdminUser(user: { role?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) return true;
  return false;
}

/** Sunucu eylemleri ve server component'leri için aktif admin kimliğini getirir. */
export async function requireAdmin(): Promise<string> {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!isAdminUser(user)) {
    throw new Error("Unauthorized");
  }
  return userId;
}

