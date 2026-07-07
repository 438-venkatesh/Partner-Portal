import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyRequest {
    partnerUser?: {
      accountId: string;
      email: string;
      partnerId: string;
      role: string;
    };
  }
}

/**
 * Partner authentication middleware
 * Validates JWT token for partner users
 */
export async function authenticatePartner(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized - No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    // Verify this is a partner user token
    if (!decoded.partnerId) {
      return reply.code(403).send({ error: 'Forbidden - Invalid token type' });
    }
    
    request.partnerUser = {
      accountId: decoded.accountId,
      email: decoded.email,
      partnerId: decoded.partnerId,
      role: decoded.role || 'member',
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return reply.code(401).send({ error: 'Unauthorized - Token expired' });
    }
    return reply.code(401).send({ error: 'Unauthorized - Invalid token' });
  }
}









