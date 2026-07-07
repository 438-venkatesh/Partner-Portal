import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role: string;
      /** Raw DB role for Operations staff (JWT claim `operationsRole`) */
      operationsRole?: string;
      tenantId?: string;
    };
  }
}

/** When true: missing/invalid JWT falls back to mock platform_admin (local DX only). Never enable in production. */
export function operationsAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.ALLOW_OPERATIONS_AUTH_BYPASS === 'true'
  );
}

function mockOperationsUser() {
  return {
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'dev@example.com',
    role: 'platform_admin',
    operationsRole: 'superadmin' as const,
  };
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const bypass = operationsAuthBypassEnabled();
  const token = request.headers.authorization?.replace('Bearer ', '').trim();

  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
    }
    if (bypass) {
      request.user = mockOperationsUser();
      return;
    }
    return reply.code(401).send({ error: 'Unauthorized', message: 'Missing bearer token' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as {
      userId?: string;
      email?: string;
      role?: string;
      operationsRole?: string;
      tenantId?: string;
      sub?: string;
    };
    request.user = {
      userId: decoded.userId || decoded.sub || '',
      email: decoded.email || '',
      role: decoded.role || 'platform_admin',
      operationsRole: decoded.operationsRole,
      tenantId: decoded.tenantId,
    };
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    if (bypass) {
      request.user = mockOperationsUser();
      return;
    }
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
