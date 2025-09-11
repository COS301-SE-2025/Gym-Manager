"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classattendanceRelations = exports.notificationReadsRelations = exports.notificationsRelations = exports.notificationTargetsRelations = exports.userrolesRelations = exports.managersRelations = exports.classbookingsRelations = exports.exercisesRelations = exports.subroundExercisesRelations = exports.subroundsRelations = exports.roundsRelations = exports.usersRelations = exports.membersRelations = exports.adminsRelations = exports.workoutsRelations = exports.coachesRelations = exports.classesRelations = void 0;
const relations_1 = require("drizzle-orm/relations");
const schema_1 = require("./schema");
exports.classesRelations = (0, relations_1.relations)(schema_1.classes, ({ one, many }) => ({
    coach: one(schema_1.coaches, {
        fields: [schema_1.classes.coachId],
        references: [schema_1.coaches.userId]
    }),
    workout: one(schema_1.workouts, {
        fields: [schema_1.classes.workoutId],
        references: [schema_1.workouts.workoutId]
    }),
    admin: one(schema_1.admins, {
        fields: [schema_1.classes.createdBy],
        references: [schema_1.admins.userId]
    }),
    classbookings: many(schema_1.classbookings),
}));
exports.coachesRelations = (0, relations_1.relations)(schema_1.coaches, ({ one, many }) => ({
    classes: many(schema_1.classes),
    user: one(schema_1.users, {
        fields: [schema_1.coaches.userId],
        references: [schema_1.users.userId]
    }),
}));
exports.workoutsRelations = (0, relations_1.relations)(schema_1.workouts, ({ many }) => ({
    classes: many(schema_1.classes),
    rounds: many(schema_1.rounds),
}));
exports.adminsRelations = (0, relations_1.relations)(schema_1.admins, ({ one, many }) => ({
    classes: many(schema_1.classes),
    user: one(schema_1.users, {
        fields: [schema_1.admins.userId],
        references: [schema_1.users.userId]
    }),
}));
exports.membersRelations = (0, relations_1.relations)(schema_1.members, ({ one, many }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.members.userId],
        references: [schema_1.users.userId]
    }),
    classbookings: many(schema_1.classbookings),
}));
exports.usersRelations = (0, relations_1.relations)(schema_1.users, ({ many }) => ({
    members: many(schema_1.members),
    coaches: many(schema_1.coaches),
    admins: many(schema_1.admins),
    managers: many(schema_1.managers),
    userroles: many(schema_1.userroles),
    notificationReads: many(schema_1.notificationReads),
}));
exports.roundsRelations = (0, relations_1.relations)(schema_1.rounds, ({ one, many }) => ({
    workout: one(schema_1.workouts, {
        fields: [schema_1.rounds.workoutId],
        references: [schema_1.workouts.workoutId]
    }),
    subrounds: many(schema_1.subrounds),
}));
exports.subroundsRelations = (0, relations_1.relations)(schema_1.subrounds, ({ one, many }) => ({
    round: one(schema_1.rounds, {
        fields: [schema_1.subrounds.roundId],
        references: [schema_1.rounds.roundId]
    }),
    subroundExercises: many(schema_1.subroundExercises),
}));
exports.subroundExercisesRelations = (0, relations_1.relations)(schema_1.subroundExercises, ({ one }) => ({
    subround: one(schema_1.subrounds, {
        fields: [schema_1.subroundExercises.subroundId],
        references: [schema_1.subrounds.subroundId]
    }),
    exercise: one(schema_1.exercises, {
        fields: [schema_1.subroundExercises.exerciseId],
        references: [schema_1.exercises.exerciseId]
    }),
}));
exports.exercisesRelations = (0, relations_1.relations)(schema_1.exercises, ({ many }) => ({
    subroundExercises: many(schema_1.subroundExercises),
}));
exports.classbookingsRelations = (0, relations_1.relations)(schema_1.classbookings, ({ one, many }) => ({
    class: one(schema_1.classes, {
        fields: [schema_1.classbookings.classId],
        references: [schema_1.classes.classId]
    }),
    member: one(schema_1.members, {
        fields: [schema_1.classbookings.memberId],
        references: [schema_1.members.userId]
    }),
    classattendances: many(schema_1.classattendance),
}));
exports.managersRelations = (0, relations_1.relations)(schema_1.managers, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.managers.userId],
        references: [schema_1.users.userId]
    }),
}));
exports.userrolesRelations = (0, relations_1.relations)(schema_1.userroles, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.userroles.userId],
        references: [schema_1.users.userId]
    }),
}));
exports.notificationTargetsRelations = (0, relations_1.relations)(schema_1.notificationTargets, ({ one }) => ({
    notification: one(schema_1.notifications, {
        fields: [schema_1.notificationTargets.notificationId],
        references: [schema_1.notifications.notificationId]
    }),
}));
exports.notificationsRelations = (0, relations_1.relations)(schema_1.notifications, ({ many }) => ({
    notificationTargets: many(schema_1.notificationTargets),
    notificationReads: many(schema_1.notificationReads),
}));
exports.notificationReadsRelations = (0, relations_1.relations)(schema_1.notificationReads, ({ one }) => ({
    notification: one(schema_1.notifications, {
        fields: [schema_1.notificationReads.notificationId],
        references: [schema_1.notifications.notificationId]
    }),
    user: one(schema_1.users, {
        fields: [schema_1.notificationReads.userId],
        references: [schema_1.users.userId]
    }),
}));
exports.classattendanceRelations = (0, relations_1.relations)(schema_1.classattendance, ({ one }) => ({
    classbooking: one(schema_1.classbookings, {
        fields: [schema_1.classattendance.classId],
        references: [schema_1.classbookings.classId]
    }),
}));
