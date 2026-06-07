import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import { SourceForbiddenError, SourceNotFoundError } from './list-sources.js';

export interface DeleteSourceDeps {
  sourceRepository: SourceRepository;
  membershipRepository: MembershipRepository;
}

export interface DeleteSourceContext {
  userId: string;
  tenantId: string;
}

export class DeleteSourceUseCase {
  constructor(private readonly deps: DeleteSourceDeps) {}

  async execute(id: string, ctx: DeleteSourceContext): Promise<void> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new SourceForbiddenError('Not a member of this tenant');
    if (membership.role === 'analyst') throw new SourceForbiddenError('Analysts cannot delete sources');

    const source = await this.deps.sourceRepository.findById(id, ctx.tenantId);
    if (!source) throw new SourceNotFoundError('Source not found');

    await this.deps.sourceRepository.delete(id, ctx.tenantId);
  }
}
