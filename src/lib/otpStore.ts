/**
 * In-Memory OTP Doğrulama Deposu
 */

export interface PendingUser {
  name: string;
  email: string;
  passwordHash: string;
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, PendingUser>();

/** 6 haneli rastgele OTP kodu üretir */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** E-posta için OTP ve geçici kullanıcı verisini 10 dakika saklar */
export function setPendingUser(email: string, data: Omit<PendingUser, "expiresAt">): void {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 dakika
  otpStore.set(normalizedEmail, { ...data, expiresAt });
}

/** E-posta için saklanan OTP verisini getirir */
export function getPendingUser(email: string): PendingUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const pending = otpStore.get(normalizedEmail);
  if (!pending) return null;

  if (Date.now() > pending.expiresAt) {
    otpStore.delete(normalizedEmail);
    return null;
  }

  return pending;
}

/** Doğrulama başarılı olunca depodan siler */
export function removePendingUser(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  otpStore.delete(normalizedEmail);
}

export interface ResetPasswordOtp {
  email: string;
  code: string;
  expiresAt: number;
}

const resetOtpStore = new Map<string, ResetPasswordOtp>();

/** Şifre sıfırlama için OTP kodunu 10 dakika saklar */
export function setResetPasswordOtp(email: string, code: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 dakika
  resetOtpStore.set(normalizedEmail, { email: normalizedEmail, code, expiresAt });
}

/** Şifre sıfırlama OTP kodunu getirir */
export function getResetPasswordOtp(email: string): ResetPasswordOtp | null {
  const normalizedEmail = email.trim().toLowerCase();
  const data = resetOtpStore.get(normalizedEmail);
  if (!data) return null;

  if (Date.now() > data.expiresAt) {
    resetOtpStore.delete(normalizedEmail);
    return null;
  }

  return data;
}

/** Şifre sıfırlama tamamlanınca siler */
export function removeResetPasswordOtp(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  resetOtpStore.delete(normalizedEmail);
}
