import { describe, it, expect } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  it('throws when JWT_SECRET uses default in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://x';
    process.env.JWT_SECRET = 'secret';
    process.env.FRONTEND_URL = 'http://localhost';
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
    process.env.NODE_ENV = prev;
  });
});
