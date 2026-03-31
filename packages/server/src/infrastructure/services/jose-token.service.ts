import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { TokenIssuer } from '../../application/use-cases/verify-magic-link.js';
import type { User } from '@pet/shared';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from '@pet/shared';

export interface JwtPayload extends JWTPayload {
  sub: string;
  email: string;
  tenantId?: string;
  type: 'access' | 'refresh';
}

export interface VerifiedToken {
  userId: string;
  email: string;
  tenantId?: string;
  type: 'access' | 'refresh';
}

export class JoseTokenService implements TokenIssuer {
  private readonly secretKey: Uint8Array;

  constructor(secret: string) {
    this.secretKey = new TextEncoder().encode(secret);
  }

  async issueAccessToken(user: User, tenantId?: string): Promise<string> {
    return new SignJWT({ email: user.email, tenantId, type: 'access' } satisfies Partial<JwtPayload>)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(this.secretKey);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    return new SignJWT({ type: 'refresh' } satisfies Partial<JwtPayload>)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_TTL)
      .sign(this.secretKey);
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { payload } = await jwtVerify<JwtPayload>(token, this.secretKey);
    return {
      userId: payload.sub!,
      email: payload.email,
      tenantId: payload.tenantId,
      type: payload.type,
    };
  }
}
