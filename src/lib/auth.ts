import { cookies } from "next/headers";

export const AUTH_COOKIE = "pt_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "porttrack-secret-key-change-me";

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
export async function createSession(userId: string): Promise<string> {
  const payload = JSON.stringify({
    userId,
    expires: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 gun
  });
  const signature = await signPayload(payload, AUTH_SECRET);
  // Base64 encode safe for cookies
  const encodedPayload = typeof btoa !== "undefined"
    ? btoa(payload)
    : Buffer.from(payload).toString("base64");
  return `${encodedPayload}.${signature}`;
}

/** İmzalı jetondan kullanıcı kimliğini doğrular. */
export async function getSessionUser(token: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const payloadStr = typeof atob !== "undefined"
      ? atob(encodedPayload)
      : Buffer.from(encodedPayload, "base64").toString("utf-8");
    const verified = await verifyPayload(payloadStr, signature, AUTH_SECRET);
    if (!verified) return null;
    const payload = JSON.parse(payloadStr) as { userId: string; expires: number };
    if (payload.expires < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

/** Sunucu eylemleri ve server component'leri için aktif oturum kimliğini getirir. */
export async function requireUser(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) throw new Error("Unauthorized");
  const userId = await getSessionUser(token);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function getSessionUserIdOptional(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    return await getSessionUser(token);
  } catch {
    return null;
  }
}
