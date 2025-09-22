import {
  pgTable,
  unique,
  serial,
  text,
  foreignKey,
  integer,
  date,
  time,
  timestamp,
  boolean,
  varchar,
  primaryKey,
  pgEnum,
  jsonb,
  bigint,
  decimal,
} from 'drizzle-orm/pg-core';

// -------------- ENUMS --------------
export const membershipStatus = pgEnum('membership_status', [
  'pending',
  'approved',
  'suspended',
  'cancelled',
]);
export const userRole = pgEnum('user_role', ['member', 'coach', 'admin', 'manager']);
export const badgeType = pgEnum('badge_type', ['streak', 'attendance', 'achievement', 'milestone', 'special']);

export const quantityType = pgEnum('quantity_type', ['reps', 'duration']);
export const workoutType = pgEnum('workout_type', [
  'FOR_TIME',
  'AMRAP',
  'TABATA',
  'EMOM',
]);

// -------------- TABLES --------------
export const users = pgTable(
  'users',
  {
    userId: serial('user_id').primaryKey().notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text().notNull(),
    phone: text(),
    passwordHash: text('password_hash').notNull(),
  },
  (table) => [unique('users_email_key').on(table.email)],
);

export const classes = pgTable(
  'classes',
  {
    classId: serial('class_id').primaryKey().notNull(),
    capacity: integer().notNull(),
    scheduledDate: date('scheduled_date').notNull(),
    scheduledTime: time('scheduled_time').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    coachId: integer('coach_id'),
    workoutId: integer('workout_id'),
    createdBy: integer('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.coachId],
      foreignColumns: [coaches.userId],
      name: 'classes_coach_id_fkey',
    }),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.workoutId],
      name: 'classes_workout_id_fkey',
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [admins.userId],
      name: 'classes_created_by_fkey',
    }),
  ],
);

export const coaches = pgTable(
  'coaches',
  {
    userId: integer('user_id').primaryKey().notNull(),
    bio: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'coaches_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const admins = pgTable(
  'admins',
  {
    userId: integer('user_id').primaryKey().notNull(),
    authorisation: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'admins_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const managers = pgTable(
  'managers',
  {
    userId: integer('user_id').primaryKey().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'managers_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const members = pgTable(
  'members',
  {
    userId: integer('user_id').primaryKey().notNull(),
    status: membershipStatus().default('pending').notNull(),
    creditsBalance: integer('credits_balance').default(0).notNull(),
    publicVisibility: boolean('public_visibility').default(true).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'members_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const workouts = pgTable('workouts', {
  workoutId      : serial('workout_id').primaryKey(),
  workoutName    : varchar('workout_name', { length: 255 }),
  type           : text('type'),       
  metadata       : jsonb('metadata'),   
});

export const rounds = pgTable('rounds', {
  roundId     : serial('round_id').primaryKey(),
  workoutId   : integer('workout_id').notNull(),
  roundNumber : integer('round_number').notNull(),
}, (table) => [
  foreignKey({
    columns: [table.workoutId],
    foreignColumns: [workouts.workoutId],
    name: 'rounds_workout_id_fkey',
  }).onDelete('cascade'),
]);

export const subrounds = pgTable('subrounds', {
  subroundId     : serial('subround_id').primaryKey(),
  roundId        : integer('round_id').notNull(),
  subroundNumber : integer('subround_number').notNull(),
}, (table) => [
  foreignKey({
    columns: [table.roundId],
    foreignColumns: [rounds.roundId],
    name: 'subrounds_round_id_fkey',
  }).onDelete('cascade'),
]);

export const exercises = pgTable('exercises', {
  exerciseId : serial('exercise_id').primaryKey(),
  name       : text('name').notNull(),
  description: text('description'),
});

export const subroundExercises = pgTable('subround_exercises', {
  subroundExerciseId : serial('subround_exercise_id').primaryKey(),
  subroundId         : integer('subround_id').notNull(),
  exerciseId         : integer('exercise_id').notNull(),
  position           : integer('position').notNull(),         // ordering
  quantityType       : text('quantity_type').notNull(),       // 'reps' | 'duration'
  quantity           : integer('quantity').notNull(),         // e.g. 20 or 30
  notes              : text('notes'),
}, (table) => [
  foreignKey({
    columns: [table.subroundId],
    foreignColumns: [subrounds.subroundId],
    name: 'subround_exercises_subround_id_fkey',
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.exerciseId],
    foreignColumns: [exercises.exerciseId],
    name: 'subround_exercises_exercise_id_fkey',
  }).onDelete('cascade'),
]);

export const classbookings = pgTable(
  'classbookings',
  {
    bookingId: serial('booking_id').primaryKey().notNull(),
    classId: integer('class_id'),
    memberId: integer('member_id'),
    bookedAt: timestamp('booked_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.classId],
      name: 'classbookings_class_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [members.userId],
      name: 'classbookings_member_id_fkey',
    }).onDelete('cascade'),
    unique('classbookings_class_id_member_id_key').on(table.classId, table.memberId),
  ],
);

export const userroles = pgTable(
  'userroles',
  {
    userId: integer('user_id').notNull(),
    userRole: userRole('user_role').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'userroles_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.userId, table.userRole], name: 'userroles_pkey' }),
  ],
);

export const classattendance = pgTable(
  'classattendance',
  {
    classId: integer('class_id').notNull(),
    memberId: integer('member_id').notNull(),
    markedAt: timestamp('marked_at', { mode: 'string' }).defaultNow(),
    score: integer().default(0),
    scaling: varchar('scaling', { length: 10 }).default('rx').notNull(), 
  },
  (table) => [
    foreignKey({
      columns: [table.classId, table.memberId],
      foreignColumns: [classbookings.classId, classbookings.memberId],
      name: 'classattendance_class_id_member_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.classId, table.memberId], name: 'classattendance_pkey' }),
  ],
);

// Live class functionality tables
export const classSessions = pgTable(
  'class_sessions',
  {
    classId: integer('class_id').primaryKey().notNull(),
    workoutId: integer('workout_id'),
    status: text('status').notNull(), // 'live', 'finished', 'cancelled'
    timeCapSeconds: integer('time_cap_seconds'),
    startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
    endedAt: timestamp('ended_at', { mode: 'string' }),
    steps: jsonb('steps'),
    stepsCumReps: jsonb('steps_cum_reps'),
  },
  (table) => [
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.classId],
      name: 'class_sessions_class_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workouts.workoutId],
      name: 'class_sessions_workout_id_fkey',
    }),
  ],
);

