/**
 * Crash-fast validation for required environment variables.
 * Call `validateEnv()` at process startup before listening.
 */
export function validateEnv(): void {
  const always = ['DATABASE_URL', 'JWT_SECRET'];
  const prodOnly = ['FRONTEND_URL'];

  const missing = always.filter((k) => !process.env[k]?.trim());
  if (process.env.NODE_ENV === 'production') {
    missing.push(...prodOnly.filter((k) => !process.env[k]?.trim()));
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(', ')}. See .env.example.`
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'secret') {
    throw new Error('[env] JWT_SECRET must not use the default value in production.');
  }
}
