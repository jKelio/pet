import { EmailSchema } from '@pet/shared';

export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Email {
    const result = EmailSchema.safeParse(raw);
    if (!result.success) {
      throw new InvalidEmailError(raw);
    }
    return new Email(result.data);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class InvalidEmailError extends Error {
  constructor(email: string) {
    super(`Invalid email address: "${email}"`);
    this.name = 'InvalidEmailError';
  }
}
