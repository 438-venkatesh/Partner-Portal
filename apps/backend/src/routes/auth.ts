import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { operationsAuthService, type AdminRole } from '../services/operationsAuthService';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { routeRateLimitLogin } from '../config/rateLimit';
import { db } from '../db';
import { adminUsers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logPlatformAction, listPlatformActions } from '../utils/platformAuditLogger';

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

const updateRoleBodySchema = z.object({
  role: z.enum(['superadmin', 'admin', 'viewer']),
});

const setActiveBodySchema = z.object({
  isActive: z.boolean(),
});

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
      preHandler: [authenticate, requireOperationsDbRole('superadmin')],
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
        await logPlatformAction({
          actorId: request.user!.userId!,
          actorEmail: request.user!.email,
          action: 'admin_created',
          entityType: 'admin_user',
          entityId: created.userId,
          metadata: { email: created.email, role: created.operationsRole },
          ipAddress: request.ip,
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

  // Full staff directory for the admin-accounts management panel (superadmin only)
  fastify.get(
    '/staff',
    { preHandler: [authenticate, requireOperationsDbRole('superadmin')] },
    async (_request, reply) => {
      const staff = await operationsAuthService.listStaff();
      return reply.send({ staff });
    }
  );

  fastify.put(
    '/staff/:adminId/role',
    {
      preHandler: [authenticate, requireOperationsDbRole('superadmin')],
      schema: {
        params: zodToFastifySchema(z.object({ adminId: z.string().uuid() })),
        body: zodToFastifySchema(updateRoleBodySchema),
      },
    },
    async (request, reply) => {
      const { adminId } = request.params as { adminId: string };
      const body = request.body as z.infer<typeof updateRoleBodySchema>;
      try {
        const updated = await operationsAuthService.updateStaffRole(adminId, body.role as AdminRole);
        await logPlatformAction({
          actorId: request.user!.userId!,
          actorEmail: request.user!.email,
          action: 'admin_role_changed',
          entityType: 'admin_user',
          entityId: adminId,
          metadata: { newRole: body.role },
          ipAddress: request.ip,
        });
        return reply.send({ user: updated });
      } catch (e: any) {
        return reply.code(400).send({ message: e.message || 'Could not update role' });
      }
    }
  );

  fastify.put(
    '/staff/:adminId/active',
    {
      preHandler: [authenticate, requireOperationsDbRole('superadmin')],
      schema: {
        params: zodToFastifySchema(z.object({ adminId: z.string().uuid() })),
        body: zodToFastifySchema(setActiveBodySchema),
      },
    },
    async (request, reply) => {
      const { adminId } = request.params as { adminId: string };
      const body = request.body as z.infer<typeof setActiveBodySchema>;
      try {
        const updated = await operationsAuthService.setStaffActive(adminId, body.isActive);
        await logPlatformAction({
          actorId: request.user!.userId!,
          actorEmail: request.user!.email,
          action: body.isActive ? 'admin_reactivated' : 'admin_deactivated',
          entityType: 'admin_user',
          entityId: adminId,
          ipAddress: request.ip,
        });
        return reply.send({ user: updated });
      } catch (e: any) {
        return reply.code(400).send({ message: e.message || 'Could not update status' });
      }
    }
  );

  // Platform-level audit log — admin account changes, tenant CRUD, billing/commission plan edits
  fastify.get(
    '/audit-log',
    {
      preHandler: [authenticate, requireOperationsDbRole('admin', 'superadmin')],
      schema: {
        querystring: zodToFastifySchema(
          z.object({
            entityType: z.string().optional(),
            limit: z.coerce.number().int().min(1).max(200).optional(),
            offset: z.coerce.number().int().min(0).optional(),
          })
        ),
      },
    },
    async (request, reply) => {
      const query = request.query as { entityType?: string; limit?: number; offset?: number };
      const entries = await listPlatformActions(query);
      return reply.send({ entries });
    }
  );
}
