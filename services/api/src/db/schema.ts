import { pgTable, unique, serial, text, foreignKey, integer, date, time, timestamp, varchar, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const membershipStatus = pgEnum("membership_status", ['pending', 'approved', 'suspended', 'cancelled'])
export const userRole = pgEnum("user_role", ['member', 'coach', 'admin', 'manager'])


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

export const members = pgTable("members", {
	userId: integer("user_id").primaryKey().notNull(),
	status: membershipStatus().default('pending').notNull(),
	creditsBalance: integer("credits_balance").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "members_user_id_fkey"
		}).onDelete("cascade"),
]);

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

export const workouts = pgTable("workouts", {
	workoutId: serial("workout_id").primaryKey().notNull(),
	workoutName: varchar("workout_name", { length: 255 }).notNull(),
	workoutContent: text("workout_content").notNull(),
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
