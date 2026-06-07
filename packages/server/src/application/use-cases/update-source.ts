import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Source } from '@pet/shared';
import { SourceForbiddenError, SourceNotFoundError } from './list-sources.js';

export interface UpdateSourceDeps {
  sourceRepository: SourceRepository;
  membershipRepository: MembershipRepository;
}

export interface UpdateSourceContext {
  userId: string;
  tenantId: string;
}

export class UpdateSourceUseCase {
  constructor(private readonly deps: UpdateSourceDeps) {}

  async execute(id: string, patch: { url?: string; title?: string }, ctx: UpdateSourceContext): Promise<Source> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new SourceForbiddenError('Not a member of this tenant');
    if (membership.role === 'analyst') throw new SourceForbiddenError('Analysts cannot update sources');

    const updated = await this.deps.sourceRepository.update(id, ctx.tenantId, patch);
    if (!updated) throw new SourceNotFoundError('Source not found');
    return updated;
  }
}
