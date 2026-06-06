import type { EmailSender, MagicLinkEmailParams } from '../../domain/ports/email.sender.js';

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendMagicLink(params: MagicLinkEmailParams): Promise<void> {
    const greeting = params.userName ? `Hallo ${params.userName}` : 'Hallo';
    const isInvite = !!params.inviteContext;

    const subject = isInvite
      ? `Du wurdest zu ${params.inviteContext!.tenantName} eingeladen`
      : 'Dein Login-Link für PROTRACK';

    const body = isInvite
      ? `<p>Du wurdest als <strong>${params.inviteContext!.role}</strong> zu <strong>${params.inviteContext!.tenantName}</strong> auf PROTRACK eingeladen.</p>
         <p>Klicke auf den Link, um dein Konto zu aktivieren und dich einzuloggen.</p>`
      : `<p>hier ist dein Login-Link für PROTRACK – Practice Efficiency Tracking.</p>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
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
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API error ${res.status}: ${text}`);
    }
  }
}
