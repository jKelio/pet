import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Source } from '@pet/shared';

export interface ListSourcesDeps {
  sourceRepository: SourceRepository;
  membershipRepository: MembershipRepository;
}

export interface ListSourcesContext {
  userId: string;
  tenantId: string;
}

export class ListSourcesUseCase {
  constructor(private readonly deps: ListSourcesDeps) {}

  async execute(ctx: ListSourcesContext): Promise<Source[]> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new SourceForbiddenError('Not a member of this tenant');
    return this.deps.sourceRepository.findByTenant(ctx.tenantId);
  }
}

export class SourceForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'SourceForbiddenError';
  }
}

export class SourceNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'SourceNotFoundError';
  }
}
