const BRAND_PRIMARY = "#6366f1"
const BRAND_DARK = "#0f172a"
const BRAND_ACCENT = "#22d3ee"

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function buildVerificationEmail({
  name,
  email,
  actionLink,
}: {
  name: string
  email: string
  actionLink: string
}): { subject: string; html: string; text: string } {
  const displayName = name.trim() || email
  const subject = "Confirma tu correo y completa tu registro"
  const previewText =
    "Activa tu cuenta con un clic y empieza a planificar turnos inolvidables"

  const safeName = escapeHtml(displayName)
  const safeLink = actionLink

  const html = `<!DOCTYPE html>
<html lang="es" style="margin:0;padding:0;">
  <head>
    <meta charSet="utf-8" />
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @media (max-width: 600px) {
        .container { padding: 32px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND_DARK};font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc;">
    <span style="display:none !important;opacity:0;visibility:hidden;height:0;width:0;">${previewText}</span>
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tbody>
        <tr>
          <td align="center" style="padding:48px 16px;">
            <table role="presentation" class="container" width="100%" style="max-width:560px;border-radius:24px;background:linear-gradient(160deg, rgba(99,102,241,0.12), rgba(15,23,42,0.92)), #0b1120;padding:48px 40px;border:1px solid rgba(148,163,184,0.12);box-shadow:0 24px 60px rgba(15,23,42,0.45);">
              <tbody>
                <tr>
                  <td style="text-align:center; padding-bottom:32px;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:20px;border:1px solid rgba(148,163,184,0.2);background:rgba(99,102,241,0.08);box-shadow:0 20px 40px rgba(99,102,241,0.35);">
                      <span style="font-size:34px;font-weight:700;color:${BRAND_ACCENT};">SS</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:8px;">
                    <h1 style="margin:0;font-size:26px;line-height:1.4;color:#e2e8f0;">Hola ${safeName}, ¡ya casi terminas!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:24px;">
                    <p style="margin:0;font-size:16px;line-height:1.7;color:#cbd5f5;">
                      Hemos preparado tu cuenta en <strong style="color:${BRAND_ACCENT};">Planloop</strong> y solo queda confirmar tu correo electrónico.
                      Pulsa el botón para activar tu acceso y empezar a organizar turnos con tu equipo.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:32px;">
                    <a href="${safeLink}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${BRAND_PRIMARY};color:#f8fafc;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 20px 35px rgba(99,102,241,0.35);">
                      Confirmar mi correo
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:24px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#94a3b8;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:
                    </p>
                    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#cbd5f5;word-break:break-all;">
                      <a href="${safeLink}" style="color:${BRAND_ACCENT};text-decoration:none;">${safeLink}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;border-top:1px solid rgba(148,163,184,0.18);padding-top:24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;">
                      Este enlace caduca en 1 hora por motivos de seguridad. Si no has solicitado este correo, puedes ignorarlo.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`

  const text = `Hola ${displayName},\n\nGracias por registrarte en Planloop. Para activar tu cuenta abre el siguiente enlace en tu navegador:\n${safeLink}\n\nEl enlace caduca en 60 minutos. Si tú no solicitaste esta verificación, puedes ignorar este mensaje.`

  return { subject, html, text }
}

