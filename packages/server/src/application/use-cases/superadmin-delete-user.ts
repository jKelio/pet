import type { UserRepository } from '../../domain/ports/user.repository.js';

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class SuperAdminDeleteUserUseCase {
  constructor(
    private readonly deps: {
      userRepository: UserRepository;
      superAdminEmails: string[];
    },
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.deps.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Super-admin accounts (incl. the caller) must not be deletable via this endpoint.
    const allowlist = this.deps.superAdminEmails.map((email) => email.toLowerCase());
    if (allowlist.includes(user.email.toLowerCase())) {
      throw new ForbiddenError('Super admin accounts cannot be deleted');
    }

    await this.deps.userRepository.delete(userId);
  }
}
