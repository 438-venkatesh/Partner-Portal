import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { operationsAuthService, type AdminRole } from '../services/operationsAuthService';
import { authenticate } from '../middleware/auth';
import { routeRateLimitLogin } from '../config/rateLimit';
import { db } from '../db';
import { adminUsers } from '../db/schema';
import { eq } from 'drizzle-orm';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(10),
});

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['superadmin', 'admin', 'viewer']),
});

async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
  const role = request.user?.operationsRole ?? request.user?.role;
  if (role !== 'superadmin') {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Only a superadmin can create Operations staff accounts',
    });
  }
}

/**
 * Operations Portal (platform staff) auth — separate from partner-auth.
 */
export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/login',
    {
      ...routeRateLimitLogin,
      schema: {
        body: zodToFastifySchema(loginBodySchema),
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof loginBodySchema>;
      try {
        const result = await operationsAuthService.login(body.email, body.password);
        return reply.send({
          token: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          user: result.user,
        });
      } catch {
        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Invalid email or password',
        });
      }
    }
  );

  fastify.post(
    '/refresh',
    {
      schema: {
        body: zodToFastifySchema(refreshBodySchema),
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof refreshBodySchema>;
      try {
        const result = await operationsAuthService.refresh(body.refreshToken);
        return reply.send({
          token: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          user: result.user,
        });
      } catch {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }
    }
  );

  fastify.post(
    '/register',
    {
      preHandler: [authenticate, requireSuperadmin],
      schema: {
        body: zodToFastifySchema(registerBodySchema),
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof registerBodySchema>;
      try {
        const created = await operationsAuthService.registerStaff({
          email: body.email,
          password: body.password,
          role: body.role as AdminRole,
        });
        return reply.code(201).send({ user: created });
      } catch (e: any) {
        request.log.error(e);
        return reply.code(400).send({
          error: 'Registration failed',
          message: e.message || 'Could not create user',
        });
      }
    }
  );

  // Lightweight staff directory — used to populate "assign an account manager" pickers.
  fastify.get('/users', { preHandler: authenticate }, async (_request, reply) => {
    const users = await db
      .select({ adminId: adminUsers.adminId, email: adminUsers.email, role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true));
    return reply.send({ users });
  });
}
