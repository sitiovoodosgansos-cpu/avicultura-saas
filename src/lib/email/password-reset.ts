const RESEND_ENDPOINT = "https://api.resend.com/emails";

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetLink: string;
};

function getFromEmail() {
  return process.env.EMAIL_FROM;
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const apiKey = getResendApiKey();
  const from = getFromEmail();

  if (!apiKey || !from) {
    console.warn("Password reset email skipped: RESEND_API_KEY or EMAIL_FROM is missing.");
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">Recuperacao de senha - Ornabird</h2>
      <p>Ola, ${input.name}.</p>
      <p>Recebemos um pedido para redefinir sua senha.</p>
      <p>
        <a href="${input.resetLink}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-weight: 600;">
          Redefinir senha
        </a>
      </p>
      <p>Se o botao nao abrir, copie e cole este link no navegador:</p>
      <p style="word-break: break-all;">${input.resetLink}</p>
      <p>Se voce nao pediu esta alteracao, ignore este e-mail.</p>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Link valido por 1 hora.</p>
    </div>
  `;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Recuperacao de senha - Ornabird",
      html,
      text: `Ola, ${input.name}. Use este link para redefinir sua senha: ${input.resetLink}. O link expira em 1 hora.`
    })
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Resend error while sending password reset email:", details);
    return false;
  }

  return true;
}