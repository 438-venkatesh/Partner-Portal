CREATE TABLE IF NOT EXISTS training_courses (
  course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  estimated_minutes INTEGER,
  passing_score_percent INTEGER DEFAULT 70,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_lessons (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS training_lessons_course_idx ON training_lessons (course_id);

CREATE TABLE IF NOT EXISTS training_quiz_questions (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS training_quiz_questions_course_idx ON training_quiz_questions (course_id);

CREATE TABLE IF NOT EXISTS training_enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  account_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  completed_lesson_ids JSONB DEFAULT '[]',
  quiz_score_percent INTEGER,
  quiz_attempts INTEGER DEFAULT 0,
  certificate_issued_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS training_enrollments_unique_idx ON training_enrollments (course_id, account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS training_enrollments_partner_idx ON training_enrollments (partner_id);

CREATE TABLE IF NOT EXISTS learning_paths (
  path_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  course_ids JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_playbooks (
  playbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  deal_stage VARCHAR(20),
  partner_type VARCHAR(50),
  content TEXT NOT NULL,
  recommended_asset_ids JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  partner_type VARCHAR(50),
  min_tier VARCHAR(50),
  tags JSONB DEFAULT '[]',
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
