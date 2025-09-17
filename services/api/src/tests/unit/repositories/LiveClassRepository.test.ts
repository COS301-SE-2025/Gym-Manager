import { LiveClassRepository } from '../../../repositories/liveClass/liveClassRepository';
import { builder } from '../../builder';
import {
  classes,
  workouts,
  classbookings,
  classattendance,
  members,
  users,
} from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
  },
}));

describe('LiveClassRepository', () => {
  let liveClassRepository: LiveClassRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    liveClassRepository = new LiveClassRepository();
  });

  describe('autoEndIfCapReached', () => {
    it('should execute SQL to auto-end sessions that reach time cap', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.autoEndIfCapReached(classId);

      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getClassSession', () => {
    it('should return live session when found', async () => {
      const classId = 1;
      const mockSession = {
        class_id: 1,
        workout_id: 1,
        status: 'live',
        time_cap_seconds: 1200,
        started_at: new Date('2025-01-15T09:00:00Z'),
        ended_at: null,
        paused_at: null,
        pause_accum_seconds: 0,
        started_at_s: 1705309200,
        ended_at_s: null,
        paused_at_s: null,
        steps: [{ index: 0, name: 'Burpees', reps: 10, round: 1, subround: 1 }],
        steps_cum_reps: [10],
        workout_type: 'FOR_TIME',
        workout_metadata: { rounds: 1 },
      };

      mockDb.execute.mockResolvedValue({ rows: [mockSession] });

      const result = await liveClassRepository.getClassSession(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const classId = 999;
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getClassSession(classId);

      expect(result).toBeNull();
    });
  });

  describe('getFinalLeaderboard', () => {
    it('should return leaderboard sorted by score descending', async () => {
      const classId = 1;
      const mockLeaderboard = [
        {
          classId: 1,
          memberId: 1,
          score: 250,
          markedAt: new Date('2025-01-15T09:30:00Z'),
          firstName: 'Jason',
          lastName: 'Mayo',
        },
        {
          classId: 1,
          memberId: 2,
          score: 200,
          markedAt: new Date('2025-01-15T09:35:00Z'),
          firstName: 'Jared',
          lastName: 'Hurlimam',
        },
      ];

      mockDb.select.mockReturnValue(builder(mockLeaderboard));

      const result = await liveClassRepository.getFinalLeaderboard(classId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return empty array when no attendance records', async () => {
      const classId = 1;
      mockDb.select.mockReturnValue(builder([]));

      const result = await liveClassRepository.getFinalLeaderboard(classId);

      expect(result).toEqual([]);
    });
  });

  describe('getLiveClassForCoach', () => {
    it('should return live class for coach within time window', async () => {
      const userId = 1;
      const mockClass = {
        classId: 1,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        workoutName: 'Morning HIIT',
        workoutType: 'FOR_TIME',
      };
      const mockParticipants = [
        { userId: 2 },
        { userId: 3 },
      ];

      mockDb.select
        .mockReturnValueOnce(builder([mockClass]))
        .mockReturnValueOnce(builder(mockParticipants));

      const result = await liveClassRepository.getLiveClassForCoach(userId);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ongoing: true,
        roles: ['coach'],
        class: mockClass,
        participants: mockParticipants,
      });
    });

    it('should return null when no current class for coach', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await liveClassRepository.getLiveClassForCoach(userId);

      expect(result).toBeNull();
    });
  });

  describe('getLiveClassForMember', () => {
    it('should return live class for member within time window', async () => {
      const userId = 2;
      const mockClass = {
        classId: 1,
        scheduledDate: '2025-01-15',
        scheduledTime: '09:00',
        durationMinutes: 60,
        coachId: 1,
        workoutId: 1,
        workoutName: 'Morning HIIT',
        workoutType: 'FOR_TIME',
      };

      mockDb.select.mockReturnValue(builder([mockClass]));

      const result = await liveClassRepository.getLiveClassForMember(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual({
        ongoing: true,
        roles: ['member'],
        class: mockClass,
      });
    });

    it('should return null when no current class for member', async () => {
      const userId = 999;
      mockDb.select.mockReturnValue(builder([]));

      const result = await liveClassRepository.getLiveClassForMember(userId);

      expect(result).toBeNull();
    });
  });

  describe('getFlattenRowsForWorkout', () => {
    it('should return flattened workout structure', async () => {
      const workoutId = 1;
      const mockRows = [
        {
          round_number: 1,
          subround_number: 1,
          position: 1,
          name: 'Burpees',
          quantity_type: 'reps',
          quantity: 10,
          subround_exercise_id: 1,
          target_reps: null,
        },
        {
          round_number: 1,
          subround_number: 1,
          position: 2,
          name: 'Push-ups',
          quantity_type: 'reps',
          quantity: 15,
          subround_exercise_id: 2,
          target_reps: null,
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockRows });

      const result = await liveClassRepository.getFlattenRowsForWorkout(workoutId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('getWorkoutType', () => {
    it('should return workout type when found', async () => {
      const workoutId = 1;
      mockDb.execute.mockResolvedValue({ rows: [{ type: 'FOR_TIME' }] });

      const result = await liveClassRepository.getWorkoutType(workoutId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBe('FOR_TIME');
    });

    it('should return null when workout not found', async () => {
      const workoutId = 999;
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getWorkoutType(workoutId);

      expect(result).toBeNull();
    });
  });

  describe('getClassMeta', () => {
    it('should return class metadata', async () => {
      const classId = 1;
      const mockMeta = {
        class_id: 1,
        workout_id: 1,
        duration_minutes: 45,
      };

      mockDb.execute.mockResolvedValue({ rows: [mockMeta] });

      const result = await liveClassRepository.getClassMeta(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockMeta);
    });
  });

  describe('getWorkoutMetadata', () => {
    it('should return workout metadata', async () => {
      const workoutId = 1;
      const mockMetadata = { rounds: 5, time_cap: 1200 };

      mockDb.execute.mockResolvedValue({ rows: [{ metadata: mockMetadata }] });

      const result = await liveClassRepository.getWorkoutMetadata(workoutId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockMetadata);
    });

    it('should return empty object when no metadata', async () => {
      const workoutId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getWorkoutMetadata(workoutId);

      expect(result).toEqual({});
    });
  });

  describe('upsertClassSession', () => {
    it('should create or update class session', async () => {
      const classId = 1;
      const workoutId = 1;
      const timeCapSeconds = 1200;
      const steps = [{ index: 0, name: 'Burpees', reps: 10, round: 1, subround: 1 }];
      const stepsCumReps = [10];
      const workoutType = 'FOR_TIME';
      const workoutMetadata = { rounds: 1 };

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.upsertClassSession(
        classId,
        workoutId,
        timeCapSeconds,
        steps,
        stepsCumReps,
        workoutType,
        workoutMetadata
      );

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('seedLiveProgressForClass', () => {
    it('should seed live progress for all class participants', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.seedLiveProgressForClass(classId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('resetLiveProgressForClass', () => {
    it('should reset live progress for all class participants', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.resetLiveProgressForClass(classId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('stopSession', () => {
    it('should stop the class session', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.stopSession(classId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('pauseSession', () => {
    it('should pause the class session', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.pauseSession(classId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('resumeSession', () => {
    it('should resume the class session', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.resumeSession(classId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('ensureProgressRow', () => {
    it('should ensure progress row exists for user', async () => {
      const classId = 1;
      const userId = 2;
      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.ensureProgressRow(classId, userId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('getAdvanceMeta', () => {
    it('should return advance metadata', async () => {
      const classId = 1;
      const mockMeta = {
        status: 'live',
        time_cap_seconds: 1200,
        started_at: new Date('2025-01-15T09:00:00Z'),
        paused_at: null,
        pause_accum_seconds: 0,
        workout_type: 'FOR_TIME',
        step_count: 10,
      };

      mockDb.execute.mockResolvedValue({ rows: [mockMeta] });

      const result = await liveClassRepository.getAdvanceMeta(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockMeta);
    });
  });

  describe('getElapsedSeconds', () => {
    it('should calculate elapsed seconds', async () => {
      const startedAt = new Date('2025-01-15T09:00:00Z');
      const pausedAt = null;
      const pauseAccumSeconds = 0;

      mockDb.execute.mockResolvedValue({ rows: [{ e: 1800 }] });

      const result = await liveClassRepository.getElapsedSeconds(startedAt, pausedAt, pauseAccumSeconds);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBe(1800);
    });

    it('should handle null elapsed time', async () => {
      const startedAt = new Date('2025-01-15T09:00:00Z');
      const pausedAt = null;
      const pauseAccumSeconds = 0;

      mockDb.execute.mockResolvedValue({ rows: [{}] });

      const result = await liveClassRepository.getElapsedSeconds(startedAt, pausedAt, pauseAccumSeconds);

      expect(result).toBe(0);
    });
  });

  describe('advanceAmrap', () => {
    it('should advance AMRAP progress forward', async () => {
      const classId = 1;
      const userId = 2;
      const stepCount = 5;
      const dir = 1;
      const mockResult = { current_step: 2, rounds_completed: 1 };

      mockDb.execute.mockResolvedValue({ rows: [mockResult] });

      const result = await liveClassRepository.advanceAmrap(classId, userId, stepCount, dir);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should advance AMRAP progress backward', async () => {
      const classId = 1;
      const userId = 2;
      const stepCount = 5;
      const dir = -1;
      const mockResult = { current_step: 1, rounds_completed: 0 };

      mockDb.execute.mockResolvedValue({ rows: [mockResult] });

      const result = await liveClassRepository.advanceAmrap(classId, userId, stepCount, dir);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('advanceForTime', () => {
    it('should advance FOR_TIME progress', async () => {
      const classId = 1;
      const userId = 2;
      const dir = 1;
      const mockResult = { current_step: 3, finished_at: null };

      mockDb.execute.mockResolvedValue({ rows: [mockResult] });

      const result = await liveClassRepository.advanceForTime(classId, userId, dir);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should mark as finished when reaching final step', async () => {
      const classId = 1;
      const userId = 2;
      const dir = 1;
      const mockResult = { current_step: 10, finished_at: new Date('2025-01-15T09:20:00Z') };

      mockDb.execute.mockResolvedValue({ rows: [mockResult] });

      const result = await liveClassRepository.advanceForTime(classId, userId, dir);

      expect(result.finished_at).toBeTruthy();
    });
  });

  describe('setPartialReps', () => {
    it('should set partial reps for user', async () => {
      const classId = 1;
      const userId = 2;
      const reps = 5;

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setPartialReps(classId, userId, reps);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('getWorkoutTypeByClass', () => {
    it('should return workout type by class ID', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [{ type: 'AMRAP' }] });

      const result = await liveClassRepository.getWorkoutTypeByClass(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBe('AMRAP');
    });

    it('should return null when class not found', async () => {
      const classId = 999;
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getWorkoutTypeByClass(classId);

      expect(result).toBeNull();
    });
  });

  describe('realtimeAmrapLeaderboard', () => {
    it('should return realtime AMRAP leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [
        {
          class_id: 1,
          user_id: 1,
          first_name: 'Jason',
          last_name: 'Mayo',
          finished: false,
          elapsed_seconds: null,
          total_reps: 150,
        },
        {
          class_id: 1,
          user_id: 2,
          first_name: 'Jared',
          last_name: 'Hurlimam',
          finished: false,
          elapsed_seconds: null,
          total_reps: 125,
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockLeaderboard });

      const result = await liveClassRepository.realtimeAmrapLeaderboard(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('realtimeForTimeLeaderboard', () => {
    it('should return realtime FOR_TIME leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [
        {
          class_id: 1,
          user_id: 1,
          first_name: 'Vansh',
          last_name: 'Sood',
          finished: true,
          elapsed_seconds: 720,
          total_reps: 100,
        },
        {
          class_id: 1,
          user_id: 2,
          first_name: 'Dennis',
          last_name: 'Woodly',
          finished: false,
          elapsed_seconds: null,
          total_reps: 75,
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockLeaderboard });

      const result = await liveClassRepository.realtimeForTimeLeaderboard(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress for class', async () => {
      const classId = 1;
      const userId = 2;
      const mockProgress = {
        current_step: 5,
        finished_at: null,
        finished_at_s: null,
        dnf_partial_reps: 0,
        rounds_completed: 2,
        elapsed_seconds: null,
        total_reps: 85,
      };

      mockDb.execute.mockResolvedValue({ rows: [mockProgress] });

      const result = await liveClassRepository.getMyProgress(classId, userId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual(mockProgress);
    });

    it('should return default progress when no record found', async () => {
      const classId = 1;
      const userId = 999;

      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getMyProgress(classId, userId);

      expect(result).toEqual({
        current_step: 0,
        finished_at: null,
        finished_at_s: null,
        dnf_partial_reps: 0,
        rounds_completed: 0,
        elapsed_seconds: null,
        total_reps: 0,
      });
    });
  });

  describe('assertMemberBooked', () => {
    it('should not throw when member is booked', async () => {
      const classId = 1;
      const userId = 2;

      mockDb.select.mockReturnValue(builder([{ bookingId: 1 }]));

      await expect(liveClassRepository.assertMemberBooked(classId, userId)).resolves.not.toThrow();
    });

    it('should throw when member is not booked', async () => {
      const classId = 1;
      const userId = 999;

      mockDb.select.mockReturnValue(builder([]));

      await expect(liveClassRepository.assertMemberBooked(classId, userId)).rejects.toThrow('NOT_BOOKED');
    });
  });

  describe('upsertIntervalScore', () => {
    it('should upsert interval score for user', async () => {
      const classId = 1;
      const userId = 2;
      const stepIndex = 0;
      const reps = 15;

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.upsertIntervalScore(classId, userId, stepIndex, reps);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('intervalLeaderboard', () => {
    it('should return interval leaderboard with formatted scores', async () => {
      const classId = 1;
      const mockData = [
        {
          user_id: 1,
          total_reps: 150,
          first_name: 'Amadeus',
          last_name: 'Test',
        },
        {
          user_id: 2,
          total_reps: 120,
          first_name: 'Jason',
          last_name: 'Mayo',
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockData });

      const result = await liveClassRepository.intervalLeaderboard(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toEqual([
        {
          user_id: 1,
          total_reps: 150,
          display_score: '150 reps',
          first_name: 'Amadeus',
          last_name: 'Test',
        },
        {
          user_id: 2,
          total_reps: 120,
          display_score: '120 reps',
          first_name: 'Jason',
          last_name: 'Mayo',
        },
      ]);
    });
  });

  describe('assertCoachOwnsClass', () => {
    it('should not throw when coach owns class', async () => {
      const classId = 1;
      const coachId = 1;

      mockDb.select.mockReturnValue(builder([{ coachId: 1 }]));

      await expect(liveClassRepository.assertCoachOwnsClass(classId, coachId)).resolves.not.toThrow();
    });

    it('should throw when coach does not own class', async () => {
      const classId = 1;
      const coachId = 2;

      mockDb.select.mockReturnValue(builder([{ coachId: 1 }]));

      await expect(liveClassRepository.assertCoachOwnsClass(classId, coachId)).rejects.toThrow('NOT_CLASS_COACH');
    });

    it('should throw when class not found', async () => {
      const classId = 999;
      const coachId = 1;

      mockDb.select.mockReturnValue(builder([]));

      await expect(liveClassRepository.assertCoachOwnsClass(classId, coachId)).rejects.toThrow('NOT_CLASS_COACH');
    });
  });

  describe('upsertScoresBatch', () => {
    it('should update multiple scores and return count', async () => {
      const classId = 1;
      const rows = [
        { userId: 1, score: 250 },
        { userId: 2, score: 200 },
        { userId: 3, score: 180 },
      ];

      mockDb.insert.mockReturnValue(builder());

      const result = await liveClassRepository.upsertScoresBatch(classId, rows);

      expect(mockDb.insert).toHaveBeenCalledTimes(3);
      expect(result).toBe(3);
    });

    it('should skip invalid scores', async () => {
      const classId = 1;
      const rows = [
        { userId: 1, score: 250 },
        { userId: NaN, score: 200 },
        { userId: 3, score: -50 },
        { userId: 4, score: Infinity },
      ];

      mockDb.insert.mockReturnValue(builder());

      const result = await liveClassRepository.upsertScoresBatch(classId, rows);

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });
  });

  describe('upsertMemberScore', () => {
    it('should upsert single member score', async () => {
      const classId = 1;
      const userId = 2;
      const score = 225;

      mockDb.insert.mockReturnValue(builder());

      await liveClassRepository.upsertMemberScore(classId, userId, score);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getCoachNote', () => {
    it('should return coach note when exists', async () => {
      const classId = 1;
      const note = 'Great energy from everyone today!';

      mockDb.execute.mockResolvedValue({ rows: [{ coach_notes: note }] });

      const result = await liveClassRepository.getCoachNote(classId);

      expect(mockDb.execute).toHaveBeenCalled();
      expect(result).toBe(note);
    });

    it('should return null when no note exists', async () => {
      const classId = 1;

      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.getCoachNote(classId);

      expect(result).toBeNull();
    });
  });

  describe('setCoachNote', () => {
    it('should set coach note for class', async () => {
      const classId = 1;
      const text = 'Excellent form on all movements today!';

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setCoachNote(classId, text);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('setForTimeFinish', () => {
    it('should set finish time for FOR_TIME workout', async () => {
      const classId = 1;
      const userId = 2;
      const finishSeconds = 720;
      const startedAt = new Date('2025-01-15T09:00:00Z');

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setForTimeFinish(classId, userId, finishSeconds, startedAt);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should clear finish time when null provided', async () => {
      const classId = 1;
      const userId = 2;
      const finishSeconds = null;
      const startedAt = new Date('2025-01-15T09:00:00Z');

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setForTimeFinish(classId, userId, finishSeconds, startedAt);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('setAmrapProgress', () => {
    it('should set AMRAP progress for user', async () => {
      const classId = 1;
      const userId = 2;
      const rounds = 3;
      const currentStep = 2;
      const partial = 5;

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setAmrapProgress(classId, userId, rounds, currentStep, partial);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should handle negative values by setting to zero', async () => {
      const classId = 1;
      const userId = 2;
      const rounds = -1;
      const currentStep = -5;
      const partial = -10;

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.setAmrapProgress(classId, userId, rounds, currentStep, partial);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('upsertEmomMark', () => {
    it('should upsert EMOM mark for user', async () => {
      const classId = 1;
      const userId = 2;
      const minuteIndex = 0;
      const finished = true;
      const finishSeconds = 45;

      mockDb.execute.mockResolvedValue({ rows: [] });

      await liveClassRepository.upsertEmomMark(classId, userId, minuteIndex, finished, finishSeconds);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle database errors gracefully', async () => {
      const classId = 1;
      mockDb.execute.mockRejectedValue(new Error('Database connection failed'));

      await expect(liveClassRepository.getClassSession(classId)).rejects.toThrow('Database connection failed');
    });

    it('should handle empty results in interval leaderboard', async () => {
      const classId = 1;
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await liveClassRepository.intervalLeaderboard(classId);

      expect(result).toEqual([]);
    });

    it('should handle null total_reps in interval leaderboard', async () => {
      const classId = 1;
      const mockData = [
        {
          user_id: 1,
          total_reps: null,
          first_name: 'Vansh',
          last_name: 'Sood',
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockData });

      const result = await liveClassRepository.intervalLeaderboard(classId);

      expect(result[0].total_reps).toBe(0);
      expect(result[0].display_score).toBe('0 reps');
    });

    it('should handle zero elapsed seconds calculation', async () => {
      const startedAt = new Date('2025-01-15T09:00:00Z');
      const pausedAt = null;
      const pauseAccumSeconds = 0;

      mockDb.execute.mockResolvedValue({ rows: [{ e: 0 }] });

      const result = await liveClassRepository.getElapsedSeconds(startedAt, pausedAt, pauseAccumSeconds);

      expect(result).toBe(0);
    });

    it('should handle complex EMOM leaderboard calculation', async () => {
      const classId = 1;
      const mockLeaderboard = [
        {
          class_id: 1,
          user_id: 1,
          first_name: 'Dennis',
          last_name: 'Woodly',
          finished: true,
          elapsed_seconds: 180.5,
          total_reps: null,
        },
      ];

      mockDb.execute.mockResolvedValue({ rows: mockLeaderboard });

      const result = await liveClassRepository.realtimeEmomLeaderboard(classId);

      expect(result).toEqual(mockLeaderboard);
    });
  });
});
