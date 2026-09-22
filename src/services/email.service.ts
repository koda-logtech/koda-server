import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SendActivationEmailParams {
  to: string;
  name: string;
  activationLink: string;
}

const getHtmlTemplate = (name: string, activationLink: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #1a56db;">Olá, ${name}!</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
      Sua solicitação de acesso à plataforma <strong>Koda</strong> foi aprovada por um administrador.
    </p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
      Para ativar sua conta e definir sua senha de acesso, clique no botão abaixo:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationLink}" style="background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Ativar Minha Conta
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">
      Ou copie e cole o seguinte link em seu navegador:<br>
      <a href="${activationLink}" style="color: #1a56db; word-break: break-all;">${activationLink}</a>
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
      Este link é válido por 48 horas. Se você não solicitou este acesso, favor desconsiderar este e-mail.
    </p>
  </div>
`;

/**
 * Envia email via Gmail / SMTP (sem restrição de domínio de teste)
 */
const sendViaSmtp = async ({
  to,
  name,
  activationLink,
}: SendActivationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    return { success: false, error: 'SMTP credentials not configured' };
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true;
  const from = process.env.EMAIL_FROM || `Koda <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Seu acesso à plataforma Koda foi liberado!',
    html: getHtmlTemplate(name, activationLink),
  });

  // eslint-disable-next-line no-console
  console.log(`[Email] E-mail enviado com sucesso via Gmail SMTP para ${to} (MessageID: ${info.messageId})`);
  return { success: true, id: info.messageId };
};

/**
 * Envia email via Resend API
 */
const sendViaResend = async ({
  to,
  name,
  activationLink,
}: SendActivationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || 'Koda <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Seu acesso à plataforma Koda foi liberado!',
    html: getHtmlTemplate(name, activationLink),
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[Email] Erro ao enviar e-mail via Resend:', error.message);
    return { success: false, error: error.message };
  }

  // eslint-disable-next-line no-console
  console.log(`[Email] E-mail enviado com sucesso via Resend para ${to} (ID: ${data?.id})`);
  return { success: true, id: data?.id };
};

export const sendActivationEmail = async ({
  to,
  name,
  activationLink,
}: SendActivationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    // 1. Prioridade: se SMTP_USER e SMTP_PASS estiverem configurados, usa Gmail SMTP (entrega para qualquer email)
    if (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
      return await sendViaSmtp({ to, name, activationLink });
    }

    // 2. Se houver RESEND_API_KEY configurada, usa Resend
    if (process.env.RESEND_API_KEY?.trim()) {
      return await sendViaResend({ to, name, activationLink });
    }

    // eslint-disable-next-line no-console
    console.log(`[Email] Nenhum serviço de e-mail configurado. Link de ativação para ${to}: ${activationLink}`);
    return { success: false, error: 'No email service configured' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email error';
    // eslint-disable-next-line no-console
    console.error(`[Email] Falha no disparo de e-mail para ${to}:`, errorMsg);
    // eslint-disable-next-line no-console
    console.log(`[Email] Link de ativação de fallback: ${activationLink}`);
    return { success: false, error: errorMsg };
  }
};