export function buildEmailChangeEmail({
  name,
  currentEmail,
  newEmail,
  actionLink,
}: {
  name: string
  currentEmail: string
  newEmail: string
  actionLink: string
}): { subject: string; html: string; text: string } {
  const displayName = name.trim() || currentEmail
  const subject = "Confirma tu nuevo correo en Planloop"
  const previewText =
    "Verifica el cambio de correo y mantén tu cuenta segura"

  const safeName = escapeHtml(displayName)
  const safeCurrentEmail = escapeHtml(currentEmail)
  const safeNewEmail = escapeHtml(newEmail)
  const safeLink = actionLink

  const html = `<!DOCTYPE html>
<html lang="es" style="margin:0;padding:0;">
  <head>
    <meta charSet="utf-8" />
    <title>${subject}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @media (max-width: 600px) {
        .container { padding: 32px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND_DARK};font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc;">
    <span style="display:none !important;opacity:0;visibility:hidden;height:0;width:0;">${previewText}</span>
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tbody>
        <tr>
          <td align="center" style="padding:48px 16px;">
            <table role="presentation" class="container" width="100%" style="max-width:560px;border-radius:24px;background:linear-gradient(160deg, rgba(99,102,241,0.12), rgba(15,23,42,0.92)), #0b1120;padding:48px 40px;border:1px solid rgba(148,163,184,0.12);box-shadow:0 24px 60px rgba(15,23,42,0.45);">
              <tbody>
                <tr>
                  <td style="text-align:center; padding-bottom:32px;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:20px;border:1px solid rgba(148,163,184,0.2);background:rgba(99,102,241,0.08);box-shadow:0 20px 40px rgba(99,102,241,0.35);">
                      <span style="font-size:34px;font-weight:700;color:${BRAND_ACCENT};">SS</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:8px;">
                    <h1 style="margin:0;font-size:26px;line-height:1.4;color:#e2e8f0;">Hola ${safeName}, confirma tu nuevo correo</h1>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:24px;">
                    <p style="margin:0;font-size:16px;line-height:1.7;color:#cbd5f5;">
                      Has solicitado cambiar el correo de tu cuenta en <strong style="color:${BRAND_ACCENT};">Planloop</strong>.
                      Para completar el proceso, valida que quieres sustituir <strong>${safeCurrentEmail}</strong> por <strong>${safeNewEmail}</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:32px;">
                    <a href="${safeLink}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${BRAND_PRIMARY};color:#f8fafc;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 20px 35px rgba(99,102,241,0.35);">
                      Confirmar nuevo correo
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;padding-bottom:24px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#94a3b8;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:
                    </p>
                    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#cbd5f5;word-break:break-all;">
                      <a href="${safeLink}" style="color:${BRAND_ACCENT};text-decoration:none;">${safeLink}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;border-top:1px solid rgba(148,163,184,0.18);padding-top:24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;">
                      Este enlace caduca en 1 hora por motivos de seguridad. Si no has solicitado este cambio puedes ignorarlo y tu correo seguirá siendo ${safeCurrentEmail}.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`

  const text = `Hola ${displayName},\n\nHas solicitado cambiar el correo de tu cuenta en Planloop. Para confirmar el cambio de ${currentEmail} a ${newEmail}, abre el siguiente enlace en tu navegador:\n${safeLink}\n\nEl enlace caduca en 60 minutos. Si no has solicitado este cambio, puedes ignorar este mensaje.`

  return { subject, html, text }
}

/** Email con solo código (sin enlace con token). No pasa por tracking de Brevo/Resend. */
export function buildPasswordResetCodeEmail({
  code,
  resetUrl,
  validMinutes = 10,
}: {
  code: string
  resetUrl: string
  validMinutes?: number
}): { subject: string; html: string; text: string } {
  const subject = "Tu código para restablecer la contraseña - Planloop"
  const safeCode = escapeHtml(code)

  const html = `<!DOCTYPE html>
<html lang="es" style="margin:0;padding:0;">
  <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:${BRAND_DARK};font-family:system-ui,sans-serif;color:#f8fafc;">
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tr><td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" style="max-width:480px;border-radius:24px;background:#0b1120;padding:40px;border:1px solid rgba(148,163,184,0.12);">
          <tr><td style="text-align:center;padding-bottom:24px;">
            <h1 style="margin:0;font-size:22px;color:#e2e8f0;">Restablece tu contraseña</h1>
          </td></tr>
          <tr><td style="text-align:center;padding-bottom:16px;">
            <p style="margin:0;font-size:16px;color:#cbd5f5;">Tu código es:</p>
          </td></tr>
          <tr><td style="text-align:center;padding-bottom:24px;">
            <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.2em;color:${BRAND_ACCENT};">${safeCode}</p>
          </td></tr>
          <tr><td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;font-size:14px;color:#94a3b8;">Entra en Planloop e introduce este código. Válido ${validMinutes} minutos.</p>
          </td></tr>
          <tr><td style="text-align:center;">
            <p style="margin:0;font-size:13px;color:#64748b;">Si no has pedido restablecer la contraseña, ignora este correo.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = `Restablece tu contraseña en Planloop.\n\nTu código: ${code}\n\nEntra en ${resetUrl} e introduce el código. Válido ${validMinutes} minutos.\n\nSi no has pedido esto, ignora el correo.`

  return { subject, html, text }
}
