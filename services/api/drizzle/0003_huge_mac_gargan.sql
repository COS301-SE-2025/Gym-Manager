CREATE TABLE "schedule_templates" (
	"template_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_schedule_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"scheduled_time" time NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer NOT NULL,
	"coach_id" integer,
	"workout_id" integer,
	"class_title" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_schedule_items" ADD CONSTRAINT "template_schedule_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."schedule_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_schedule_items" ADD CONSTRAINT "template_schedule_items_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_schedule_items" ADD CONSTRAINT "template_schedule_items_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("workout_id") ON DELETE no action ON UPDATE no action;