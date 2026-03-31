import { createHash, randomBytes } from 'crypto';
import { MAGIC_LINK_TTL_MS } from '@pet/shared';

export interface MagicLinkToken {
  raw: string;
  hash: string;
  expiresAt: Date;
}

export class AuthService {
  generateMagicLinkToken(): MagicLinkToken {
    const raw = randomBytes(32).toString('base64url');
    const hash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    return { raw, hash, expiresAt };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  isTokenExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  }
}
