import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { partnerAuthService } from '../services/partnerAuthService';
import { authenticatePartner } from '../middleware/partnerAuth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { routeRateLimitLogin } from '../config/rateLimit';

const registerSchema = z.object({
  partnerName: z.string().min(1).max(255),
  displayName: z.string().max(255).optional().or(z.literal('')),
  partnerType: z.enum(['agency', 'reseller', 'integrator', 'consultant', 'affiliate', 'supplier', 'logistics_partner', 'supplier_logistics']),
  businessType: z.enum(['b2b', 'b2c', 'both']).optional(),
  website: z.string()
    .optional()
    .or(z.literal(''))
    .transform((val) => val === '' ? undefined : val)
    .refine((val) => val === undefined || z.string().url().safeParse(val).success, {
      message: 'Website must be a valid URL',
    }),
  description: z.string().optional().or(z.literal('')),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  acceptedTerms: z.boolean().optional(),
  acceptedTermsVersion: z.string().max(32).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(10),
});

const orgUpdateSchema = z.object({
  displayName: z.string().max(255).optional(),
  website: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(8000).optional(),
});

function clientIp(request: FastifyRequest): string {
  const xf = request.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  return request.socket.remoteAddress || '';
}

const resendVerificationBodySchema = z.object({
  email: z.string().email(),
});

export async function handleResendVerification(request: FastifyRequest, reply: FastifyReply) {
  const parsed = resendVerificationBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Invalid request',
      message: parsed.error.errors.map((e) => e.message).join(', '),
    });
  }

  try {
    const { email } = parsed.data;
    const result = await partnerAuthService.resendVerificationEmail(email);

    const host = request.headers.host ?? `localhost:${process.env.PORT || 3000}`;
    const proto = (request.headers['x-forwarded-proto'] as string) || request.protocol;
    const base = `${proto}://${host}`;

    const payload: Record<string, unknown> = { message: result.message };
    if (process.env.NODE_ENV !== 'production' && result.emailVerificationToken) {
      payload.emailVerificationToken = result.emailVerificationToken;
      payload.devEmailVerificationUrl = `${base}/api/partner-auth/verify-email/${result.emailVerificationToken}`;
    }

    return reply.send(payload);
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      error: 'Request failed',
      message: error.message,
    });
  }
}

