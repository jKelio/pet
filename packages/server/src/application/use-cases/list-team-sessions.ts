import type { SessionRepository, SessionCursor } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { SessionListPage } from '@pet/shared';
import { ForbiddenError } from './delete-session.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid pagination cursor');
    this.name = 'InvalidCursorError';
  }
}

export interface ListTeamSessionsDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface ListTeamSessionsContext {
  userId: string;
  tenantId: string;
}

export interface ListTeamSessionsOptions {
  limit?: number;
  /** Opaque cursor from a previous page's nextCursor. */
  cursor?: string;
}

function encodeCursor(cursor: SessionCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): SessionCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('date' in parsed) || !('createdAt' in parsed) || !('id' in parsed)
  ) {
    throw new InvalidCursorError();
  }
  const { date, createdAt, id } = parsed as Record<string, unknown>;
  if (
    (date !== null && typeof date !== 'string') ||
    typeof createdAt !== 'string' ||
    typeof id !== 'string'
  ) {
    throw new InvalidCursorError();
  }
  return { date: date as string | null, createdAt, id };
}

export class ListTeamSessionsUseCase {
  constructor(private readonly deps: ListTeamSessionsDeps) {}

  async execute(
    teamId: string,
    ctx: ListTeamSessionsContext,
    options: ListTeamSessionsOptions = {},
  ): Promise<SessionListPage> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(
      ctx.userId,
      ctx.tenantId,
    );
    if (!membership) {
      throw new ForbiddenError('User is not a member of this tenant');
    }

    const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const before = options.cursor ? decodeCursor(options.cursor) : undefined;

    const page = await this.deps.sessionRepository.findByTeam(teamId, ctx.tenantId, { limit, before });

    return {
      items: page.items,
      nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    };
  }
}
