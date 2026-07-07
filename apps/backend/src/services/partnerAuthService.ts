import { db } from '../db';
import { partnerUserAccounts, partners } from '../db/schema';
import { eq, and, sql, isNotNull, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { emailService } from './emailService';
import { assertStrongPassword } from '../utils/passwordPolicy';
import { ensureSupplierOnboarding, isSupplierPartnerType } from './supplierOnboardingBootstrap';

const PARTNER_ACCESS_EXPIRES = '15m';
const PARTNER_REFRESH_DAYS = 30;

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'secret';
}

export const partnerAuthService = {
  /**
   * Register a new partner organization
   * Creates partner record and first admin user account
   */
  async registerPartner(data: {
    partnerName: string;
    displayName?: string;
    partnerType: string;
    businessType?: string;
    website?: string;
    description?: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    acceptedTerms?: boolean;
    acceptedTermsVersion?: string;
  }) {
    assertStrongPassword(data.password);

    if (process.env.NODE_ENV === 'production') {
      if (!data.acceptedTerms) {
        throw new Error('You must accept the terms and conditions');
      }
    }

    // Generate partner code
    const partnerCode = `PART-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours
    
    // Create partner
    let partner;
    try {
      const partnerResult = await db
        .insert(partners)
        .values({
          partnerCode,
          partnerName: data.partnerName,
          displayName: data.displayName || data.partnerName,
          partnerType: data.partnerType as any,
          businessType: data.businessType,
          website: data.website,
          description: data.description,
          status: 'pending', // Requires verification before activation
        })
        .returning();
      
      if (!partnerResult || partnerResult.length === 0) {
        throw new Error('Failed to create partner record');
      }
      
      partner = partnerResult[0];
      console.log('Partner created successfully:', partner.partnerId);

      if (isSupplierPartnerType(partner.partnerType)) {
        await ensureSupplierOnboarding(partner.partnerId, partner.partnerType);
      }
    } catch (partnerError: any) {
      console.error('Error creating partner:', partnerError);
      throw new Error(`Failed to create partner: ${partnerError.message || 'Unknown error'}`);
    }
    
    // Create first admin user account
    // Explicitly specify only the columns we want to insert to avoid SQL generation issues
    try {
      const accountInsertData: {
        partnerId: string;
        email: string;
        passwordHash: string;
        status: 'pending_verification';
        emailVerified: boolean;
        emailVerificationToken: string;
        emailVerificationExpires: Date;
        role: 'admin';
        firstName?: string;
        lastName?: string;
        phone?: string;
        acceptedTermsAt: Date | null;
        acceptedTermsVersion: string | null;
      } = {
        partnerId: partner.partnerId,
        email: data.email.toLowerCase(),
        passwordHash,
        status: 'pending_verification',
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        role: 'admin',
        acceptedTermsAt: data.acceptedTerms ? new Date() : null,
        acceptedTermsVersion: data.acceptedTermsVersion ?? (data.acceptedTerms ? '1.0' : null),
      };
      
      // Only add optional fields if they have non-empty values
      if (data.firstName && data.firstName.trim().length > 0) {
        accountInsertData.firstName = data.firstName.trim();
      }
      if (data.lastName && data.lastName.trim().length > 0) {
        accountInsertData.lastName = data.lastName.trim();
      }
      if (data.phone && data.phone.trim().length > 0) {
        accountInsertData.phone = data.phone.trim();
      }
      
      // Use Drizzle's insert - ensure we're using the correct table reference
      // Log the data being inserted for debugging
      console.log('Inserting account data:', JSON.stringify({
        partnerId: accountInsertData.partnerId,
        email: accountInsertData.email,
        hasPasswordHash: !!accountInsertData.passwordHash,
        status: accountInsertData.status,
        emailVerified: accountInsertData.emailVerified,
        hasToken: !!accountInsertData.emailVerificationToken,
        hasExpires: !!accountInsertData.emailVerificationExpires,
        firstName: accountInsertData.firstName,
        lastName: accountInsertData.lastName,
        phone: accountInsertData.phone,
      }, null, 2));
      
      // Try Drizzle insert first, fallback to raw SQL if it fails
      let account;
      try {
        const insertResult = await db
          .insert(partnerUserAccounts)
          .values(accountInsertData)
          .returning();
        
        if (!insertResult || insertResult.length === 0) {
          throw new Error('Insert returned no rows');
        }
        
        account = insertResult[0];
      } catch (drizzleError: any) {
        // If Drizzle fails, use raw SQL as fallback
        console.warn('Drizzle insert failed, using raw SQL fallback:', drizzleError.message);
        
        const columns: string[] = [];
        const values: any[] = [];
        const placeholders: string[] = [];
        
        // Build column list and values
        columns.push('partner_id', 'email', 'password_hash', 'status', 'email_verified', 'email_verification_token', 'email_verification_expires');
        values.push(
          accountInsertData.partnerId,
          accountInsertData.email,
          accountInsertData.passwordHash,
          accountInsertData.status,
          accountInsertData.emailVerified,
          accountInsertData.emailVerificationToken,
          accountInsertData.emailVerificationExpires
        );
        
        if (accountInsertData.firstName) {
          columns.push('first_name');
          values.push(accountInsertData.firstName);
        }
        if (accountInsertData.lastName) {
          columns.push('last_name');
          values.push(accountInsertData.lastName);
        }
        if (accountInsertData.phone) {
          columns.push('phone');
          values.push(accountInsertData.phone);
        }
        
        // Generate placeholders
        for (let i = 0; i < values.length; i++) {
          placeholders.push(`$${i + 1}`);
        }
        
        // Build parameterized SQL query using sql template literal
        const columnList = columns.join(', ');
        
        // Use sql template with proper parameterization
        const rawSql = sql`
          INSERT INTO partner_user_accounts (${sql.raw(columnList)})
          VALUES ${sql.raw(placeholders.join(', '))}
          RETURNING account_id, email, first_name, last_name, phone, status, email_verified
        `;
        
        console.log('Executing raw SQL with', values.length, 'parameters');
        console.log('Columns:', columns);
        console.log('SQL query:', rawSql.query);
        
        // Execute with parameterized values
        // Note: Drizzle's sql template doesn't support direct parameter binding like this
        // We need to use the pool directly for parameterized queries
        const { dbPool } = await import('../db');
        const client = await dbPool.connect();
        
        try {
          const queryText = `
            INSERT INTO partner_user_accounts (${columnList})
            VALUES (${placeholders.join(', ')})
            RETURNING account_id, email, first_name, last_name, phone, status, email_verified
          `;
          
          console.log('Executing parameterized query with', values.length, 'parameters');
          
          // pg client.query accepts (text, values) directly
          const result = await client.query(queryText, values);
          
          if (!result.rows || result.rows.length === 0) {
            throw new Error('Raw SQL insert returned no rows');
          }
          
          const rawAccount = result.rows[0];
          account = {
            accountId: rawAccount.account_id,
            email: rawAccount.email,
            firstName: rawAccount.first_name,
            lastName: rawAccount.last_name,
            phone: rawAccount.phone,
            status: rawAccount.status,
            emailVerified: rawAccount.email_verified,
          };
        } catch (rawError: any) {
          console.error('Raw SQL insert error:', rawError);
          console.error('Full error:', JSON.stringify(rawError, Object.getOwnPropertyNames(rawError), 2));
          console.error('Error details:', {
            message: rawError.message,
            code: rawError.code,
            detail: rawError.detail,
            constraint: rawError.constraint,
            hint: rawError.hint,
            position: rawError.position,
          });
          throw rawError;
        } finally {
          client.release();
        }
      }
      
      if (!account) {
        throw new Error('Failed to create partner user account');
      }

      try {
        await emailService.sendEmailVerification(
          account.email as string,
          emailVerificationToken,
          partner.partnerName as string
        );
      } catch (mailErr) {
        console.error('[email] Verification send failed:', mailErr);
      }

      return {
        partner,
        account: {
          accountId: account.accountId,
          email: account.email,
          emailVerificationToken, // Returned for non-production API responses
        },
      };
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Error creating partner user account:', error);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        hint: error.hint,
        position: error.position,
        internalPosition: error.internalPosition,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        file: error.file,
        line: error.line,
        routine: error.routine,
      });
      console.error('Account insert data:', {
        partnerId: partner.partnerId,
        email: data.email.toLowerCase(),
        hasPasswordHash: !!passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      
      // Provide more helpful error messages
      if (error.code === '23505') { // Unique violation
        if (error.constraint?.includes('email')) {
          throw new Error('An account with this email already exists');
        }
        throw new Error('A record with these values already exists');
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid partner reference. Please try again.');
      }
      if (error.code === '23502') { // Not null violation
        throw new Error(`Required field is missing: ${error.column || 'unknown'}`);
      }
      
      throw new Error(`Failed to create partner user account: ${error.message || error.detail || 'Unknown error'}`);
    }
  },

  /**
   * Verify email and activate partner account
   */
  async verifyEmail(token: string) {
    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(
        and(
          eq(partnerUserAccounts.emailVerificationToken, token),
          eq(partnerUserAccounts.emailVerified, false)
        )
      )
      .limit(1);
    
    if (!account) {
      throw new Error('Invalid or expired verification token');
    }
    
    if (account.emailVerificationExpires && account.emailVerificationExpires < new Date()) {
      throw new Error('Verification token has expired');
    }
    
    // Mark email as verified
    await db
      .update(partnerUserAccounts)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: 'active',
      })
      .where(eq(partnerUserAccounts.accountId, account.accountId));
    
    // Check if partner can be activated (all admins verified)
    const partnerAccounts = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.partnerId, account.partnerId));
    
    const allVerified = partnerAccounts.every(acc => acc.emailVerified);
    
    if (allVerified && partnerAccounts.length > 0) {
      // Update partner status to active (but still needs admin approval)
      await db
        .update(partners)
        .set({
          status: 'pending', // Still pending admin approval
          updatedAt: new Date(),
        })
        .where(eq(partners.partnerId, account.partnerId));
    }
    
    return { success: true };
  },

  /**
   * Issue a new email verification token (e.g. user never received email or link expired).
   * Does not reveal whether the email exists.
   */
  async resendVerificationEmail(email: string): Promise<{
    message: string;
    emailVerificationToken?: string;
  }> {
    const normalized = email.toLowerCase();
    const genericMessage =
      'If an account exists for this email and still needs verification, a new link has been prepared.';

    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.email, normalized))
      .limit(1);

    if (!account || account.emailVerified || account.status !== 'pending_verification') {
      return { message: genericMessage };
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    await db
      .update(partnerUserAccounts)
      .set({
        emailVerificationToken,
        emailVerificationExpires,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, account.accountId));

    try {
      const [p] = await db
        .select({ partnerName: partners.partnerName })
        .from(partners)
        .where(eq(partners.partnerId, account.partnerId))
        .limit(1);
      await emailService.sendEmailVerification(
        normalized,
        emailVerificationToken,
        p?.partnerName
      );
    } catch (mailErr) {
      console.error('[email] Resend verification failed:', mailErr);
    }

    const out: { message: string; emailVerificationToken?: string } = {
      message: 'A new verification link is ready. Open it to activate your account.',
    };

    if (process.env.NODE_ENV !== 'production') {
      out.emailVerificationToken = emailVerificationToken;
    }

    return out;
  },

  /**
   * Login partner user — issues short-lived access JWT + refresh token (stored hashed).
   */
  async login(email: string, password: string, clientIp?: string | null) {
    console.log('Login attempt:', { email: email.toLowerCase(), hasPassword: !!password });
    
    const [account] = await db
      .select({
        account: partnerUserAccounts,
        partner: partners,
      })
      .from(partnerUserAccounts)
      .innerJoin(partners, eq(partnerUserAccounts.partnerId, partners.partnerId))
      .where(eq(partnerUserAccounts.email, email.toLowerCase()))
      .limit(1);
    
    if (!account) {
      console.log('Login failed: Account not found');
      throw new Error('Invalid email or password');
    }
    
    console.log('Account found:', {
      accountId: account.account.accountId,
      status: account.account.status,
      emailVerified: account.account.emailVerified,
      lockedUntil: account.account.lockedUntil,
    });
    
    // Check if account is locked
    if (account.account.lockedUntil && account.account.lockedUntil > new Date()) {
      console.log('Login failed: Account is locked');
      throw new Error('Account is temporarily locked. Please try again later.');
    }
    
    // Check if account is active
    if (account.account.status !== 'active') {
      console.log('Login failed: Account status is not active:', account.account.status);
      if (account.account.status === 'pending_verification') {
        throw new Error(
          'Account is not active. Verify your email first (GET /api/partner-auth/verify-email/:token). In local dev, use devEmailVerificationUrl from the register response.'
        );
      }
      throw new Error('Account is not active. Please contact support if this persists.');
    }
    
    // Verify password
    console.log('Comparing password...');
    const isValidPassword = await bcrypt.compare(password, account.account.passwordHash);
    console.log('Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = parseInt(account.account.failedLoginAttempts || '0') + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts.toString(),
      };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes
        updateData.lockedUntil = lockUntil;
      }
      
      await db
        .update(partnerUserAccounts)
        .set(updateData)
        .where(eq(partnerUserAccounts.accountId, account.account.accountId));
      
      throw new Error('Invalid email or password');
    }
    
    const partnerRole = (account.account.role as string) || 'member';

    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + PARTNER_REFRESH_DAYS);

    const accessToken = jwt.sign(
      {
        accountId: account.account.accountId,
        email: account.account.email,
        partnerId: account.partner.partnerId,
        role: partnerRole,
      },
      jwtSecret(),
      { expiresIn: PARTNER_ACCESS_EXPIRES }
    );

    // Reset failed login attempts on successful login + session / audit fields
    await db
      .update(partnerUserAccounts)
      .set({
        failedLoginAttempts: '0',
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp ?? null,
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: refreshExpires,
      })
      .where(eq(partnerUserAccounts.accountId, account.account.accountId));

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: PARTNER_ACCESS_EXPIRES,
      user: {
        accountId: account.account.accountId,
        email: account.account.email,
        firstName: account.account.firstName,
        lastName: account.account.lastName,
        partnerId: account.partner.partnerId,
        partnerName: account.partner.partnerName,
        partnerType: account.partner.partnerType,
        partnerStatus: account.partner.status,
        role: partnerRole,
      },
    };
  },

  async refreshPartnerSession(refreshToken: string) {
    const rows = await db
      .select({
        account: partnerUserAccounts,
        partner: partners,
      })
      .from(partnerUserAccounts)
      .innerJoin(partners, eq(partnerUserAccounts.partnerId, partners.partnerId))
      .where(
        and(
          isNotNull(partnerUserAccounts.refreshTokenHash),
          gt(partnerUserAccounts.refreshTokenExpiresAt, new Date())
        )
      );

    let matched: (typeof rows)[number] | null = null;
    for (const row of rows) {
      if (!row.account.refreshTokenHash) continue;
      const ok = await bcrypt.compare(refreshToken, row.account.refreshTokenHash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      throw new Error('Invalid refresh token');
    }

    const partnerRole = (matched.account.role as string) || 'member';

    const refreshRaw = crypto.randomBytes(48).toString('hex');
    const refreshHash = await bcrypt.hash(refreshRaw, 10);
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + PARTNER_REFRESH_DAYS);

    await db
      .update(partnerUserAccounts)
      .set({
        refreshTokenHash: refreshHash,
        refreshTokenExpiresAt: refreshExpires,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, matched.account.accountId));

    const accessToken = jwt.sign(
      {
        accountId: matched.account.accountId,
        email: matched.account.email,
        partnerId: matched.partner.partnerId,
        role: partnerRole,
      },
      jwtSecret(),
      { expiresIn: PARTNER_ACCESS_EXPIRES }
    );

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresIn: PARTNER_ACCESS_EXPIRES,
      user: {
        accountId: matched.account.accountId,
        email: matched.account.email,
        firstName: matched.account.firstName,
        lastName: matched.account.lastName,
        partnerId: matched.partner.partnerId,
        partnerName: matched.partner.partnerName,
        partnerType: matched.partner.partnerType,
        partnerStatus: matched.partner.status,
        role: partnerRole,
      },
    };
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.email, email.toLowerCase()))
      .limit(1);

    if (!account) {
      // Don't reveal if email exists for security
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    // Generate reset token
    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date();
    passwordResetExpires.setHours(passwordResetExpires.getHours() + 1); // 1 hour expiry

    await db
      .update(partnerUserAccounts)
      .set({
        passwordResetToken,
        passwordResetExpires,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, account.accountId));

    try {
      await emailService.sendPasswordReset(account.email, passwordResetToken);
    } catch (mailErr) {
      console.error('[email] Password reset send failed:', mailErr);
    }

    const out: {
      message: string;
      resetToken?: string;
    } = {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
    if (process.env.NODE_ENV !== 'production') {
      out.resetToken = passwordResetToken;
    }
    return out;
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    assertStrongPassword(newPassword);
    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.passwordResetToken, token))
      .limit(1);

    if (!account) {
      throw new Error('Invalid or expired reset token');
    }

    if (!account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      throw new Error('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(partnerUserAccounts)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, account.accountId));

    return { message: 'Password has been reset successfully' };
  },

  /**
   * Change password (for authenticated users)
   */
  async changePassword(accountId: string, currentPassword: string, newPassword: string) {
    assertStrongPassword(newPassword);
    const [account] = await db
      .select()
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.accountId, accountId))
      .limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(partnerUserAccounts)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(partnerUserAccounts.accountId, accountId));

    return { message: 'Password has been changed successfully' };
  },

  /**
   * Get partner user account by ID
   */
  async getAccountById(accountId: string) {
    const [account] = await db
      .select({
        account: partnerUserAccounts,
        partner: partners,
      })
      .from(partnerUserAccounts)
      .innerJoin(partners, eq(partnerUserAccounts.partnerId, partners.partnerId))
      .where(eq(partnerUserAccounts.accountId, accountId))
      .limit(1);
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    return account;
  },

  async getOrganization(partnerId: string) {
    const [p] = await db
      .select({
        partnerId: partners.partnerId,
        partnerCode: partners.partnerCode,
        partnerName: partners.partnerName,
        partnerType: partners.partnerType,
        displayName: partners.displayName,
        website: partners.website,
        description: partners.description,
      })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    return p ?? null;
  },

  async updateOrganization(
    partnerId: string,
    data: { displayName?: string | null; website?: string | null; description?: string | null }
  ) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.website !== undefined) patch.website = data.website;
    if (data.description !== undefined) patch.description = data.description;

    const [row] = await db
      .update(partners)
      .set(patch as any)
      .where(eq(partners.partnerId, partnerId))
      .returning();

    return row ?? null;
  },
};