export async function partnerAuthRoutes(fastify: FastifyInstance) {
  // Partner registration (public endpoint)
  fastify.post('/register', {
    ...routeRateLimitLogin,
    schema: {
      body: zodToFastifySchema(registerSchema),
    },
  }, async (request, reply) => {
    try {
      const result = await partnerAuthService.registerPartner(
        request.body as z.infer<typeof registerSchema>
      );

      const host = request.headers.host ?? `localhost:${process.env.PORT || 3000}`;
      const proto = (request.headers['x-forwarded-proto'] as string) || request.protocol;
      const base = `${proto}://${host}`;
      const verificationPath = `/api/partner-auth/verify-email/${result.account.emailVerificationToken}`;

      const payload: Record<string, unknown> = {
        message: 'Registration successful. Please check your email to verify your account.',
        partnerId: result.partner.partnerId,
        accountId: result.account.accountId,
      };

      // No email integration yet — expose token/link outside production for local testing.
      if (process.env.NODE_ENV !== 'production') {
        payload.emailVerificationToken = result.account.emailVerificationToken;
        payload.devEmailVerificationUrl = `${base}${verificationPath}`;
      }

      return reply.code(201).send(payload);
    } catch (error: any) {
      fastify.log.error('Partner registration error:', error);
      return reply.code(400).send({
        error: 'Registration failed',
        message: error.message,
      });
    }
  });

  // Email verification (public endpoint)
  fastify.get('/verify-email/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      await partnerAuthService.verifyEmail(token);
      
      return reply.send({
        message: 'Email verified successfully. Your account is now active.',
      });
    } catch (error: any) {
      fastify.log.error('Email verification error:', error);
      return reply.code(400).send({
        error: 'Verification failed',
        message: error.message,
      });
    }
  });

  // Partner login (public endpoint)
  fastify.post('/login', {
    ...routeRateLimitLogin,
    schema: {
      body: zodToFastifySchema(loginSchema),
    },
  }, async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };
      const session = await partnerAuthService.login(email, password, clientIp(request));

      return reply.send({
        token: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
        user: session.user,
      });
    } catch (error: any) {
      fastify.log.error('Partner login error:', error);
      console.error('Login error details:', {
        message: error.message,
        stack: error.stack,
      });
      return reply.code(401).send({
        error: 'Login failed',
        message: error.message || 'Unauthorized. Please login again.',
      });
    }
  });

  fastify.post(
    '/refresh',
    {
      schema: {
        body: zodToFastifySchema(refreshBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body as z.infer<typeof refreshBodySchema>;
        const session = await partnerAuthService.refreshPartnerSession(refreshToken);
        return reply.send({
          token: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: session.expiresIn,
          user: session.user,
        });
      } catch (error: any) {
        fastify.log.error('Partner refresh error:', error);
        return reply.code(401).send({
          error: 'Unauthorized',
          message: error.message || 'Invalid refresh token',
        });
      }
    }
  );

  // Request password reset (public endpoint)
  fastify.post('/forgot-password', {
    schema: {
      body: zodToFastifySchema(z.object({
        email: z.string().email(),
      })),
    },
  }, async (request, reply) => {
    try {
      const { email } = request.body as { email: string };
      await partnerAuthService.requestPasswordReset(email);
      
      return reply.send({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error: any) {
      fastify.log.error('Password reset request error:', error);
      return reply.code(400).send({
        error: 'Failed to process reset request',
        message: error.message,
      });
    }
  });

  // Reset password with token (public endpoint)
  fastify.post('/reset-password', {
    schema: {
      body: zodToFastifySchema(z.object({
        token: z.string(),
        password: z.string().min(8),
      })),
    },
  }, async (request, reply) => {
    try {
      const { token, password } = request.body as { token: string; password: string };
      await partnerAuthService.resetPassword(token, password);
      
      return reply.send({
        message: 'Password has been reset successfully. You can now login with your new password.',
      });
    } catch (error: any) {
      fastify.log.error('Password reset error:', error);
      return reply.code(400).send({
        error: 'Password reset failed',
        message: error.message,
      });
    }
  });

  // Change password (protected endpoint)
  fastify.post('/change-password', {
    preHandler: authenticatePartner,
    schema: {
      body: zodToFastifySchema(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })),
    },
  }, async (request, reply) => {
    try {
      const accountId = request.partnerUser?.accountId;
      if (!accountId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      await partnerAuthService.changePassword(accountId, currentPassword, newPassword);
      
      return reply.send({
        message: 'Password has been changed successfully',
      });
    } catch (error: any) {
      fastify.log.error('Change password error:', error);
      return reply.code(400).send({
        error: 'Failed to change password',
        message: error.message,
      });
    }
  });

  // Get current partner user (protected)
  fastify.get('/me', {
    preHandler: authenticatePartner,
  }, async (request, reply) => {
    try {
      const accountId = request.partnerUser?.accountId;
      if (!accountId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const account = await partnerAuthService.getAccountById(accountId);
      
      return reply.send({
        accountId: account.account.accountId,
        email: account.account.email,
        firstName: account.account.firstName,
        lastName: account.account.lastName,
        partnerId: account.partner.partnerId,
        partnerName: account.partner.partnerName,
        partnerType: account.partner.partnerType,
        partnerStatus: account.partner.status,
        role: account.account.role || 'member',
      });
    } catch (error: any) {
      fastify.log.error('Get current user error:', error);
      return reply.code(500).send({
        error: 'Failed to get user',
        message: error.message,
      });
    }
  });

  fastify.get('/organization', { preHandler: [authenticatePartner] }, async (request, reply) => {
    try {
      const partnerId = request.partnerUser?.partnerId;
      if (!partnerId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const organization = await partnerAuthService.getOrganization(partnerId);
      if (!organization) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.send({ organization });
    } catch (error: any) {
      fastify.log.error('Get organization error:', error);
      return reply.code(500).send({ message: error.message });
    }
  });

  fastify.put(
    '/organization',
    {
      preHandler: [authenticatePartner],
      schema: { body: zodToFastifySchema(orgUpdateSchema) },
    },
    async (request, reply) => {
      try {
        const partnerId = request.partnerUser?.partnerId;
        if (!partnerId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
        const body = request.body as z.infer<typeof orgUpdateSchema>;
        const updates: {
          displayName?: string | null;
          website?: string | null;
          description?: string | null;
        } = {};
        if (body.displayName !== undefined) updates.displayName = body.displayName;
        if (body.website !== undefined) {
          const w = body.website === '' ? null : body.website;
          if (w && !z.string().url().safeParse(w).success) {
            return reply.code(400).send({ message: 'Website must be a valid URL' });
          }
          updates.website = w;
        }
        if (body.description !== undefined) updates.description = body.description;

        const organization = await partnerAuthService.updateOrganization(partnerId, updates);
        if (!organization) {
          return reply.code(404).send({ error: 'Not found' });
        }
        const fresh = await partnerAuthService.getOrganization(partnerId);
        return reply.send({ organization: fresh });
      } catch (error: any) {
        fastify.log.error('Update organization error:', error);
        return reply.code(400).send({ message: error.message });
      }
    }
  );
}

