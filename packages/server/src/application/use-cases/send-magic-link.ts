import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { EmailSender } from '../../domain/ports/email.sender.js';
import { AuthService } from '../../domain/services/auth.service.js';
import { Email } from '../../domain/value-objects/email.js';
import type { User } from '@pet/shared';

export interface SendMagicLinkDeps {
  userRepository: UserRepository;
  emailSender: EmailSender;
  authService: AuthService;
  appBaseUrl: string;
  superAdminEmails: string[];
}

export class SendMagicLinkUseCase {
  constructor(private readonly deps: SendMagicLinkDeps) {}

  async execute(rawEmail: string): Promise<void> {
    const email = Email.create(rawEmail);
    const emailStr = email.toString();

    let user = await this.deps.userRepository.findByEmail(emailStr);

    if (!user) {
      const isSuperAdmin = this.deps.superAdminEmails
        .map((e) => e.toLowerCase())
        .includes(emailStr.toLowerCase());

      // No auto-registration — only pre-invited users or superadmin emails can log in.
      // Return silently to prevent email enumeration.
      if (!isSuperAdmin) return;

      const newUser: User = {
        id: crypto.randomUUID(),
        email: emailStr,
        name: '',
        memberships: [],
      };
      await this.deps.userRepository.save(newUser);
      user = newUser;
    }

    const token = this.deps.authService.generateMagicLinkToken();
    await this.deps.userRepository.saveMagicLinkToken(user.id, token.hash, token.expiresAt);

    const magicLinkUrl = `${this.deps.appBaseUrl}/auth/verify?token=${token.raw}`;

    await this.deps.emailSender.sendMagicLink({
      to: emailStr,
      magicLinkUrl,
      userName: user.name || undefined,
    });
  }

}
