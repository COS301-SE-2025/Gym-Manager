import { pgTable, foreignKey, serial, integer, date, time, timestamp, boolean, text, check, varchar, jsonb, unique, bigserial, primaryKey, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const membershipStatus = pgEnum("membership_status", ['pending', 'approved', 'suspended', 'cancelled'])
export const userRole = pgEnum("user_role", ['member', 'coach', 'admin', 'manager'])


export const classes = pgTable("classes", {
	classId: serial("class_id").primaryKey().notNull(),
	capacity: integer().notNull(),
	scheduledDate: date("scheduled_date").notNull(),
	scheduledTime: time("scheduled_time").notNull(),
	durationMinutes: integer("duration_minutes").notNull(),
	coachId: integer("coach_id"),
	workoutId: integer("workout_id"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.coachId],
			foreignColumns: [coaches.userId],
			name: "classes_coach_id_fkey"
		}),
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workouts.workoutId],
			name: "classes_workout_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [admins.userId],
			name: "classes_created_by_fkey"
		}),
]);

export const members = pgTable("members", {
	userId: integer("user_id").primaryKey().notNull(),
	status: membershipStatus().default('pending').notNull(),
	creditsBalance: integer("credits_balance").default(0).notNull(),
	publicVisibility: boolean("public_visibility").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "members_user_id_fkey"
		}).onDelete("cascade"),
]);

export const coaches = pgTable("coaches", {
	userId: integer("user_id").primaryKey().notNull(),
	bio: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "coaches_user_id_fkey"
		}).onDelete("cascade"),
]);

export const workouts = pgTable("workouts", {
	workoutId: serial("workout_id").primaryKey().notNull(),
	workoutName: varchar("workout_name", { length: 255 }).notNull(),
	type: text(),
	metadata: jsonb(),
}, (table) => [
	check("workouts_type_check", sql`type = ANY (ARRAY['FOR_TIME'::text, 'AMRAP'::text, 'TABATA'::text, 'EMOM'::text])`),
]);

export const rounds = pgTable("rounds", {
	roundId: serial("round_id").primaryKey().notNull(),
	workoutId: integer("workout_id").notNull(),
	roundNumber: integer("round_number").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workouts.workoutId],
			name: "rounds_workout_id_fkey"
		}).onDelete("cascade"),
]);

export const subrounds = pgTable("subrounds", {
	subroundId: serial("subround_id").primaryKey().notNull(),
	roundId: integer("round_id").notNull(),
	subroundNumber: integer("subround_number").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [rounds.roundId],
			name: "subrounds_round_id_fkey"
		}).onDelete("cascade"),
]);

export const subroundExercises = pgTable("subround_exercises", {
	subroundExerciseId: serial("subround_exercise_id").primaryKey().notNull(),
	subroundId: integer("subround_id").notNull(),
	exerciseId: integer("exercise_id").notNull(),
	position: integer().notNull(),
	quantityType: text("quantity_type").notNull(),
	quantity: integer().notNull(),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.subroundId],
			foreignColumns: [subrounds.subroundId],
			name: "subround_exercises_subround_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.exerciseId],
			name: "subround_exercises_exercise_id_fkey"
		}),
	check("subround_exercises_quantity_type_check", sql`quantity_type = ANY (ARRAY['reps'::text, 'duration'::text])`),
]);

export const exercises = pgTable("exercises", {
	exerciseId: serial("exercise_id").primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
});

export const classbookings = pgTable("classbookings", {
	bookingId: serial("booking_id").primaryKey().notNull(),
	classId: integer("class_id"),
	memberId: integer("member_id"),
	bookedAt: timestamp("booked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.classId],
			name: "classbookings_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.userId],
			name: "classbookings_member_id_fkey"
		}).onDelete("cascade"),
	unique("classbookings_class_id_member_id_key").on(table.classId, table.memberId),
]);

export const notifications = pgTable("notifications", {
	notificationId: bigserial("notification_id", { mode: "bigint" }).primaryKey().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const admins = pgTable("admins", {
	userId: integer("user_id").primaryKey().notNull(),
	authorisation: text(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "admins_user_id_fkey"
		}).onDelete("cascade"),
]);

export const managers = pgTable("managers", {
	userId: integer("user_id").primaryKey().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "managers_user_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	userId: serial("user_id").primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text(),
	passwordHash: text("password_hash").notNull(),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const userroles = pgTable("userroles", {
	userId: integer("user_id").notNull(),
	userRole: userRole("user_role").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "userroles_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.userRole], name: "userroles_pkey"}),
]);

export const notificationTargets = pgTable("notification_targets", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	notificationId: bigint("notification_id", { mode: "number" }).notNull(),
	targetRole: userRole("target_role").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.notificationId],
			foreignColumns: [notifications.notificationId],
			name: "notification_targets_notification_id_fkey"
		}),
	primaryKey({ columns: [table.notificationId, table.targetRole], name: "notification_targets_pkey"}),
]);

export const notificationReads = pgTable("notification_reads", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	notificationId: bigint("notification_id", { mode: "number" }).notNull(),
	userId: integer("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.notificationId],
			foreignColumns: [notifications.notificationId],
			name: "notification_reads_notification_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "notification_reads_user_id_fkey"
		}),
	primaryKey({ columns: [table.notificationId, table.userId], name: "notification_reads_pkey"}),
]);

export const classattendance = pgTable("classattendance", {
	classId: integer("class_id").notNull(),
	memberId: integer("member_id").notNull(),
	markedAt: timestamp("marked_at", { mode: 'string' }).defaultNow(),
	score: integer().default(0),
}, (table) => [
	foreignKey({
			columns: [table.classId, table.memberId],
			foreignColumns: [classbookings.classId, classbookings.memberId],
			name: "classattendance_class_id_member_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.classId, table.memberId], name: "classattendance_pkey"}),
]);
