import { relations } from "drizzle-orm/relations";
import { coaches, classes, workouts, admins, users, members, rounds, subrounds, subroundExercises, exercises, classbookings, managers, userroles, notifications, notificationTargets, notificationReads, classattendance } from "./schema";

export const classesRelations = relations(classes, ({one, many}) => ({
	coach: one(coaches, {
		fields: [classes.coachId],
		references: [coaches.userId]
	}),
	workout: one(workouts, {
		fields: [classes.workoutId],
		references: [workouts.workoutId]
	}),
	admin: one(admins, {
		fields: [classes.createdBy],
		references: [admins.userId]
	}),
	classbookings: many(classbookings),
}));

export const coachesRelations = relations(coaches, ({one, many}) => ({
	classes: many(classes),
	user: one(users, {
		fields: [coaches.userId],
		references: [users.userId]
	}),
}));

export const workoutsRelations = relations(workouts, ({many}) => ({
	classes: many(classes),
	rounds: many(rounds),
}));

export const adminsRelations = relations(admins, ({one, many}) => ({
	classes: many(classes),
	user: one(users, {
		fields: [admins.userId],
		references: [users.userId]
	}),
}));

export const membersRelations = relations(members, ({one, many}) => ({
	user: one(users, {
		fields: [members.userId],
		references: [users.userId]
	}),
	classbookings: many(classbookings),
}));

export const usersRelations = relations(users, ({many}) => ({
	members: many(members),
	coaches: many(coaches),
	admins: many(admins),
	managers: many(managers),
	userroles: many(userroles),
	notificationReads: many(notificationReads),
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

export const subroundExercisesRelations = relations(subroundExercises, ({one}) => ({
	subround: one(subrounds, {
		fields: [subroundExercises.subroundId],
		references: [subrounds.subroundId]
	}),
	exercise: one(exercises, {
		fields: [subroundExercises.exerciseId],
		references: [exercises.exerciseId]
	}),
}));

export const exercisesRelations = relations(exercises, ({many}) => ({
	subroundExercises: many(subroundExercises),
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

export const managersRelations = relations(managers, ({one}) => ({
	user: one(users, {
		fields: [managers.userId],
		references: [users.userId]
	}),
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