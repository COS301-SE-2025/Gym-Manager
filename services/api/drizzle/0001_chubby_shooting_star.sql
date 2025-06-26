CREATE TABLE "classattendance" (
	"class_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"marked_at" timestamp DEFAULT now(),
	"score" integer DEFAULT 0,
	CONSTRAINT "classattendance_pkey" PRIMARY KEY("class_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "public_visibility" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "classattendance" ADD CONSTRAINT "classattendance_class_id_member_id_fkey" FOREIGN KEY ("class_id","member_id") REFERENCES "public"."classbookings"("class_id","member_id") ON DELETE cascade ON UPDATE no action;