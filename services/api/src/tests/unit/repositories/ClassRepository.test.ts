import { ClassRepository } from '../../../repositories/class/classRepository';
import { builder } from '../../builder';
import {
  classes,
  classbookings,
  classattendance,
  workouts,
  exercises,
  rounds,
  subrounds,
  subroundExercises,
  users,
} from '../../../db/schema';


jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('ClassRepository', () => {
  let classRepository: ClassRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    classRepository = new ClassRepository();
  });

  describe('findAssignedClassesByCoach', () => {
    it('should return classes assigned to a coach', async () => {
      const coachId = 1;
      const mockClasses = [
        {
          classId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          capacity: 20,
          workoutId: 1,
          coachId: 1,
          durationMinutes: 60,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
        },
        {
          classId: 2,
          scheduledDate: '2024-01-16',
          scheduledTime: '18:00',
          capacity: 15,
          workoutId: 2,
          coachId: 1,
          durationMinutes: 45,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
        },
      ];

      mockDb.select.mockReturnValue(builder(mockClasses));

      const result = await classRepository.findAssignedClassesByCoach(coachId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        classId: 1,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        capacity: 20,
        workoutId: 1,
        coachId: 1,
        durationMinutes: 60,
        createdBy: 1,
        createdAt: new Date('2024-01-15T08:00:00Z'),
      });
    });

    it('should return empty array when coach has no assigned classes', async () => {
      const coachId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.findAssignedClassesByCoach(coachId);

      expect(result).toEqual([]);
    });
  });

  describe('findAssignedClassesWithWorkoutsByCoach', () => {
    it('should return classes with workout details for a coach', async () => {
      const coachId = 1;
      const mockClassesWithWorkouts = [
        {
          classId: 1,
          capacity: 20,
          scheduledDate: '2025-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          createdBy: 1,
          createdAt: new Date('2025-01-15T08:00:00Z'),
          workoutName: 'Morning HIIT',
          workoutId: 1,
          workoutType: 'FOR_TIME',
          workoutMetadata: { rounds: 3 },
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: 5,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockClassesWithWorkouts));

      const result = await classRepository.findAssignedClassesWithWorkoutsByCoach(coachId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        classId: 1,
        capacity: 20,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
        createdAt: new Date('2025-01-15T08:00:00Z'),
        workoutName: 'Morning HIIT',
        workoutType: 'FOR_TIME',
        workoutMetadata: { rounds: 3 },
        coachFirstName: 'Jason',
        coachLastName: 'Mayo',
        bookingsCount: 5,
      });
    });

    it('should handle null bookingsCount', async () => {
      const coachId = 1;
      const mockClassesWithWorkouts = [
        {
          classId: 1,
          capacity: 20,
          scheduledDate: '2025-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          createdBy: 1,
          createdAt: new Date('2025-01-15T08:00:00Z'),
          workoutName: 'Morning HIIT',
          workoutId: 1,
          workoutType: 'FOR_TIME',
          workoutMetadata: { rounds: 3 },
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: null,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockClassesWithWorkouts));

      const result = await classRepository.findAssignedClassesWithWorkoutsByCoach(coachId);

      expect(result[0].bookingsCount).toBe(0);
    });
  });

  describe('findClassByIdForUpdate', () => {
    it('should return class when found', async () => {
      const classId = 1;
      const mockClass = {
        classId: 1,
        capacity: 20,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
        createdAt: new Date('2025-01-15T08:00:00Z'),
      };

      mockDb.select.mockReturnValue(builder([mockClass]));

      const result = await classRepository.findClassByIdForUpdate(classId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        classId: 1,
        capacity: 20,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        createdBy: 1,
        createdAt: new Date('2025-01-15T08:00:00Z'),
      });
    });

    it('should return null when class not found', async () => {
      const classId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.findClassByIdForUpdate(classId);

      expect(result).toBeNull();
    });

    it('should handle null optional fields', async () => {
      const classId = 1;
      const mockClass = {
        classId: 1,
        capacity: 20,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: null,
        workoutId: null,
        createdBy: null,
        createdAt: new Date('2025-01-15T08:00:00Z'),
      };

      mockDb.select.mockReturnValue(builder([mockClass]));

      const result = await classRepository.findClassByIdForUpdate(classId);

      expect(result?.coachId).toBeUndefined();
      expect(result?.workoutId).toBeUndefined();
      expect(result?.createdBy).toBeUndefined();
    });
  });

  describe('updateWorkoutForClass', () => {
    it('should update workout for a class', async () => {
      const classId = 1;
      const workoutId = 2;

      mockDb.update.mockReturnValue(builder());

      await classRepository.updateWorkoutForClass(classId, workoutId);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('createWorkout', () => {
    it('should create workout with rounds and exercises', async () => {
      const workoutData = {
        workoutName: 'HIIT Workout',
        type: 'FOR_TIME' as const,
        metadata: { rounds: 3 },
        createdBy: 1,
      };

      const roundsInput = [
        {
          roundNumber: 1,
          subrounds: [
            {
              subroundNumber: 1,
              exercises: [
                {
                  exerciseId: 1,
                  position: 1,
                  quantityType: 'reps' as const,
                  quantity: 10,
                  notes: 'Fast pace',
                },
              ],
            },
          ],
        },
      ];

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([{ workoutId: 1 }])) // workout creation
          .mockReturnValueOnce(builder([{ roundId: 1 }]))    // round creation
          .mockReturnValueOnce(builder([{ subroundId: 1 }])) // subround creation
          .mockReturnValue(builder()),                        // subround exercises
        select: jest.fn().mockReturnValue(builder([{ id: 1 }])), // existing exercise check
      };

      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await classRepository.createWorkout(workoutData, roundsInput);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should create new exercises when names are provided', async () => {
      const workoutData = {
        workoutName: 'New Workout',
        type: 'AMRAP' as const,
        metadata: {},
        createdBy: 1,
      };

      const roundsInput = [
        {
          roundNumber: 1,
          subrounds: [
            {
              subroundNumber: 1,
              exercises: [
                {
                  exerciseName: 'New Exercise',
                  position: 1,
                  quantityType: 'reps' as const,
                  quantity: 10,
                },
              ],
            },
          ],
        },
      ];

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([{ workoutId: 1 }])) // workout
          .mockReturnValueOnce(builder([{ id: 1 }]))        // new exercise
          .mockReturnValueOnce(builder([{ roundId: 1 }]))   // round
          .mockReturnValueOnce(builder([{ subroundId: 1 }])) // subround
          .mockReturnValue(builder()),                       // subround exercises
        select: jest.fn()
          .mockReturnValueOnce(builder([])) // no existing exercises by name
      };

      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await classRepository.createWorkout(workoutData, roundsInput);

      expect(result).toBe(1);
      expect(mockTransaction.insert).toHaveBeenCalledTimes(5); // workout, exercise, round, subround, subround_exercises
    });

    it('should throw error for non-existent exercise IDs', async () => {
      const workoutData = {
        workoutName: 'Invalid Workout',
        type: 'FOR_TIME' as const,
        metadata: {},
        createdBy: 1,
      };

      const roundsInput = [
        {
          roundNumber: 1,
          subrounds: [
            {
              subroundNumber: 1,
              exercises: [
                {
                  exerciseId: 999, // Non-existent
                  position: 1,
                  quantityType: 'reps' as const,
                  quantity: 10,
                },
              ],
            },
          ],
        },
      ];

      const mockTransaction = {
        insert: jest.fn().mockReturnValueOnce(builder([{ workoutId: 1 }])),
        select: jest.fn().mockReturnValue(builder([])), // No existing exercises
      };

      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      await expect(classRepository.createWorkout(workoutData, roundsInput))
        .rejects.toThrow('These exerciseIds do not exist: 999');
    });
  });

  describe('getUpcomingClassesForMembers', () => {
    it('should return upcoming classes', async () => {
      const window = { today: '2024-01-15', time: '10:00' };
      const mockClasses = [
        {
          classId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '18:00',
          capacity: 20,
          coachId: 1,
          workoutId: 1,
          durationMinutes: 60,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          workoutName: 'Evening HIIT',
          workoutType: 'FOR_TIME',
          workoutMetadata: {},
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: 3,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockClasses));

      const result = await classRepository.getUpcomingClassesForMembers(window);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].workoutName).toBe('Evening HIIT');
    });

    it('should return empty array when no upcoming classes', async () => {
      const window = { today: '2024-01-15', time: '10:00' };
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.getUpcomingClassesForMembers(window);

      expect(result).toEqual([]);
    });
  });

  describe('getBookedClassesForMember', () => {
    it('should return booked classes for a member', async () => {
      const memberId = 1;
      const window = { today: '2024-01-15', time: '10:00' };
      const mockBookedClasses = [
        {
          bookingId: 1,
          classId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '18:00',
          capacity: 20,
          coachId: 1,
          workoutId: 1,
          durationMinutes: 60,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          workoutName: 'Evening HIIT',
          workoutType: 'FOR_TIME',
          workoutMetadata: {},
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: 5,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockBookedClasses));

      const result = await classRepository.getBookedClassesForMember(memberId, window);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].classId).toBe(1);
    });

    it('should return empty array when member has no bookings', async () => {
      const memberId = 999;
      const window = { today: '2024-01-15', time: '10:00' };
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.getBookedClassesForMember(memberId, window);

      expect(result).toEqual([]);
    });
  });

  describe('getUnbookedClassesForMember', () => {
    it('should return classes not booked by member', async () => {
      const memberId = 1;
      const window = { today: '2024-01-15', time: '10:00' };
      const mockUnbookedClasses = [
        {
          classId: 2,
          scheduledDate: '2024-01-16',
          scheduledTime: '09:00',
          capacity: 15,
          coachId: 2,
          workoutId: 2,
          durationMinutes: 45,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          workoutName: 'Morning Yoga',
          workoutType: 'EMOM',
          workoutMetadata: {},
          coachFirstName: 'Jared',
          coachLastName: 'Hurlimam',
          bookingsCount: 2,
        },
      ];

      mockDb.select.mockReturnValue(builder(mockUnbookedClasses));

      const result = await classRepository.getUnbookedClassesForMember(memberId, window);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].classId).toBe(2);
    });
  });

  describe('alreadyBooked', () => {
    it('should return true when class is already booked', async () => {
      const classId = 1;
      const memberId = 1;
      const mockBooking = [{ bookingId: 1, classId: 1, memberId: 1 }];

      mockDb.select.mockReturnValue(builder(mockBooking));

      const result = await classRepository.alreadyBooked(classId, memberId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when class is not booked', async () => {
      const classId = 1;
      const memberId = 1;

      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.alreadyBooked(classId, memberId);

      expect(result).toBe(false);
    });
  });

  describe('countBookingsForClass', () => {
    it('should return booking count for a class', async () => {
      const classId = 1;
      const mockCount = [{ count: 5 }];

      mockDb.select.mockReturnValue(builder(mockCount));

      const result = await classRepository.countBookingsForClass(classId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no bookings exist', async () => {
      const classId = 1;
      const mockCount = [{ count: 0 }];

      mockDb.select.mockReturnValue(builder(mockCount));

      const result = await classRepository.countBookingsForClass(classId);

      expect(result).toBe(0);
    });
  });

  describe('insertBooking', () => {
    it('should insert a booking', async () => {
      const classId = 1;
      const memberId = 1;

      mockDb.insert.mockReturnValue(builder());

      await classRepository.insertBooking(classId, memberId);

      expect(mockDb.insert).toHaveBeenCalledWith(classbookings);
    });
  });

  describe('hasOverlappingBooking', () => {
    it('should return true when there is overlapping booking', async () => {
      const memberId = 1;
      const window = {
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
      };
      const mockOverlap = [{ count: 1 }];

      mockDb.select.mockReturnValue(builder(mockOverlap));

      const result = await classRepository.hasOverlappingBooking(memberId, window);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when no overlapping booking', async () => {
      const memberId = 1;
      const window = {
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
      };
      const mockOverlap = [{ count: 0 }];

      mockDb.select.mockReturnValue(builder(mockOverlap));

      const result = await classRepository.hasOverlappingBooking(memberId, window);

      expect(result).toBe(false);
    });

    it('should handle undefined count', async () => {
      const memberId = 1;
      const window = {
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
      };

      mockDb.select.mockReturnValue(builder([{}]));

      const result = await classRepository.hasOverlappingBooking(memberId, window);

      expect(result).toBe(false);
    });
  });

  describe('insertAttendance', () => {
    it('should insert attendance and return attendance object', async () => {
      const classId = 1;
      const memberId = 1;
      const mockAttendance = {
        classId: 1,
        memberId: 1,
        markedAt: new Date('2024-01-15T09:00:00Z'),
        score: null,
      };

      mockDb.insert.mockReturnValue(builder([mockAttendance]));

      const result = await classRepository.insertAttendance(classId, memberId);

      expect(mockDb.insert).toHaveBeenCalledWith(classattendance);
      expect(result).toEqual({
        classId: 1,
        memberId: 1,
        markedAt: new Date('2024-01-15T09:00:00Z'),
        score: undefined,
      });
    });

    it('should return null when attendance insertion fails', async () => {
      const classId = 1;
      const memberId = 1;

      mockDb.insert.mockReturnValue(builder([]));

      const result = await classRepository.insertAttendance(classId, memberId);

      expect(result).toBeNull();
    });

    it('should handle null score and markedAt', async () => {
      const classId = 1;
      const memberId = 1;
      const mockAttendance = {
        classId: 1,
        memberId: 1,
        markedAt: null,
        score: null,
      };

      mockDb.insert.mockReturnValue(builder([mockAttendance]));

      const result = await classRepository.insertAttendance(classId, memberId);

      expect(result?.markedAt).toBeUndefined();
      expect(result?.score).toBeUndefined();
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking', async () => {
      const classId = 1;
      const memberId = 1;

      mockDb.delete.mockReturnValue(builder());

      await classRepository.deleteBooking(classId, memberId);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('transaction handling', () => {
    it('should use provided transaction executor when available', async () => {
      const mockTx = {
        select: jest.fn().mockReturnValue(builder([])),
      };
      const coachId = 1;

      await classRepository.findAssignedClassesByCoach(coachId, mockTx);

      expect(mockTx.select).toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should use global db when no transaction provided', async () => {
      const coachId = 1;
      mockDb.select.mockReturnValue(builder([]));

      await classRepository.findAssignedClassesByCoach(coachId);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    describe('mapToClass', () => {
      it('should map database row to Class entity correctly', async () => {
        const mockClassRow = {
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          extraField: 'should be ignored',
        };

        mockDb.select.mockReturnValue(builder([mockClassRow]));

        const result = await classRepository.findClassByIdForUpdate(1);

        expect(result).toEqual({
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
        });
      });
    });

    describe('mapToClassWithWorkout', () => {
      it('should map database row to ClassWithWorkout entity correctly', async () => {
        const coachId = 1;
        const mockClassWithWorkout = {
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          workoutName: 'Test Workout',
          workoutType: 'FOR_TIME',
          workoutMetadata: { rounds: 3 },
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: 5,
        };

        mockDb.select.mockReturnValue(builder([mockClassWithWorkout]));

        const result = await classRepository.findAssignedClassesWithWorkoutsByCoach(coachId);

        expect(result[0]).toEqual({
          classId: 1,
          capacity: 20,
          scheduledDate: '2024-01-15',
          scheduledTime: '09:00',
          durationMinutes: 60,
          coachId: 1,
          workoutId: 1,
          createdBy: 1,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          workoutName: 'Test Workout',
          workoutType: 'FOR_TIME',
          workoutMetadata: { rounds: 3 },
          coachFirstName: 'Jason',
          coachLastName: 'Mayo',
          bookingsCount: 5,
        });
      });
    });

    describe('mapToClassAttendance', () => {
      it('should map database row to ClassAttendance entity correctly', async () => {
        const classId = 1;
        const memberId = 1;
        const mockAttendance = {
          classId: 1,
          memberId: 1,
          markedAt: new Date('2024-01-15T09:00:00Z'),
          score: 150,
        };

        mockDb.insert.mockReturnValue(builder([mockAttendance]));

        const result = await classRepository.insertAttendance(classId, memberId);

        expect(result).toEqual({
          classId: 1,
          memberId: 1,
          markedAt: new Date('2024-01-15T09:00:00Z'),
          score: 150,
        });
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle negative IDs', async () => {
      const negativeId = -1;
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.findAssignedClassesByCoach(negativeId);

      expect(result).toEqual([]);
    });

    it('should handle zero IDs', async () => {
      const zeroId = 0;
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.findClassByIdForUpdate(zeroId);

      expect(result).toBeNull();
    });

    it('should handle empty window parameters', async () => {
      const window = { today: '', time: '' };
      mockDb.select.mockReturnValue(builder([]));

      const result = await classRepository.getUpcomingClassesForMembers(window);

      expect(result).toEqual([]);
    });

    it('should handle complex workout creation with multiple rounds', async () => {
      const workoutData = {
        workoutName: 'Complex Workout',
        type: 'AMRAP' as const,
        metadata: { timeLimit: 20 },
        createdBy: 1,
      };

      const complexRoundsInput = [
        {
          roundNumber: 1,
          subrounds: [
            {
              subroundNumber: 1,
              exercises: [
                { exerciseId: 1, position: 1, quantityType: 'reps' as const, quantity: 10 },
                { exerciseName: 'New Exercise', position: 2, quantityType: 'duration' as const, quantity: 30 },
              ],
            },
          ],
        },
        {
          roundNumber: 2,
          subrounds: [
            {
              subroundNumber: 1,
              exercises: [
                { exerciseId: 2, position: 1, quantityType: 'reps' as const, quantity: 15 },
              ],
            },
          ],
        },
      ];

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([{ workoutId: 1 }]))   
          .mockReturnValueOnce(builder([{ id: 10 }]))         
          .mockReturnValueOnce(builder([{ roundId: 1 }]))     
          .mockReturnValueOnce(builder([{ subroundId: 1 }]))  
          .mockReturnValueOnce(builder())                      
          .mockReturnValueOnce(builder())                      
          .mockReturnValueOnce(builder([{ roundId: 2 }]))     
          .mockReturnValueOnce(builder([{ subroundId: 2 }]))  
          .mockReturnValue(builder()),                         
        select: jest.fn()
          .mockReturnValueOnce(builder([{ id: 1 }, { id: 2 }])) 
          .mockReturnValueOnce(builder([])),                      
      };

      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await classRepository.createWorkout(workoutData, complexRoundsInput);

      expect(result).toBe(1);
      expect(mockTransaction.insert).toHaveBeenCalledTimes(9); // workout + new exercise + 2 rounds + 2 subrounds + 3 subround exercises
    });
  });
});
