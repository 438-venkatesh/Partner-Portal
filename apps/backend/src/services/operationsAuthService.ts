import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { count, eq, isNotNull, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { adminUsers } from '../db/schema';

const ACCESS_EXPIRES = '8h';
const REFRESH_DAYS = 14;

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'secret';
}

export type AdminRole = 'superadmin' | 'admin' | 'viewer';

export const operationsAuthService = {
  async countAdmins(): Promise<number> {
    const [row] = await db.select({ c: count() }).from(adminUsers);
    return Number(row?.c ?? 0);
  },

  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();

    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, normalized))
      .limit(1);

    if (!admin || !admin.isActive) {
      throw new Error('Invalid email or password');
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new Error('Invalid email or password');
    }

    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + REFRESH_DAYS);

    await db
      .update(adminUsers)
      .set({
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: refreshExpires,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.adminId, admin.adminId));

    const accessToken = jwt.sign(accessTokenPayload(admin), jwtSecret(), { expiresIn: ACCESS_EXPIRES });

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: ACCESS_EXPIRES,
      user: {
        userId: admin.adminId,
        email: admin.email,
        role: mapAdminRoleToJwt(admin.role as AdminRole),
        operationsRole: admin.role,
      },
    };
  },

  async refresh(refreshToken: string) {
    const rows = await db
      .select()
      .from(adminUsers)
      .where(
        and(isNotNull(adminUsers.refreshTokenHash), gt(adminUsers.refreshTokenExpiresAt, new Date()))
      );

    let matched: (typeof adminUsers.$inferSelect) | null = null;

    for (const admin of rows) {
      if (!admin.refreshTokenHash) continue;
      const same = await bcrypt.compare(refreshToken, admin.refreshTokenHash);
      if (same) {
        matched = admin;
        break;
      }
    }

    if (!matched || !matched.isActive) {
      throw new Error('Invalid refresh token');
    }

    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + REFRESH_DAYS);

    await db
      .update(adminUsers)
      .set({
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: refreshExpires,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.adminId, matched.adminId));

    const accessToken = jwt.sign(accessTokenPayload(matched), jwtSecret(), { expiresIn: ACCESS_EXPIRES });

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: ACCESS_EXPIRES,
      user: {
        userId: matched.adminId,
        email: matched.email,
        role: mapAdminRoleToJwt(matched.role as AdminRole),
        operationsRole: matched.role,
      },
    };
  },

  async registerStaff(input: {
    email: string;
    password: string;
    role: AdminRole;
  }) {
    const normalized = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const [created] = await db
      .insert(adminUsers)
      .values({
        email: normalized,
        passwordHash,
        role: input.role,
        isActive: true,
      })
      .returning();

    if (!created) throw new Error('Failed to create admin user');

    return {
      userId: created.adminId,
      email: created.email,
      role: mapAdminRoleToJwt(created.role as AdminRole),
      operationsRole: created.role,
    };
  },
};

function accessTokenPayload(admin: {
  adminId: string;
  email: string;
  role: string;
}) {
  const r = admin.role as AdminRole;
  return {
    userId: admin.adminId,
    email: admin.email,
    role: r === 'viewer' ? 'viewer' : 'platform_admin',
    operationsRole: r,
  };
}

/** JWT uses platform_admin for operations UI compatibility */
function mapAdminRoleToJwt(role: AdminRole): string {
  if (role === 'superadmin' || role === 'admin') return 'platform_admin';
  return 'viewer';
}
