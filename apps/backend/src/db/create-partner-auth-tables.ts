import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function createPartnerAuthTables() {
  try {
    console.log('Creating partner_user_account_status enum...');
    await db.execute(sql.raw(`
      DO $$ BEGIN
        CREATE TYPE "partner_user_account_status" AS ENUM('pending_verification', 'active', 'suspended', 'inactive', 'deleted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `));

    console.log('Creating partner_user_accounts table...');
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "partner_user_accounts" (
        "account_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "partner_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "phone" varchar(20),
        "status" "partner_user_account_status" DEFAULT 'pending_verification',
        "email_verified" boolean DEFAULT false,
        "email_verification_token" varchar(100),
        "email_verification_expires" timestamp,
        "password_reset_token" varchar(100),
        "password_reset_expires" timestamp,
        "last_login_at" timestamp,
        "last_login_ip" varchar(45),
        "failed_login_attempts" varchar(10) DEFAULT '0',
        "locked_until" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "partner_user_accounts_email_unique" UNIQUE("email")
      );
    `));

    console.log('Creating foreign key constraint...');
    await db.execute(sql.raw(`
      DO $$ BEGIN
        ALTER TABLE "partner_user_accounts" 
        ADD CONSTRAINT "partner_user_accounts_partner_id_partners_partner_id_fk" 
        FOREIGN KEY ("partner_id") REFERENCES "partners"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `));

    console.log('Creating service_timelines table...');
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "service_timelines" (
        "timeline_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "relationship_id" uuid NOT NULL,
        "partner_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "service_type" varchar(100) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "due_date" timestamp NOT NULL,
        "completed_date" timestamp,
        "status" varchar(20) DEFAULT 'pending',
        "priority" varchar(20) DEFAULT 'medium',
        "recurrence_type" varchar(50),
        "recurrence_interval" varchar(10),
        "next_due_date" timestamp,
        "assigned_to" uuid,
        "notes" text,
        "metadata" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `));

    console.log('Creating foreign key constraints for service_timelines...');
    await db.execute(sql.raw(`
      DO $$ BEGIN
        ALTER TABLE "service_timelines" 
        ADD CONSTRAINT "service_timelines_partner_id_partners_partner_id_fk" 
        FOREIGN KEY ("partner_id") REFERENCES "partners"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `));

    console.log('✅ Partner auth tables created successfully');
  } catch (error) {
    console.error('❌ Error creating partner auth tables:', error);
    throw error;
  }
}

createPartnerAuthTables()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });









