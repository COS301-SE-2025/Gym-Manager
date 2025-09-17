import { pgTable, foreignKey, integer, text, serial, date, time, timestamp, check, varchar, jsonb, index, unique, pgPolicy, bigint, boolean, bigserial, primaryKey, uniqueIndex, pgView, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const membershipStatus = pgEnum("membership_status", ['pending', 'approved', 'suspended', 'cancelled'])
export const userRole = pgEnum("user_role", ['member', 'coach', 'admin', 'manager'])


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
			columns: [table.createdBy],
			foreignColumns: [admins.userId],
			name: "classes_created_by_fkey"
		}),
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workouts.workoutId],
			name: "classes_workout_id_fkey"
		}),
]);

export const workouts = pgTable("workouts", {
	workoutId: serial("workout_id").primaryKey().notNull(),
	workoutName: varchar("workout_name", { length: 255 }).notNull(),
	type: text(),
	metadata: jsonb(),
}, (table) => [
	check("workouts_type_check", sql`type = ANY (ARRAY['FOR_TIME'::text, 'AMRAP'::text, 'TABATA'::text, 'EMOM'::text])`),
]);

export const classbookings = pgTable("classbookings", {
	bookingId: serial("booking_id").primaryKey().notNull(),
	classId: integer("class_id"),
	memberId: integer("member_id"),
	bookedAt: timestamp("booked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_classbookings_class_member").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.memberId.asc().nullsLast().op("int4_ops")),
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

export const classSessions = pgTable("class_sessions", {
	classId: integer("class_id").primaryKey().notNull(),
	workoutId: integer("workout_id").notNull(),
	status: text().default('ready').notNull(),
	timeCapSeconds: integer("time_cap_seconds").default(0).notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	steps: jsonb().default([]).notNull(),
	stepsCumReps: jsonb("steps_cum_reps").default([]).notNull(),
	workoutType: text("workout_type").default('FOR_TIME').notNull(),
	pausedAt: timestamp("paused_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pauseAccumSeconds: bigint("pause_accum_seconds", { mode: "number" }).default(0).notNull(),
}, (table) => [
	index("idx_class_sessions_class").using("btree", table.classId.asc().nullsLast().op("int4_ops")),
	index("idx_class_sessions_status").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
	index("idx_class_sessions_workout").using("btree", table.workoutId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.classId],
			name: "class_sessions_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workouts.workoutId],
			name: "class_sessions_workout_id_fkey"
		}),
	pgPolicy("dev select class_sessions", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	check("class_sessions_status_check", sql`status = ANY (ARRAY['ready'::text, 'live'::text, 'paused'::text, 'ended'::text])`),
	check("class_sessions_workout_type_check", sql`workout_type = ANY (ARRAY['FOR_TIME'::text, 'AMRAP'::text, 'EMOM'::text, 'TABATA'::text])`),
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

export const users = pgTable("users", {
	userId: serial("user_id").primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text(),
	passwordHash: text("password_hash").notNull(),
	pushToken: text("push_token"),
}, (table) => [
	index("idx_users_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	unique("users_email_key").on(table.email),
]);

export const notifications = pgTable("notifications", {
	notificationId: bigserial("notification_id", { mode: "bigint" }).primaryKey().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

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

export const emomTargets = pgTable("emom_targets", {
	subroundExerciseId: integer("subround_exercise_id").primaryKey().notNull(),
	targetReps: integer("target_reps").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subroundExerciseId],
			foreignColumns: [subroundExercises.subroundExerciseId],
			name: "emom_targets_subround_exercise_id_fkey"
		}).onDelete("cascade"),
	check("emom_targets_target_reps_check", sql`target_reps > 0`),
]);

export const exercises = pgTable("exercises", {
	exerciseId: serial("exercise_id").primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
});

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
			columns: [table.exerciseId],
			foreignColumns: [exercises.exerciseId],
			name: "subround_exercises_exercise_id_fkey"
		}),
	foreignKey({
			columns: [table.subroundId],
			foreignColumns: [subrounds.subroundId],
			name: "subround_exercises_subround_id_fkey"
		}).onDelete("cascade"),
	check("subround_exercises_quantity_type_check", sql`quantity_type = ANY (ARRAY['reps'::text, 'duration'::text])`),
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
		}).onDelete("cascade"),
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
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "notification_reads_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.notificationId, table.userId], name: "notification_reads_pkey"}),
]);

