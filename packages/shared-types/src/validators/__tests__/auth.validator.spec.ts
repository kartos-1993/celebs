import { describe, expect,it } from 'vitest';
import { ZodError } from 'zod';

import { emailSchema,loginSchema, registerSchema } from '../auth.validator';

describe('Auth Zod Validator Unit Tests', () => {
  it('should pass valid registration payloads cleanly', () => {
    const payload = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    const parsed = registerSchema.parse(payload);
    expect(parsed.email).toBe('john.doe@example.com');
  });

  it('should throw ZodError on missing required fields', () => {
    const payload = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    expect(() => registerSchema.parse(payload)).toThrow(ZodError);
  });

  it('should throw ZodError on invalid email format', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow(ZodError);
  });

  it('should throw ZodError when password and confirmPassword do not match', () => {
    const payload = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
      confirmPassword: 'DifferentPassword123!',
    };

    expect(() => registerSchema.parse(payload)).toThrow(ZodError);
  });

  it('should handle XSS attempt in login payload strictly', () => {
    const payload = {
      email: '<script>alert(1)</script>@example.com',
      password: 'Password123!',
    };

    expect(() => loginSchema.parse(payload)).toThrow(ZodError);
  });
});
