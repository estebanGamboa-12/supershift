const RESEND_API_URL = "https://api.resend.com/emails"

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "Configura la variable RESEND_API_KEY para poder enviar correos de verificación personalizados.",
    )
  }
  return apiKey
}

function getDefaultSender(): string {
  const sender = process.env.EMAIL_FROM ?? process.env.RESEND_FROM
  if (!sender) {
    throw new Error(
      "Configura la variable EMAIL_FROM (o RESEND_FROM) para indicar el remitente de los correos.",
    )
  }
  return sender
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<void> {
  const payload = {
    from: from ?? getDefaultSender(),
    to,
    subject,
    html,
    text,
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(
      `Resend devolvió un estado ${response.status}. ${errorText || "No se pudo enviar el correo."}`,
    )
  }
}
