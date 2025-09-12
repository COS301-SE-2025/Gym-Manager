import { relations } from "drizzle-orm/relations";
import { users, coaches, admins, managers, classes, workouts, classbookings, members, classSessions, rounds, subrounds, subroundExercises, emomTargets, exercises, userroles, notifications, notificationTargets, notificationReads, classattendance, liveIntervalScores, liveProgress } from "./schema";

export const coachesRelations = relations(coaches, ({one, many}) => ({
	user: one(users, {
		fields: [coaches.userId],
		references: [users.userId]
	}),
	classes: many(classes),
}));

export const usersRelations = relations(users, ({many}) => ({
	coaches: many(coaches),
	admins: many(admins),
	managers: many(managers),
	members: many(members),
	userroles: many(userroles),
	notificationReads: many(notificationReads),
	liveIntervalScores: many(liveIntervalScores),
	liveProgresses: many(liveProgress),
}));

export const adminsRelations = relations(admins, ({one, many}) => ({
	user: one(users, {
		fields: [admins.userId],
		references: [users.userId]
	}),
	classes: many(classes),
}));

export const managersRelations = relations(managers, ({one}) => ({
	user: one(users, {
		fields: [managers.userId],
		references: [users.userId]
	}),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	coach: one(coaches, {
		fields: [classes.coachId],
		references: [coaches.userId]
	}),
	admin: one(admins, {
		fields: [classes.createdBy],
		references: [admins.userId]
	}),
	workout: one(workouts, {
		fields: [classes.workoutId],
		references: [workouts.workoutId]
	}),
	classbookings: many(classbookings),
	classSessions: many(classSessions),
}));

export const workoutsRelations = relations(workouts, ({many}) => ({
	classes: many(classes),
	classSessions: many(classSessions),
	rounds: many(rounds),
}));

export const classbookingsRelations = relations(classbookings, ({one, many}) => ({
	class: one(classes, {
		fields: [classbookings.classId],
		references: [classes.classId]
	}),
	member: one(members, {
		fields: [classbookings.memberId],
		references: [members.userId]
	}),
	classattendances: many(classattendance),
}));

export const membersRelations = relations(members, ({one, many}) => ({
	classbookings: many(classbookings),
	user: one(users, {
		fields: [members.userId],
		references: [users.userId]
	}),
}));

export const classSessionsRelations = relations(classSessions, ({one, many}) => ({
	class: one(classes, {
		fields: [classSessions.classId],
		references: [classes.classId]
	}),
	workout: one(workouts, {
		fields: [classSessions.workoutId],
		references: [workouts.workoutId]
	}),
	liveIntervalScores: many(liveIntervalScores),
	liveProgresses: many(liveProgress),
}));

export const roundsRelations = relations(rounds, ({one, many}) => ({
	workout: one(workouts, {
		fields: [rounds.workoutId],
		references: [workouts.workoutId]
	}),
	subrounds: many(subrounds),
}));

export const subroundsRelations = relations(subrounds, ({one, many}) => ({
	round: one(rounds, {
		fields: [subrounds.roundId],
		references: [rounds.roundId]
	}),
	subroundExercises: many(subroundExercises),
}));

export const emomTargetsRelations = relations(emomTargets, ({one}) => ({
	subroundExercise: one(subroundExercises, {
		fields: [emomTargets.subroundExerciseId],
		references: [subroundExercises.subroundExerciseId]
	}),
}));

export const subroundExercisesRelations = relations(subroundExercises, ({one, many}) => ({
	emomTargets: many(emomTargets),
	exercise: one(exercises, {
		fields: [subroundExercises.exerciseId],
		references: [exercises.exerciseId]
	}),
	subround: one(subrounds, {
		fields: [subroundExercises.subroundId],
		references: [subrounds.subroundId]
	}),
}));

export const exercisesRelations = relations(exercises, ({many}) => ({
	subroundExercises: many(subroundExercises),
}));

export const userrolesRelations = relations(userroles, ({one}) => ({
	user: one(users, {
		fields: [userroles.userId],
		references: [users.userId]
	}),
}));

export const notificationTargetsRelations = relations(notificationTargets, ({one}) => ({
	notification: one(notifications, {
		fields: [notificationTargets.notificationId],
		references: [notifications.notificationId]
	}),
}));

export const notificationsRelations = relations(notifications, ({many}) => ({
	notificationTargets: many(notificationTargets),
	notificationReads: many(notificationReads),
}));

export const notificationReadsRelations = relations(notificationReads, ({one}) => ({
	notification: one(notifications, {
		fields: [notificationReads.notificationId],
		references: [notifications.notificationId]
	}),
	user: one(users, {
		fields: [notificationReads.userId],
		references: [users.userId]
	}),
}));

export const classattendanceRelations = relations(classattendance, ({one}) => ({
	classbooking: one(classbookings, {
		fields: [classattendance.classId],
		references: [classbookings.classId]
	}),
}));

export const liveIntervalScoresRelations = relations(liveIntervalScores, ({one}) => ({
	classSession: one(classSessions, {
		fields: [liveIntervalScores.classId],
		references: [classSessions.classId]
	}),
	user: one(users, {
		fields: [liveIntervalScores.userId],
		references: [users.userId]
	}),
}));

export const liveProgressRelations = relations(liveProgress, ({one}) => ({
	classSession: one(classSessions, {
		fields: [liveProgress.classId],
		references: [classSessions.classId]
	}),
	user: one(users, {
		fields: [liveProgress.userId],
		references: [users.userId]
	}),
}));