export interface MagicLinkEmailParams {
  to: string;
  magicLinkUrl: string;
  userName?: string;
  inviteContext?: { tenantName: string; role: string };
}

export interface EmailSender {
  sendMagicLink(params: MagicLinkEmailParams): Promise<void>;
}
