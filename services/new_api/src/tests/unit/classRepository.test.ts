import { ClassRepository } from '../../repositories/class/classRepository';
import { db } from '../../db/client';
import { classes, workouts, classbookings, classattendance } from '../../db/schema';
import { builder } from '../builder';

jest.mock('../../db/client', () => ({
  db: {
    select: jest.fn(() => builder()),
    insert: jest.fn(() => builder()),
    update: jest.fn(() => builder()),
    delete: jest.fn(() => builder()),
    transaction: jest.fn((cb: (tx: any) => any) => cb({
      select: jest.fn(() => builder()),
      insert: jest.fn(() => builder()),
      update: jest.fn(() => builder()),
      delete: jest.fn(() => builder()),
    })),
  },
}));

describe('ClassRepository', () => {
  const repository = new ClassRepository();

  it('should find assigned classes by coach', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ classId: 1, coachId: 2 }]));
    const result = await repository.findAssignedClassesByCoach(2);
    expect(result).toEqual([{ classId: 1, coachId: 2 }]);
  });

  it('should find assigned classes with workouts by coach', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ classId: 1, workoutId: 3, workoutName: 'Workout A' }]));
    const result = await repository.findAssignedClassesWithWorkoutsByCoach(2);
    expect(result).toEqual([{ classId: 1, workoutId: 3, workoutName: 'Workout A' }]);
  });

  it('should find class by ID for update', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ classId: 1 }]));
    const result = await repository.findClassByIdForUpdate(1);
    expect(result).toEqual({ classId: 1 });
  });

  it('should update workout for class', async () => {
    await repository.updateWorkoutForClass(1, 2);
    expect(db.update).toHaveBeenCalledWith(classes, { workoutId: 2 });
  });

  it('should create workout', async () => {
    (db.transaction as jest.Mock).mockImplementationOnce((cb) => cb({
      insert: jest.fn(() => builder([{ workoutId: 1 }]))
    }));
    const result = await repository.createWorkout({ workoutName: 'Workout A', type: 'Strength', metadata: {} }, []);
    expect(result).toBe(1);
  });

  it('should get upcoming classes for members', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ classId: 1 }]));
    const result = await repository.getUpcomingClassesForMembers({ today: '2025-08-19', time: '12:00' });
    expect(result).toEqual([{ classId: 1 }]);
  });

  it('should get booked classes for member', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ bookingId: 1, classId: 2 }]));
    const result = await repository.getBookedClassesForMember(1, { today: '2025-08-19', time: '12:00' });
    expect(result).toEqual([{ bookingId: 1, classId: 2 }]);
  });

  it('should check if already booked', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ bookingId: 1 }]));
    const result = await repository.alreadyBooked(1, 2);
    expect(result).toBe(true);
  });

  it('should count bookings for class', async () => {
    (db.select as jest.Mock).mockReturnValueOnce(builder([{ count: 5 }]));
    const result = await repository.countBookingsForClass(1);
    expect(result).toBe(5);
  });

  it('should insert booking', async () => {
    await repository.insertBooking(1, 2);
    expect(db.insert).toHaveBeenCalledWith(classbookings, { classId: 1, memberId: 2 });
  });

  it('should insert attendance', async () => {
    (db.insert as jest.Mock).mockReturnValueOnce(builder([{ classId: 1, memberId: 2 }]));
    const result = await repository.insertAttendance(1, 2);
    expect(result).toEqual({ classId: 1, memberId: 2 });
  });

  it('should delete booking', async () => {
    await repository.deleteBooking(1, 2);
    expect(db.delete).toHaveBeenCalledWith(classbookings, { classId: 1, memberId: 2 });
  });
});