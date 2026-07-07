import { FastifyInstance } from 'fastify';
import { partnerEmployeeService } from '../services/partnerEmployeeService';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requirePartnerRole } from '../middleware/requireRole';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

const inviteEmployeeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'member', 'viewer']).optional(),
});

const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
});

const accountIdParamsSchema = z.object({
  accountId: z.string().uuid(),
});

export async function partnerEmployeesRoutes(fastify: FastifyInstance) {
  // All routes require partner authentication
  fastify.addHook('onRequest', authenticatePartner);

  // Get all employees
  fastify.get('/', async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const employees = await partnerEmployeeService.getEmployees(partnerId);
      return reply.send({ employees });
    } catch (error: any) {
      fastify.log.error('Get employees error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch employees',
        message: error.message,
      });
    }
  });

  // Invite new employee
  fastify.post('/invite', {
    preHandler: [requirePartnerRole('admin', 'manager')],
    schema: {
      body: zodToFastifySchema(inviteEmployeeSchema),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const accountId = request.partnerUser?.accountId;
      
      if (!partnerId || !accountId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const result = await partnerEmployeeService.inviteEmployee(
        partnerId,
        accountId,
        request.body as any
      );

      const payload: Record<string, unknown> = {
        message: 'Employee invitation sent successfully',
        accountId: result.accountId,
        email: result.email,
      };
      if (process.env.NODE_ENV !== 'production') {
        payload.tempPassword = result.tempPassword;
      }
      return reply.code(201).send(payload);
    } catch (error: any) {
      fastify.log.error('Invite employee error:', error);
      return reply.code(400).send({
        error: 'Failed to invite employee',
        message: error.message,
      });
    }
  });

  // Get employee by ID
  fastify.get('/:accountId', {
    schema: {
      params: zodToFastifySchema(accountIdParamsSchema),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const { accountId } = request.params as { accountId: string };

      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const employee = await partnerEmployeeService.getEmployeeById(partnerId, accountId);
      
      // Don't return password hash
      const { passwordHash, ...employeeData } = employee;
      
      return reply.send(employeeData);
    } catch (error: any) {
      fastify.log.error('Get employee error:', error);
      return reply.code(404).send({
        error: 'Employee not found',
        message: error.message,
      });
    }
  });

  // Update employee
  fastify.put('/:accountId', {
    schema: {
      params: zodToFastifySchema(accountIdParamsSchema),
      body: zodToFastifySchema(updateEmployeeSchema),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const { accountId } = request.params as { accountId: string };

      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const updated = await partnerEmployeeService.updateEmployee(
        partnerId,
        accountId,
        request.body as any
      );

      const { passwordHash, ...employeeData } = updated;

      return reply.send(employeeData);
    } catch (error: any) {
      fastify.log.error('Update employee error:', error);
      return reply.code(400).send({
        error: 'Failed to update employee',
        message: error.message,
      });
    }
  });

  // Resend invitation
  fastify.post('/:accountId/resend-invitation', {
    schema: {
      params: zodToFastifySchema(accountIdParamsSchema),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const { accountId } = request.params as { accountId: string };

      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      await partnerEmployeeService.resendInvitation(partnerId, accountId);

      return reply.send({
        message: 'Invitation email resent successfully',
      });
    } catch (error: any) {
      fastify.log.error('Resend invitation error:', error);
      return reply.code(400).send({
        error: 'Failed to resend invitation',
        message: error.message,
      });
    }
  });

  // Remove/deactivate employee
  fastify.delete('/:accountId', {
    schema: {
      params: zodToFastifySchema(accountIdParamsSchema),
    },
  }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      const { accountId } = request.params as { accountId: string };

      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      await partnerEmployeeService.removeEmployee(partnerId, accountId);

      return reply.send({
        message: 'Employee removed successfully',
      });
    } catch (error: any) {
      fastify.log.error('Remove employee error:', error);
      return reply.code(400).send({
        error: 'Failed to remove employee',
        message: error.message,
      });
    }
  });
}









