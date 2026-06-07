import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Source } from '@pet/shared';
import { SourceForbiddenError } from './list-sources.js';

export interface CreateSourceDeps {
  sourceRepository: SourceRepository;
  membershipRepository: MembershipRepository;
}

export interface CreateSourceContext {
  userId: string;
  tenantId: string;
}

export class CreateSourceUseCase {
  constructor(private readonly deps: CreateSourceDeps) {}

  async execute(input: { url: string; title: string }, ctx: CreateSourceContext): Promise<Source> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new SourceForbiddenError('Not a member of this tenant');
    if (membership.role === 'analyst') throw new SourceForbiddenError('Analysts cannot create sources');

    return this.deps.sourceRepository.create({
      tenantId: ctx.tenantId,
      url: input.url,
      title: input.title,
      createdBy: ctx.userId,
    });
  }
}
