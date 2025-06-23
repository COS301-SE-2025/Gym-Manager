-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'approved', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('member', 'coach', 'admin', 'manager');--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"credits_balance" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"class_id" serial PRIMARY KEY NOT NULL,
	"capacity" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" time NOT NULL,
	"duration_minutes" integer NOT NULL,
	"coach_id" integer,
	"workout_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"authorisation" text
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"user_id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"workout_id" serial PRIMARY KEY NOT NULL,
	"workout_name" varchar(255) NOT NULL,
	"workout_content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classbookings" (
	"booking_id" serial PRIMARY KEY NOT NULL,
	"class_id" integer,
	"member_id" integer,
	"booked_at" timestamp DEFAULT now(),
	CONSTRAINT "classbookings_class_id_member_id_key" UNIQUE("class_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "userroles" (
	"user_id" integer NOT NULL,
	"user_role" "user_role" NOT NULL,
	CONSTRAINT "userroles_pkey" PRIMARY KEY("user_id","user_role")
);
--> statement-breakpoint
CREATE TABLE "classattendance" (
	"class_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"marked_at" timestamp DEFAULT now(),
	"score" integer DEFAULT 0,
	CONSTRAINT "classattendance_pkey" PRIMARY KEY("class_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("workout_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classbookings" ADD CONSTRAINT "classbookings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("class_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classbookings" ADD CONSTRAINT "classbookings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userroles" ADD CONSTRAINT "userroles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classattendance" ADD CONSTRAINT "classattendance_class_id_member_id_fkey" FOREIGN KEY ("class_id","member_id") REFERENCES "public"."classbookings"("class_id","member_id") ON DELETE cascade ON UPDATE no action;
*/