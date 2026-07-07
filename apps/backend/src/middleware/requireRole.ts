import { FastifyRequest, FastifyReply } from 'fastify';

/** Operations Portal JWT uses `role`: platform_admin | viewer and claim `operationsRole` for fine-grained checks. */
export function requireOperationsRole(...allowedJwtRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.user?.role;
    if (!role || !allowedJwtRoles.includes(role)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}

export function requireOperationsDbRole(...allowed: ('superadmin' | 'admin' | 'viewer')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const op = request.user?.operationsRole as string | undefined;
    if (!op || !allowed.includes(op as 'superadmin' | 'admin' | 'viewer')) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}

/** Partner employee RBAC — JWT includes account role from partner_user_accounts.role */
export function requirePartnerRole(...allowed: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const r = request.partnerUser?.role;
    if (!r || !allowed.includes(r)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient partner permissions',
      });
    }
  };
}