export const liveProgress = pgTable(
  'live_progress',
  {
    classId: integer('class_id').notNull(),
    userId: integer('user_id').notNull(),
    currentStep: integer('current_step').default(0),
    roundsCompleted: integer('rounds_completed').default(0),
    finishedAt: timestamp('finished_at', { mode: 'string' }),
    dnfPartialReps: integer('dnf_partial_reps').default(0),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.classId],
      name: 'live_progress_class_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: 'live_progress_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.classId, table.userId], name: 'live_progress_pkey' }),
  ],
);

// -------------- NOTIFICATIONS --------------
export const notifications = pgTable('notifications', {
  notificationId: serial('notification_id').primaryKey().notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const notificationTargets = pgTable("notification_targets", {
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

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  gymId: integer('gym_id').notNull(),
  userId: integer('user_id'),
  eventType: text('event_type').notNull(),
  properties: jsonb('properties').default('{}'),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Payment Packages and Financial Analytics Tables
export const paymentPackages = pgTable("payment_packages", {
	packageId: serial("package_id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	creditsAmount: integer("credits_amount").notNull(),
	priceCents: integer("price_cents").notNull(),
	currency: varchar("currency", { length: 3 }).default("ZAR"),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by").references(() => admins.userId),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

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
});

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
});

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
});

// Gamification Tables
export const badgeDefinitions = pgTable("badge_definitions", {
	badgeId: serial("badge_id").primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	iconName: text("icon_name").notNull(),
	badgeType: badgeType("badge_type").notNull(),
	criteria: jsonb().notNull(),
	pointsValue: integer("points_value").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const userBadges = pgTable("user_badges", {
	userBadgeId: serial("user_badge_id").primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	badgeId: integer("badge_id").notNull(),
	earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow().notNull(),
	isDisplayed: boolean("is_displayed").default(true).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.userId],
		name: "user_badges_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.badgeId],
		foreignColumns: [badgeDefinitions.badgeId],
		name: "user_badges_badge_id_fkey"
	}).onDelete("cascade"),
	unique("user_badges_user_id_badge_id_key").on(table.userId, table.badgeId),
]);

export const userStreaks = pgTable("user_streaks", {
	userId: integer("user_id").primaryKey().notNull(),
	currentStreak: integer("current_streak").default(0).notNull(),
	longestStreak: integer("longest_streak").default(0).notNull(),
	lastActivityDate: date("last_activity_date"),
	streakStartDate: date("streak_start_date"),
	totalWorkouts: integer("total_workouts").default(0).notNull(),
	totalPoints: integer("total_points").default(0).notNull(),
	level: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.userId],
		name: "user_streaks_user_id_fkey"
	}).onDelete("cascade"),
]);

export const userActivities = pgTable("user_activities", {
	activityId: serial("activity_id").primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	activityType: text("activity_type").notNull(),
	activityData: jsonb("activity_data"),
	pointsEarned: integer("points_earned").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.userId],
		name: "user_activities_user_id_fkey"
	}).onDelete("cascade"),
]);
