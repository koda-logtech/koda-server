import { Resend } from 'resend';

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
};

export interface SendActivationEmailParams {
  to: string;
  name: string;
  activationLink: string;
}

export const sendActivationEmail = async ({
  to,
  name,
  activationLink,
}: SendActivationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  const resend = getResendClient();

  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(`[Email] RESEND_API_KEY não configurada. Link de ativação para ${to}: ${activationLink}`);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = process.env.EMAIL_FROM || 'Koda <onboarding@resend.dev>';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Seu acesso à plataforma Koda foi liberado!',
      html: `
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
      `,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[Email] Erro ao enviar e-mail via Resend:', error);
      return { success: false, error: error.message };
    }

    // eslint-disable-next-line no-console
    console.log(`[Email] E-mail de ativação enviado com sucesso para ${to} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.error('[Email] Falha inesperada ao enviar e-mail:', errorMsg);
    return { success: false, error: errorMsg };
  }
};
