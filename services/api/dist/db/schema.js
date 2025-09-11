"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationReads = exports.notificationTargets = exports.notifications = exports.classattendance = exports.userroles = exports.classbookings = exports.subroundExercises = exports.exercises = exports.subrounds = exports.rounds = exports.workouts = exports.members = exports.managers = exports.admins = exports.coaches = exports.classes = exports.users = exports.workoutType = exports.quantityType = exports.userRole = exports.membershipStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// -------------- ENUMS --------------
exports.membershipStatus = (0, pg_core_1.pgEnum)('membership_status', [
    'pending',
    'approved',
    'suspended',
    'cancelled',
]);
exports.userRole = (0, pg_core_1.pgEnum)('user_role', ['member', 'coach', 'admin', 'manager']);
exports.quantityType = (0, pg_core_1.pgEnum)('quantity_type', ['reps', 'duration']);
exports.workoutType = (0, pg_core_1.pgEnum)('workout_type', [
    'FOR_TIME',
    'AMRAP',
    'TABATA',
    'EMOM',
]);
// -------------- TABLES --------------
exports.users = (0, pg_core_1.pgTable)('users', {
    userId: (0, pg_core_1.serial)('user_id').primaryKey().notNull(),
    firstName: (0, pg_core_1.text)('first_name').notNull(),
    lastName: (0, pg_core_1.text)('last_name').notNull(),
    email: (0, pg_core_1.text)().notNull(),
    phone: (0, pg_core_1.text)(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
}, (table) => [(0, pg_core_1.unique)('users_email_key').on(table.email)]);
exports.classes = (0, pg_core_1.pgTable)('classes', {
    classId: (0, pg_core_1.serial)('class_id').primaryKey().notNull(),
    capacity: (0, pg_core_1.integer)().notNull(),
    scheduledDate: (0, pg_core_1.date)('scheduled_date').notNull(),
    scheduledTime: (0, pg_core_1.time)('scheduled_time').notNull(),
    durationMinutes: (0, pg_core_1.integer)('duration_minutes').notNull(),
    coachId: (0, pg_core_1.integer)('coach_id'),
    workoutId: (0, pg_core_1.integer)('workout_id'),
    createdBy: (0, pg_core_1.integer)('created_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.coachId],
        foreignColumns: [exports.coaches.userId],
        name: 'classes_coach_id_fkey',
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.workoutId],
        foreignColumns: [exports.workouts.workoutId],
        name: 'classes_workout_id_fkey',
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.createdBy],
        foreignColumns: [exports.admins.userId],
        name: 'classes_created_by_fkey',
    }),
]);
exports.coaches = (0, pg_core_1.pgTable)('coaches', {
    userId: (0, pg_core_1.integer)('user_id').primaryKey().notNull(),
    bio: (0, pg_core_1.text)(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'coaches_user_id_fkey',
    }).onDelete('cascade'),
]);
exports.admins = (0, pg_core_1.pgTable)('admins', {
    userId: (0, pg_core_1.integer)('user_id').primaryKey().notNull(),
    authorisation: (0, pg_core_1.text)(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'admins_user_id_fkey',
    }).onDelete('cascade'),
]);
exports.managers = (0, pg_core_1.pgTable)('managers', {
    userId: (0, pg_core_1.integer)('user_id').primaryKey().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'managers_user_id_fkey',
    }).onDelete('cascade'),
]);
exports.members = (0, pg_core_1.pgTable)('members', {
    userId: (0, pg_core_1.integer)('user_id').primaryKey().notNull(),
    status: (0, exports.membershipStatus)().default('pending').notNull(),
    creditsBalance: (0, pg_core_1.integer)('credits_balance').default(0).notNull(),
    publicVisibility: (0, pg_core_1.boolean)('public_visibility').default(true).notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'members_user_id_fkey',
    }).onDelete('cascade'),
]);
exports.workouts = (0, pg_core_1.pgTable)('workouts', {
    workoutId: (0, pg_core_1.serial)('workout_id').primaryKey(),
    workoutName: (0, pg_core_1.varchar)('workout_name', { length: 255 }),
    type: (0, pg_core_1.text)('type'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
});
exports.rounds = (0, pg_core_1.pgTable)('rounds', {
    roundId: (0, pg_core_1.serial)('round_id').primaryKey(),
    workoutId: (0, pg_core_1.integer)('workout_id').notNull(),
    roundNumber: (0, pg_core_1.integer)('round_number').notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.workoutId],
        foreignColumns: [exports.workouts.workoutId],
        name: 'rounds_workout_id_fkey',
    }).onDelete('cascade'),
]);
exports.subrounds = (0, pg_core_1.pgTable)('subrounds', {
    subroundId: (0, pg_core_1.serial)('subround_id').primaryKey(),
    roundId: (0, pg_core_1.integer)('round_id').notNull(),
    subroundNumber: (0, pg_core_1.integer)('subround_number').notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.roundId],
        foreignColumns: [exports.rounds.roundId],
        name: 'subrounds_round_id_fkey',
    }).onDelete('cascade'),
]);
exports.exercises = (0, pg_core_1.pgTable)('exercises', {
    exerciseId: (0, pg_core_1.serial)('exercise_id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
});
exports.subroundExercises = (0, pg_core_1.pgTable)('subround_exercises', {
    subroundExerciseId: (0, pg_core_1.serial)('subround_exercise_id').primaryKey(),
    subroundId: (0, pg_core_1.integer)('subround_id').notNull(),
    exerciseId: (0, pg_core_1.integer)('exercise_id').notNull(),
    position: (0, pg_core_1.integer)('position').notNull(), // ordering
    quantityType: (0, pg_core_1.text)('quantity_type').notNull(), // 'reps' | 'duration'
    quantity: (0, pg_core_1.integer)('quantity').notNull(), // e.g. 20 or 30
    notes: (0, pg_core_1.text)('notes'),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.subroundId],
        foreignColumns: [exports.subrounds.subroundId],
        name: 'subround_exercises_subround_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.foreignKey)({
        columns: [table.exerciseId],
        foreignColumns: [exports.exercises.exerciseId],
        name: 'subround_exercises_exercise_id_fkey',
    }).onDelete('cascade'),
]);
exports.classbookings = (0, pg_core_1.pgTable)('classbookings', {
    bookingId: (0, pg_core_1.serial)('booking_id').primaryKey().notNull(),
    classId: (0, pg_core_1.integer)('class_id'),
    memberId: (0, pg_core_1.integer)('member_id'),
    bookedAt: (0, pg_core_1.timestamp)('booked_at', { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.classId],
        foreignColumns: [exports.classes.classId],
        name: 'classbookings_class_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.foreignKey)({
        columns: [table.memberId],
        foreignColumns: [exports.members.userId],
        name: 'classbookings_member_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.unique)('classbookings_class_id_member_id_key').on(table.classId, table.memberId),
]);
exports.userroles = (0, pg_core_1.pgTable)('userroles', {
    userId: (0, pg_core_1.integer)('user_id').notNull(),
    userRole: (0, exports.userRole)('user_role').notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'userroles_user_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.userRole], name: 'userroles_pkey' }),
]);
exports.classattendance = (0, pg_core_1.pgTable)('classattendance', {
    classId: (0, pg_core_1.integer)('class_id').notNull(),
    memberId: (0, pg_core_1.integer)('member_id').notNull(),
    markedAt: (0, pg_core_1.timestamp)('marked_at', { mode: 'string' }).defaultNow(),
    score: (0, pg_core_1.integer)().default(0),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.classId, table.memberId],
        foreignColumns: [exports.classbookings.classId, exports.classbookings.memberId],
        name: 'classattendance_class_id_member_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.primaryKey)({ columns: [table.classId, table.memberId], name: 'classattendance_pkey' }),
]);
// Add missing notification tables
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    notificationId: (0, pg_core_1.serial)('notification_id').primaryKey().notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    type: (0, pg_core_1.text)('type').notNull(), // 'info', 'warning', 'error', 'success'
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'string' }).defaultNow(),
    createdBy: (0, pg_core_1.integer)('created_by'),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.createdBy],
        foreignColumns: [exports.admins.userId],
        name: 'notifications_created_by_fkey',
    }),
]);
exports.notificationTargets = (0, pg_core_1.pgTable)('notification_targets', {
    notificationId: (0, pg_core_1.integer)('notification_id').notNull(),
    targetUserId: (0, pg_core_1.integer)('target_user_id').notNull(),
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.notificationId],
        foreignColumns: [exports.notifications.notificationId],
        name: 'notification_targets_notification_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.foreignKey)({
        columns: [table.targetUserId],
        foreignColumns: [exports.users.userId],
        name: 'notification_targets_target_user_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.primaryKey)({ columns: [table.notificationId, table.targetUserId], name: 'notification_targets_pkey' }),
]);
exports.notificationReads = (0, pg_core_1.pgTable)('notification_reads', {
    notificationId: (0, pg_core_1.integer)('notification_id').notNull(),
    userId: (0, pg_core_1.integer)('user_id').notNull(),
    readAt: (0, pg_core_1.timestamp)('read_at', { mode: 'string' }).defaultNow(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.notificationId],
        foreignColumns: [exports.notifications.notificationId],
        name: 'notification_reads_notification_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.users.userId],
        name: 'notification_reads_user_id_fkey',
    }).onDelete('cascade'),
    (0, pg_core_1.primaryKey)({ columns: [table.notificationId, table.userId], name: 'notification_reads_pkey' }),
]);
