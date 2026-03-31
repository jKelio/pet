import nodemailer from 'nodemailer';
import type { EmailSender, MagicLinkEmailParams } from '../../domain/ports/email.sender.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.pass
        ? { auth: { user: config.user, pass: config.pass } }
        : {}),
    });
  }

  async sendMagicLink(params: MagicLinkEmailParams): Promise<void> {
    const greeting = params.userName ? `Hallo ${params.userName}` : 'Hallo';
    const isInvite = !!params.inviteContext;

    const subject = isInvite
      ? `Du wurdest zu ${params.inviteContext!.tenantName} eingeladen`
      : 'Dein Login-Link für PET';

    const body = isInvite
      ? `<p>Du wurdest als <strong>${params.inviteContext!.role}</strong> zu <strong>${params.inviteContext!.tenantName}</strong> auf PET eingeladen.</p>
         <p>Klicke auf den Link, um dein Konto zu aktivieren und dich einzuloggen.</p>`
      : `<p>hier ist dein Login-Link für PET – Practice Efficiency Tracking.</p>`;

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: params.to,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #05173D;">${greeting},</h2>
            ${body}
            <p>Der Link ist <strong>15 Minuten</strong> gültig.</p>
            <a href="${params.magicLinkUrl}"
               style="display: inline-block; margin: 24px 0; padding: 14px 28px;
                      background: #05173D; color: #fff; border-radius: 8px;
                      text-decoration: none; font-weight: bold;">
              Jetzt einloggen
            </a>
            <p style="color: #666; font-size: 13px;">
              Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.
            </p>
          </div>
        `,
      });
    } catch (err) {
      throw new EmailDeliveryError(params.to, err instanceof Error ? err.message : String(err));
    }
  }
}

export class EmailDeliveryError extends Error {
  constructor(to: string, cause: string) {
    super(`Failed to send email to ${to}: ${cause}`);
    this.name = 'EmailDeliveryError';
  }
}
