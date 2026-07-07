import { db } from '../db';
import { partnerUserAccounts, partners } from '../db/schema';
import { emailService } from './emailService';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface InviteEmployeeData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** admin | manager | member | viewer */
  role?: string;
}

export interface UpdateEmployeeData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: 'active' | 'suspended' | 'inactive';
}

export const partnerEmployeeService = {
  /**
   * Invite a new employee to the partner organization
   */
  async inviteEmployee(partnerId: string, inviterAccountId: string, data: InviteEmployeeData) {
    // Check if email already exists
    const existingAccount = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.email, data.email.toLowerCase()))
      .limit(1);

    if (existingAccount.length > 0) {
      throw new Error('An account with this email already exists');
    }

    const [partnerRow] = await db
      .select({ partnerName: partners.partnerName })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    const assignedRole = data.role && ['admin', 'manager', 'member', 'viewer'].includes(data.role)
      ? data.role
      : 'member';

    // Generate temporary password (will be reset on first login)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 168); // 7 days

    // Create account with pending_verification status
    const [account] = await db
      .insert(partnerUserAccounts)
      .values({
        partnerId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: assignedRole,
        status: 'pending_verification',
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      })
      .returning();

    if (!account) {
      throw new Error('Failed to create employee account');
    }

    try {
      await emailService.sendEmployeeInvite(account.email, {
        verificationToken: emailVerificationToken,
        tempPassword,
        partnerName: partnerRow?.partnerName || 'Your organization',
        role: assignedRole,
      });
    } catch (e) {
      console.error('[email] Employee invite failed:', e);
    }

    return {
      accountId: account.accountId,
      email: account.email,
      emailVerificationToken,
      tempPassword,
    };
  },

  /**
   * Get all employees for a partner organization
   */
  async getEmployees(partnerId: string) {
    const employees = await db
      .select({
        accountId: partnerUserAccounts.accountId,
        email: partnerUserAccounts.email,
        firstName: partnerUserAccounts.firstName,
        lastName: partnerUserAccounts.lastName,
        phone: partnerUserAccounts.phone,
        status: partnerUserAccounts.status,
        emailVerified: partnerUserAccounts.emailVerified,
        role: partnerUserAccounts.role,
        lastLoginAt: partnerUserAccounts.lastLoginAt,
        createdAt: partnerUserAccounts.createdAt,
      })
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.partnerId, partnerId))
      .orderBy(partnerUserAccounts.createdAt);

    return employees;
  },

  /**
   * Get employee by ID
   */
  async getEmployeeById(partnerId: string, accountId: string) {
    const [employee] = await db
      .select()
      .from(partnerUserAccounts)
      .where(
        and(
          eq(partnerUserAccounts.partnerId, partnerId),
          eq(partnerUserAccounts.accountId, accountId)
        )
      )
      .limit(1);

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  },

  /**
   * Update employee information
   */
  async updateEmployee(
    partnerId: string,
    accountId: string,
    data: UpdateEmployeeData
  ) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const [updated] = await db
      .update(partnerUserAccounts)
      .set(updateData)
      .where(
        and(
          eq(partnerUserAccounts.partnerId, partnerId),
          eq(partnerUserAccounts.accountId, accountId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Employee not found or update failed');
    }

    return updated;
  },

  /**
   * Resend invitation email
   */
  async resendInvitation(partnerId: string, accountId: string) {
    const employee = await this.getEmployeeById(partnerId, accountId);

    if (employee.status !== 'pending_verification') {
      throw new Error('Employee is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 168); // 7 days

    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db
      .update(partnerUserAccounts)
      .set({
        emailVerificationToken,
        emailVerificationExpires,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, accountId));

    const [partnerRow] = await db
      .select({ partnerName: partners.partnerName })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    try {
      await emailService.sendEmployeeInvite(employee.email, {
        verificationToken: emailVerificationToken,
        tempPassword,
        partnerName: partnerRow?.partnerName || 'Your organization',
        role: (employee.role as string) || 'member',
      });
    } catch (e) {
      console.error('[email] Resend invite failed:', e);
    }

    return {
      emailVerificationToken,
    };
  },

  /**
   * Remove/deactivate employee
   */
  async removeEmployee(partnerId: string, accountId: string) {
    // Don't delete, just set status to inactive
    const [updated] = await db
      .update(partnerUserAccounts)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partnerUserAccounts.partnerId, partnerId),
          eq(partnerUserAccounts.accountId, accountId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Employee not found');
    }

    return updated;
  },
};









