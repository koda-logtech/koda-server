import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SendActivationEmailParams {
  to: string;
  name: string;
  activationLink: string;
}

export interface SendRejectionEmailParams {
  to: string;
  name: string;
  reason?: string;
}

const getActivationHtmlTemplate = (name: string, activationLink: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #1a56db;">Hello, ${name}!</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
      Your request to access the <strong>Koda</strong> platform has been approved by an administrator.
    </p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">
      To activate your account and set your access password, click the button below:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationLink}" style="background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Activate My Account
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">
      Or copy and paste the following link into your browser:<br>
      <a href="${activationLink}" style="color: #1a56db; word-break: break-all;">${activationLink}</a>
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
      This link is valid for 48 hours. If you did not request this access, please ignore this email.
    </p>
  </div>
`;

const getRejectionHtmlTemplate = (name: string, reason?: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hello, ${name}!</h2>
    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Thank you for your interest in using the <strong>Koda</strong> platform.
    </p>
    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      We regret to inform you that your recent access request could not be approved at this time.
    </p>
    ${reason ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 14px;">Reason provided by the administrator:</p>
      <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">${reason}</p>
    </div>
    ` : ''}
    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
      If you believe this happened by mistake or have additional information for re-analysis, you can submit a new request on the portal or contact your operation's support team.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 14px;">
      Best regards,<br>
      <strong>Koda LogTech Team</strong>
    </p>
  </div>
`;

interface SendMailRawParams {
  to: string;
  subject: string;
  html: string;
}

const sendViaSmtp = async ({ to, subject, html }: SendMailRawParams): Promise<{ success: boolean; id?: string; error?: string }> => {
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
    subject,
    html,
  });

  // eslint-disable-next-line no-console
  console.log(`[Email] Email sent successfully via Gmail SMTP to ${to} (MessageID: ${info.messageId})`);
  return { success: true, id: info.messageId };
};

const sendViaResend = async ({ to, subject, html }: SendMailRawParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || 'Koda <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[Email] Error sending email via Resend:', error.message);
    return { success: false, error: error.message };
  }

  // eslint-disable-next-line no-console
  console.log(`[Email] Email sent successfully via Resend to ${to} (ID: ${data?.id})`);
  return { success: true, id: data?.id };
};

const sendEmail = async ({ to, subject, html }: SendMailRawParams): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    if (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
      return await sendViaSmtp({ to, subject, html });
    }

    if (process.env.RESEND_API_KEY?.trim()) {
      return await sendViaResend({ to, subject, html });
    }

    // eslint-disable-next-line no-console
    console.log(`[Email] No email service configured. Recipient: ${to}, Subject: ${subject}`);
    return { success: false, error: 'No email service configured' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email error';
    // eslint-disable-next-line no-console
    console.error(`[Email] Failed to send email to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
};

export const sendActivationEmail = ({
  to,
  name,
  activationLink,
}: SendActivationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => sendEmail({
  to,
  subject: 'Your access to the Koda platform has been granted!',
  html: getActivationHtmlTemplate(name, activationLink),
});

export const sendRejectionEmail = ({
  to,
  name,
  reason,
}: SendRejectionEmailParams): Promise<{ success: boolean; id?: string; error?: string }> => sendEmail({
  to,
  subject: 'Update on your access request — Koda',
  html: getRejectionHtmlTemplate(name, reason),
});
