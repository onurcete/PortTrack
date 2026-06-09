export const AUTH_COOKIE = "pt_session";

/** Sifre + secret'tan oturum jetonu uretir (edge & node uyumlu). */
export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "porttrack-secret";
  const data = new TextEncoder().encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(input: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD ?? "";
  return password.length > 0 && input === password;
}
