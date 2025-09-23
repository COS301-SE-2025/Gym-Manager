-- Gamification system tables
CREATE TYPE "public"."badge_type" AS ENUM('streak', 'attendance', 'achievement', 'milestone', 'special');

CREATE TABLE "badge_definitions" (
	"badge_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_name" text NOT NULL,
	"badge_type" "badge_type" NOT NULL,
	"criteria" jsonb NOT NULL,
	"points_value" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "user_badges" (
	"user_badge_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"is_displayed" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE("user_id","badge_id")
);

CREATE TABLE "user_streaks" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"streak_start_date" date,
	"total_workouts" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "user_activities" (
	"activity_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"activity_data" jsonb,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badge_definitions"("badge_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX "idx_user_badges_user_id" ON "user_badges" ("user_id");
CREATE INDEX "idx_user_badges_badge_id" ON "user_badges" ("badge_id");
CREATE INDEX "idx_user_activities_user_id" ON "user_activities" ("user_id");
CREATE INDEX "idx_user_activities_created_at" ON "user_activities" ("created_at");

-- Insert default badge definitions
INSERT INTO "badge_definitions" ("name", "description", "icon_name", "badge_type", "criteria", "points_value") VALUES
('First Steps', 'Complete your first workout', 'first-steps', 'milestone', '{"workouts_completed": 1}', 10),
('Week Warrior', 'Complete 7 workouts in a row', 'week-warrior', 'streak', '{"streak_days": 7}', 50),
('Month Master', 'Complete 30 workouts in a row', 'month-master', 'streak', '{"streak_days": 30}', 200),
('Century Club', 'Complete 100 total workouts', 'century-club', 'milestone', '{"total_workouts": 100}', 500),
('Early Bird', 'Complete 5 morning workouts (before 8 AM)', 'early-bird', 'achievement', '{"morning_workouts": 5}', 75),
('Night Owl', 'Complete 5 evening workouts (after 8 PM)', 'night-owl', 'achievement', '{"evening_workouts": 5}', 75),
('Consistency King', 'Work out 3 times per week for 4 weeks', 'consistency-king', 'achievement', '{"weeks_consistent": 4}', 150),
('Social Butterfly', 'Work out with 5 different people', 'social-butterfly', 'achievement', '{"unique_workout_partners": 5}', 100),
('Comeback Kid', 'Return after a 7+ day break', 'comeback-kid', 'special', '{"break_days": 7}', 25),
('Perfect Week', 'Complete all planned workouts in a week', 'perfect-week', 'achievement', '{"perfect_weeks": 1}', 100),
('Iron Will', 'Complete 50 workouts in a row', 'iron-will', 'streak', '{"streak_days": 50}', 1000),
('Legend', 'Complete 365 workouts in a row', 'legend', 'streak', '{"streak_days": 365}', 5000);