export const classattendance = pgTable("classattendance", {
	classId: integer("class_id").notNull(),
	memberId: integer("member_id").notNull(),
	markedAt: timestamp("marked_at", { mode: 'string' }).defaultNow(),
	score: integer().default(0),
}, (table) => [
	index("idx_classattendance_class_member").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.memberId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId, table.memberId],
			foreignColumns: [classbookings.classId, classbookings.memberId],
			name: "classattendance_class_id_member_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.classId, table.memberId], name: "classattendance_pkey"}),
]);

export const liveIntervalScores = pgTable("live_interval_scores", {
	classId: integer("class_id").notNull(),
	userId: integer("user_id").notNull(),
	stepIndex: integer("step_index").notNull(),
	reps: integer().default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_interval_scores_class").using("btree", table.classId.asc().nullsLast().op("int4_ops")),
	index("idx_live_interval_scores_class").using("btree", table.classId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_interval_scores").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops"), table.stepIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classSessions.classId],
			name: "live_interval_scores_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "live_interval_scores_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.classId, table.userId, table.stepIndex], name: "live_interval_scores_pk"}),
	pgPolicy("dev insert live_interval_scores", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("dev select live_interval_scores", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("dev update live_interval_scores", { as: "permissive", for: "update", to: ["public"] }),
]);

export const liveProgress = pgTable("live_progress", {
	classId: integer("class_id").notNull(),
	userId: integer("user_id").notNull(),
	currentStep: integer("current_step").default(0).notNull(),
	dnfPartialReps: integer("dnf_partial_reps").default(0).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	roundsCompleted: integer("rounds_completed").default(0).notNull(),
}, (table) => [
	index("idx_live_progress_class").using("btree", table.classId.asc().nullsLast().op("int4_ops")),
	index("idx_live_progress_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	index("idx_progress_lookup").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_live_progress_class_user").using("btree", table.classId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classSessions.classId],
			name: "live_progress_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "live_progress_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.classId, table.userId], name: "live_progress_pkey"}),
	pgPolicy("dev insert progress", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("dev select progress", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("dev update progress", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("dev write progress", { as: "permissive", for: "all", to: ["public"] }),
]);
export const leaderboard = pgView("leaderboard", {	classId: integer("class_id"),
	userId: integer("user_id"),
	finished: boolean(),
	elapsedSeconds: numeric("elapsed_seconds"),
	totalReps: integer("total_reps"),
	sortBucket: integer("sort_bucket"),
	sortKey: numeric("sort_key"),
}).as(sql`WITH base AS ( SELECT lp.class_id, lp.user_id, lp.current_step, lp.rounds_completed, lp.finished_at, COALESCE(lp.dnf_partial_reps, 0) AS dnf_partial_reps, cs.started_at, cs.time_cap_seconds, cs.steps_cum_reps, cs.workout_type FROM live_progress lp JOIN class_sessions cs USING (class_id) ), helpers AS ( SELECT b.class_id, b.user_id, b.current_step, b.rounds_completed, b.finished_at, b.dnf_partial_reps, b.started_at, b.time_cap_seconds, b.steps_cum_reps, b.workout_type, CASE WHEN jsonb_array_length(b.steps_cum_reps) > 0 THEN (b.steps_cum_reps ->> (jsonb_array_length(b.steps_cum_reps) - 1))::integer ELSE 0 END AS reps_per_round, CASE WHEN b.current_step <= 0 THEN 0 ELSE COALESCE((b.steps_cum_reps ->> (b.current_step - 1))::integer, 0) END AS within_step_reps FROM base b ), scored AS ( SELECT h.class_id, h.user_id, h.workout_type, CASE WHEN h.workout_type = 'FOR_TIME'::text AND h.finished_at IS NOT NULL THEN EXTRACT(epoch FROM h.finished_at - h.started_at) ELSE NULL::numeric END AS elapsed_seconds, CASE WHEN h.workout_type = 'FOR_TIME'::text AND h.finished_at IS NULL THEN h.within_step_reps + h.dnf_partial_reps ELSE NULL::integer END AS total_reps_ft, CASE WHEN h.workout_type = 'AMRAP'::text THEN h.rounds_completed * h.reps_per_round + h.within_step_reps + h.dnf_partial_reps ELSE NULL::integer END AS total_reps_amrap FROM helpers h ) SELECT class_id, user_id, workout_type = 'FOR_TIME'::text AND elapsed_seconds IS NOT NULL AS finished, elapsed_seconds, COALESCE(total_reps_amrap, total_reps_ft) AS total_reps, CASE WHEN workout_type = 'FOR_TIME'::text AND elapsed_seconds IS NOT NULL THEN 0 WHEN workout_type = 'FOR_TIME'::text THEN 1 WHEN workout_type = 'AMRAP'::text THEN 0 ELSE 2 END AS sort_bucket, CASE WHEN workout_type = 'FOR_TIME'::text AND elapsed_seconds IS NOT NULL THEN elapsed_seconds WHEN workout_type = 'FOR_TIME'::text THEN (- COALESCE(total_reps_ft, 0))::numeric WHEN workout_type = 'AMRAP'::text THEN (- COALESCE(total_reps_amrap, 0))::numeric ELSE 0::numeric END AS sort_key FROM scored`);

// Payment Packages and Financial Analytics Tables
export const paymentPackages = pgTable("payment_packages", {
	packageId: serial("package_id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	creditsAmount: integer("credits_amount").notNull(),
	priceCents: integer("price_cents").notNull(),
	currency: varchar("currency", { length: 3 }).default("USD"),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by").references(() => admins.userId),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_packages_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [admins.userId],
		name: "payment_packages_created_by_fkey"
	}),
]);

