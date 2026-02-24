const RESEND_API_URL = "https://api.resend.com/emails"
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}

function getDefaultSender(): string {
  const sender =
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM ??
    process.env.BREVO_SENDER_EMAIL
  if (!sender) {
    throw new Error(
      "Configura EMAIL_FROM, RESEND_FROM o BREVO_SENDER_EMAIL para indicar el remitente.",
    )
  }
  return sender
}

/** Parsea "Nombre <email@domain.com>" o devuelve { email, name: "" }. */
function parseSender(from: string): { email: string; name: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { email: from.trim(), name: "" }
}

function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  text: string,
  fromStr: string,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    throw new Error("Configura BREVO_API_KEY para enviar correos con Brevo.")
  }
  const sender = parseSender(fromStr)
  const payload = {
    sender: { email: sender.email, name: sender.name || "Planloop" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  }

  return fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(
        `Brevo devolvió ${response.status}. ${errorText || "No se pudo enviar el correo."}`,
      )
    }
  })
}

function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string,
  fromStr: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("Configura RESEND_API_KEY para enviar correos con Resend.")
  }
  const payload = {
    from: fromStr,
    to,
    subject,
    html,
    text,
  }

  return fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(
        `Resend devolvió ${response.status}. ${errorText || "No se pudo enviar el correo."}`,
      )
    }
  })
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<void> {
  const fromStr = from ?? getDefaultSender()

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, html, text, fromStr)
    return
  }
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html, text, fromStr)
    return
  }

  throw new Error(
    "Configura BREVO_API_KEY o RESEND_API_KEY para poder enviar correos.",
  )
}
