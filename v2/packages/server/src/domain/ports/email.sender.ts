export interface MagicLinkEmailParams {
  to: string;
  magicLinkUrl: string;
  userName?: string;
}

export interface EmailSender {
  sendMagicLink(params: MagicLinkEmailParams): Promise<void>;
}