export const paymentTransactions = pgTable("payment_transactions", {
	transactionId: serial("transaction_id").primaryKey(),
	memberId: integer("member_id").notNull().references(() => members.userId),
	packageId: integer("package_id").notNull().references(() => paymentPackages.packageId),
	amountCents: integer("amount_cents").notNull(),
	creditsPurchased: integer("credits_purchased").notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
	externalTransactionId: varchar("external_transaction_id", { length: 255 }),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_transactions_member").using("btree", table.memberId.asc().nullsLast().op("int4_ops")),
	index("idx_payment_transactions_status").using("btree", table.paymentStatus.asc().nullsLast().op("text_ops")),
	index("idx_payment_transactions_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
		columns: [table.memberId],
		foreignColumns: [members.userId],
		name: "payment_transactions_member_id_fkey"
	}),
	foreignKey({
		columns: [table.packageId],
		foreignColumns: [paymentPackages.packageId],
		name: "payment_transactions_package_id_fkey"
	}),
]);

export const monthlyRevenue = pgTable("monthly_revenue", {
	id: serial("id").primaryKey(),
	year: integer("year").notNull(),
	month: integer("month").notNull(),
	totalRevenueCents: integer("total_revenue_cents").default(0),
	newSubscriptionsCents: integer("new_subscriptions_cents").default(0),
	recurringRevenueCents: integer("recurring_revenue_cents").default(0),
	oneTimePurchasesCents: integer("one_time_purchases_cents").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_monthly_revenue_year_month").using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_monthly_revenue_year_month").using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
]);

export const userFinancialMetrics = pgTable("user_financial_metrics", {
	id: serial("id").primaryKey(),
	memberId: integer("member_id").notNull().references(() => members.userId),
	totalSpentCents: integer("total_spent_cents").default(0),
	totalCreditsPurchased: integer("total_credits_purchased").default(0),
	firstPurchaseDate: timestamp("first_purchase_date", { mode: 'string' }),
	lastPurchaseDate: timestamp("last_purchase_date", { mode: 'string' }),
	lifetimeValueCents: integer("lifetime_value_cents").default(0),
	averageOrderValueCents: integer("average_order_value_cents").default(0),
	purchaseFrequency: decimal("purchase_frequency", { precision: 5, scale: 2 }).default("0"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_financial_metrics_member").using("btree", table.memberId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.memberId],
		foreignColumns: [members.userId],
		name: "user_financial_metrics_member_id_fkey"
	}),
	uniqueIndex("uq_user_financial_metrics_member").using("btree", table.memberId.asc().nullsLast().op("int4_ops")),
]);