import { relations } from 'drizzle-orm/relations';
import {
  coaches,
  classes,
  workouts,
  admins,
  users,
  managers,
  members,
  classbookings,
  userroles,
  classattendance,
  classSessions,
  liveProgress,
  notifications,
  notificationTargets,
} from './schema';

export const classesRelations = relations(classes, ({ one, many }) => ({
  coach: one(coaches, {
    fields: [classes.coachId],
    references: [coaches.userId],
  }),
  workout: one(workouts, {
    fields: [classes.workoutId],
    references: [workouts.workoutId],
  }),
  admin: one(admins, {
    fields: [classes.createdBy],
    references: [admins.userId],
  }),
  classbookings: many(classbookings),
}));

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  classes: many(classes),
  user: one(users, {
    fields: [coaches.userId],
    references: [users.userId],
  }),
}));

export const workoutsRelations = relations(workouts, ({ many }) => ({
  classes: many(classes),
}));

export const adminsRelations = relations(admins, ({ one, many }) => ({
  classes: many(classes),
  user: one(users, {
    fields: [admins.userId],
    references: [users.userId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  coaches: many(coaches),
  admins: many(admins),
  managers: many(managers),
  members: many(members),
  userroles: many(userroles),
}));

export const managersRelations = relations(managers, ({ one }) => ({
  user: one(users, {
    fields: [managers.userId],
    references: [users.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.userId],
  }),
  classbookings: many(classbookings),
}));

export const classbookingsRelations = relations(classbookings, ({ one, many }) => ({
  class: one(classes, {
    fields: [classbookings.classId],
    references: [classes.classId],
  }),
  member: one(members, {
    fields: [classbookings.memberId],
    references: [members.userId],
  }),
  classattendances: many(classattendance),
}));

export const userrolesRelations = relations(userroles, ({ one }) => ({
  user: one(users, {
    fields: [userroles.userId],
    references: [users.userId],
  }),
}));

export const classattendanceRelations = relations(classattendance, ({ one }) => ({
  classbooking: one(classbookings, {
    fields: [classattendance.classId],
    references: [classbookings.classId],
  }),
}));

export const classSessionsRelations = relations(classSessions, ({ one, many }) => ({
  class: one(classes, {
    fields: [classSessions.classId],
    references: [classes.classId],
  }),
  workout: one(workouts, {
    fields: [classSessions.workoutId],
    references: [workouts.workoutId],
  }),
  liveProgress: many(liveProgress),
}));

export const liveProgressRelations = relations(liveProgress, ({ one }) => ({
  class: one(classes, {
    fields: [liveProgress.classId],
    references: [classes.classId],
  }),
  user: one(users, {
    fields: [liveProgress.userId],
    references: [users.userId],
  }),
  classSession: one(classSessions, {
    fields: [liveProgress.classId],
    references: [classSessions.classId],
  }),
}));

export const notificationTargetsRelations = relations(notificationTargets, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationTargets.notificationId],
    references: [notifications.notificationId],
  }),
}));

export const notificationsRelations = relations(notifications, ({ many }) => ({
  notificationTargets: many(notificationTargets),
}));
