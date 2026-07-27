/**
 * PortTrack Resend E-posta Gönderim Servisi
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM?.trim() || "PortTrack <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY tanımlı değil.");
    return {
      ok: false,
      error: "Sunucuda RESEND_API_KEY ortam değişkeni tanımlı değil. Lütfen Vercel Settings > Environment Variables altından RESEND_API_KEY ekleyin.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("❌ Resend API Hatası:", data);
      return { ok: false, error: data.message || data.error || "E-posta gönderilemedi." };
    }

    return { ok: true, id: data.id };
  } catch (err: any) {
    console.error("❌ E-posta gönderimi sırasında hata oluştu:", err);
    return { ok: false, error: err.message || "Bağlantı hatası." };
  }
}

/** 6 Haneli OTP Kod E-posta HTML Şablonu */
export function generateOtpEmailHtml(name: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>PortTrack Doğrulama Kodunuz</title>
</head>
<body style="margin:0; padding:0; background-color:#090d16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#f1f5f9;">
  <div style="max-width:540px; margin:40px auto; background-color:#0f172a; border:1px solid #1e293b; border-radius:24px; padding:36px; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
    
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; background-color:#2563eb; color:#ffffff; font-weight:900; font-size:18px; padding:8px 16px; border-radius:12px;">PT</div>
      <div style="font-weight:900; font-size:20px; color:#ffffff; margin-top:8px;">PortTrack</div>
    </div>

    <h2 style="font-size:20px; font-weight:900; text-align:center; color:#ffffff; margin-bottom:8px;">
      E-Posta Doğrulama Kodunuz 🔐
    </h2>

    <p style="font-size:13px; color:#cbd5e1; text-align:center; margin-bottom:28px; line-height:1.6;">
      Merhaba ${name || "Yatırımcı"}, PortTrack hesabınızı aktif etmek için aşağıdaki 6 haneli güvenlik kodunu giriniz:
    </p>

    <div style="text-align:center; margin-bottom:28px;">
      <div style="display:inline-block; background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border:2px border #4338ca; border-radius:16px; padding:16px 32px; letter-spacing:8px; font-size:36px; font-weight:900; color:#38bdf8; font-family:monospace;">
        ${code}
      </div>
    </div>

    <p style="font-size:11px; color:#94a3b8; text-align:center; margin:0;">
      Bu doğrulama kodu <strong>10 dakika</strong> süreyle geçerlidir. Güvenliğiniz için bu kodu kimseyle paylaşmayınız.
    </p>

    <div style="margin-top:32px; padding-top:20px; border-top:1px solid #1e293b; text-align:center; font-size:10px; color:#64748b;">
      © 2026 PortTrack. Bu e-posta otomatik oluşturulmuştur.
    </div>

  </div>
</body>
</html>`;
}
