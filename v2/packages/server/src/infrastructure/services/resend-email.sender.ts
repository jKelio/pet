import { Resend } from 'resend';
import type { EmailSender, MagicLinkEmailParams } from '../../domain/ports/email.sender.js';

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;

  constructor(apiKey: string, private readonly fromAddress: string) {
    this.client = new Resend(apiKey);
  }

  async sendMagicLink(params: MagicLinkEmailParams): Promise<void> {
    const greeting = params.userName ? `Hallo ${params.userName}` : 'Hallo';

    const { error } = await this.client.emails.send({
      from: this.fromAddress,
      to: params.to,
      subject: 'Dein Login-Link für PET',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #05173D;">${greeting},</h2>
          <p>hier ist dein Login-Link für PET – Practice Efficiency Tracking.</p>
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

    if (error) {
      throw new EmailDeliveryError(params.to, error.message);
    }
  }
}

export class EmailDeliveryError extends Error {
  constructor(to: string, cause: string) {
    super(`Failed to send email to ${to}: ${cause}`);
    this.name = 'EmailDeliveryError';
  }
}
