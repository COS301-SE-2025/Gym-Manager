CREATE TYPE "public"."badge_type" AS ENUM('streak', 'attendance', 'achievement', 'milestone', 'special');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"user_id" integer,
	"event_type" text NOT NULL,
	"properties" jsonb DEFAULT '{}',
	"source" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "monthly_revenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_revenue_cents" integer DEFAULT 0,
	"new_subscriptions_cents" integer DEFAULT 0,
	"recurring_revenue_cents" integer DEFAULT 0,
	"one_time_purchases_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_packages" (
	"package_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"credits_amount" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'ZAR',
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"credits_purchased" integer NOT NULL,
	"payment_method" varchar(50),
	"payment_status" varchar(20) DEFAULT 'pending',
	"external_transaction_id" varchar(255),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"activity_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"activity_data" jsonb,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_badge_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"is_displayed" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_financial_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"total_spent_cents" integer DEFAULT 0,
	"total_credits_purchased" integer DEFAULT 0,
	"first_purchase_date" timestamp,
	"last_purchase_date" timestamp,
	"lifetime_value_cents" integer DEFAULT 0,
	"average_order_value_cents" integer DEFAULT 0,
	"purchase_frequency" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "classattendance" ADD COLUMN "scaling" varchar(10) DEFAULT 'rx' NOT NULL;--> statement-breakpoint
ALTER TABLE "classattendance" ADD COLUMN "score_seconds" integer;--> statement-breakpoint
ALTER TABLE "classattendance" ADD COLUMN "score_reps" integer;--> statement-breakpoint
ALTER TABLE "classattendance" ADD COLUMN "finished" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_backup_codes" jsonb;--> statement-breakpoint
ALTER TABLE "payment_packages" ADD CONSTRAINT "payment_packages_created_by_admins_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_member_id_members_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_package_id_payment_packages_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."payment_packages"("package_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badge_definitions"("badge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_financial_metrics" ADD CONSTRAINT "user_financial_metrics_member_id_members_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;