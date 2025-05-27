import { relations } from "drizzle-orm/relations";
import { users, members, coaches, admins, managers, classes, workouts, classbookings, userroles } from "./schema";

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
}));

export const coachesRelations = relations(coaches, ({one, many}) => ({
	user: one(users, {
		fields: [coaches.userId],
		references: [users.userId]
	}),
	classes: many(classes),
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

export const workoutsRelations = relations(workouts, ({many}) => ({
	classes: many(classes),
}));

export const classbookingsRelations = relations(classbookings, ({one}) => ({
	class: one(classes, {
		fields: [classbookings.classId],
		references: [classes.classId]
	}),
	member: one(members, {
		fields: [classbookings.memberId],
		references: [members.userId]
	}),
}));

export const userrolesRelations = relations(userroles, ({one}) => ({
	user: one(users, {
		fields: [userroles.userId],
		references: [users.userId]
	}),
}));