import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { SendMagicLinkUseCase } from './send-magic-link.js';
import { AuthService } from '../../domain/services/auth.service.js';
import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { EmailSender } from '../../domain/ports/email.sender.js';

function makeRepo(existingUser: { id: string; email: string; name: string; createdAt: string } | null): UserRepository {
  return {
    findByEmail: mock(async () => existingUser),
    save: mock(async () => {}),
    findById: mock(async () => null),
    saveMagicLinkToken: mock(async () => {}),
    clearMagicLinkToken: mock(async () => {}),
    updateLastLogin: mock(async () => {}),
    findByMagicLinkToken: mock(async () => null),
    findByRefreshToken: mock(async () => null),
    saveRefreshToken: mock(async () => {}),
    clearRefreshToken: mock(async () => {}),
  } as unknown as UserRepository;
}

function makeEmailSender(): EmailSender {
  return { sendMagicLink: mock(async () => {}) };
}

describe('SendMagicLinkUseCase', () => {
  const authService = new AuthService();
  const appBaseUrl = 'https://app.example.com';

  test('creates a new user when email is not registered', async () => {
    const repo = makeRepo(null);
    const emailSender = makeEmailSender();
    const useCase = new SendMagicLinkUseCase({ userRepository: repo, emailSender, authService, appBaseUrl });

    await useCase.execute('new@example.com');

    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedUser = (repo.save as ReturnType<typeof mock>).mock.calls[0][0];
    expect(savedUser.email).toBe('new@example.com');
  });

  test('reuses existing user without creating a new one', async () => {
    const existing = { id: 'user-1', email: 'coach@example.com', name: 'Coach', createdAt: new Date().toISOString() };
    const repo = makeRepo(existing);
    const emailSender = makeEmailSender();
    const useCase = new SendMagicLinkUseCase({ userRepository: repo, emailSender, authService, appBaseUrl });

    await useCase.execute('coach@example.com');

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.saveMagicLinkToken).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  test('sends a magic link email with a URL containing the raw token', async () => {
    const repo = makeRepo(null);
    const emailSender = makeEmailSender();
    const useCase = new SendMagicLinkUseCase({ userRepository: repo, emailSender, authService, appBaseUrl });

    await useCase.execute('test@example.com');

    expect(emailSender.sendMagicLink).toHaveBeenCalledTimes(1);
    const call = (emailSender.sendMagicLink as ReturnType<typeof mock>).mock.calls[0][0];
    expect(call.to).toBe('test@example.com');
    expect(call.magicLinkUrl).toContain('/auth/verify?token=');
    expect(call.magicLinkUrl).toContain(appBaseUrl);
  });

  test('rejects invalid email addresses', async () => {
    const repo = makeRepo(null);
    const emailSender = makeEmailSender();
    const useCase = new SendMagicLinkUseCase({ userRepository: repo, emailSender, authService, appBaseUrl });

    expect(useCase.execute('not-an-email')).rejects.toThrow();
  });
});
