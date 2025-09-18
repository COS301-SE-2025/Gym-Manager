import { LiveClassService } from '../../../services/liveClass/liveClassService';

describe('LiveClassService', () => {
  let service: LiveClassService;
  let mockRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockRepo = {
      autoEndIfCapReached: jest.fn(),
      getClassSession: jest.fn(),
      getFinalLeaderboard: jest.fn(),
      getLiveClassForCoach: jest.fn(),
      getLiveClassForMember: jest.fn(),
      getFlattenRowsForWorkout: jest.fn(),
      getWorkoutType: jest.fn(),
      assertCoachOwnsClass: jest.fn(),
      upsertScoresBatch: jest.fn(),
      assertMemberBooked: jest.fn(),
      upsertMemberScore: jest.fn(),
      getClassMeta: jest.fn(),
      getWorkoutMetadata: jest.fn(),
      upsertClassSession: jest.fn(),
      seedLiveProgressForClass: jest.fn(),
      resetLiveProgressForClass: jest.fn(),
      stopSession: jest.fn(),
      pauseSession: jest.fn(),
      resumeSession: jest.fn(),
      ensureProgressRow: jest.fn(),
      getAdvanceMeta: jest.fn(),
      getElapsedSeconds: jest.fn(),
      advanceAmrap: jest.fn(),
      advanceForTime: jest.fn(),
      setPartialReps: jest.fn(),
      getWorkoutTypeByClass: jest.fn(),
      realtimeEmomLeaderboard: jest.fn(),
      realtimeIntervalLeaderboard: jest.fn(),
      realtimeAmrapLeaderboard: jest.fn(),
      realtimeForTimeLeaderboard: jest.fn(),
      getMyProgress: jest.fn(),
      getSessionTypeAndSteps: jest.fn(),
      upsertIntervalScore: jest.fn(),
      intervalLeaderboard: jest.fn(),
      upsertEmomMark: jest.fn(),
      getCoachNote: jest.fn(),
      setCoachNote: jest.fn(),
      setForTimeFinish: jest.fn(),
      setAmrapProgress: jest.fn(),
    };

    mockUserRepo = {
      getRolesByUserId: jest.fn(),
    };

    service = new LiveClassService(mockRepo, mockUserRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLiveSession', () => {
    it('should return live session for valid class ID', async () => {
      const classId = 1;
      const mockSession = { classId: 1, status: 'live' };

      mockRepo.autoEndIfCapReached.mockResolvedValue(undefined);
      mockRepo.getClassSession.mockResolvedValue(mockSession);

      const result = await service.getLiveSession(classId);

      expect(mockRepo.autoEndIfCapReached).toHaveBeenCalledWith(classId);
      expect(mockRepo.getClassSession).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockSession);
    });

    it('should throw error for invalid class ID', async () => {
      await expect(service.getLiveSession(NaN)).rejects.toThrow('INVALID_CLASS_ID');
      await expect(service.getLiveSession(Infinity)).rejects.toThrow('INVALID_CLASS_ID');
      await expect(service.getLiveSession(-Infinity)).rejects.toThrow('INVALID_CLASS_ID');
    });
  });

  describe('getFinalLeaderboard', () => {
    it('should return final leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.getFinalLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getFinalLeaderboard(classId);

      expect(mockRepo.getFinalLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('getLiveClassForUser', () => {
    it('should return coach live class when user is coach', async () => {
      const userId = 1;
      const mockCoachClass = { ongoing: true, classId: 1 };

      mockUserRepo.getRolesByUserId.mockResolvedValue(['coach']);
      mockRepo.getLiveClassForCoach.mockResolvedValue(mockCoachClass);

      const result = await service.getLiveClassForUser(userId);

      expect(mockUserRepo.getRolesByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepo.getLiveClassForCoach).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockCoachClass);
    });

    it('should return member live class when user is member', async () => {
      const userId = 1;
      const mockMemberClass = { ongoing: true, classId: 1 };

      mockUserRepo.getRolesByUserId.mockResolvedValue(['member']);
      mockRepo.getLiveClassForCoach.mockResolvedValue(null);
      mockRepo.getLiveClassForMember.mockResolvedValue(mockMemberClass);

      const result = await service.getLiveClassForUser(userId);

      expect(mockRepo.getLiveClassForMember).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockMemberClass);
    });

    it('should return no ongoing class when no live class found', async () => {
      const userId = 1;

      mockUserRepo.getRolesByUserId.mockResolvedValue(['member']);
      mockRepo.getLiveClassForCoach.mockResolvedValue(null);
      mockRepo.getLiveClassForMember.mockResolvedValue(null);

      const result = await service.getLiveClassForUser(userId);

      expect(result).toEqual({ ongoing: false });
    });

    it('should use provided roles when available', async () => {
      const userId = 1;
      const roles = ['coach'];
      const mockCoachClass = { ongoing: true, classId: 1 };

      mockRepo.getLiveClassForCoach.mockResolvedValue(mockCoachClass);

      const result = await service.getLiveClassForUser(userId, roles);

      expect(mockUserRepo.getRolesByUserId).not.toHaveBeenCalled();
      expect(mockRepo.getLiveClassForCoach).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockCoachClass);
    });
  });

  describe('getWorkoutSteps', () => {
    it('should return workout steps with reps', async () => {
      const workoutId = 1;
      const mockRows = [
        { quantity_type: 'reps', quantity: 10, name: 'Burpee', round_number: 1, subround_number: 1, target_reps: 10 },
        { quantity_type: 'reps', quantity: 5, name: 'Push-up', round_number: 1, subround_number: 2, target_reps: 5 },
      ];

      mockRepo.getFlattenRowsForWorkout.mockResolvedValue(mockRows);
      mockRepo.getWorkoutType.mockResolvedValue('AMRAP');

      const result = await service.getWorkoutSteps(workoutId);

      expect(mockRepo.getFlattenRowsForWorkout).toHaveBeenCalledWith(workoutId);
      expect(mockRepo.getWorkoutType).toHaveBeenCalledWith(workoutId);
      expect(result.workoutType).toBe('AMRAP');
      expect(result.steps).toHaveLength(2);
      expect(result.stepsCumReps).toEqual([10, 15]);
      expect(result.steps[0]).toEqual({
        index: 0,
        name: '10x Burpee',
        reps: 10,
        duration: undefined,
        round: 1,
        subround: 1,
        target_reps: 10,
      });
    });

    it('should return workout steps with duration', async () => {
      const workoutId = 1;
      const mockRows = [
        { quantity_type: 'duration', quantity: 30, name: 'Plank', round_number: 1, subround_number: 1, target_reps: null },
      ];

      mockRepo.getFlattenRowsForWorkout.mockResolvedValue(mockRows);
      mockRepo.getWorkoutType.mockResolvedValue('FOR_TIME');

      const result = await service.getWorkoutSteps(workoutId);

      expect(result.steps[0]).toEqual({
        index: 0,
        name: 'Plank 30s',
        reps: undefined,
        duration: 30,
        round: 1,
        subround: 1,
        target_reps: undefined,
      });
      expect(result.stepsCumReps).toEqual([0]);
    });

    it('should throw error for invalid workout ID', async () => {
      await expect(service.getWorkoutSteps(0)).rejects.toThrow('INVALID_WORKOUT_ID');
      await expect(service.getWorkoutSteps(-1)).rejects.toThrow('INVALID_WORKOUT_ID');
      await expect(service.getWorkoutSteps(NaN)).rejects.toThrow('INVALID_WORKOUT_ID');
    });
  });

  describe('submitScore', () => {
    it('should submit coach batch scores', async () => {
      const userId = 1;
      const roles = ['coach'];
      const body = {
        classId: 1,
        scores: [{ memberId: 1, score: 100 }],
      };

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.upsertScoresBatch.mockResolvedValue(1);

      const result = await service.submitScore(userId, roles, body);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(1, userId);
      expect(mockRepo.upsertScoresBatch).toHaveBeenCalledWith(1, body.scores);
      expect(result).toEqual({ success: true, updated: 1 });
    });

    it('should submit member single score', async () => {
      const userId = 1;
      const roles = ['member'];
      const body = {
        classId: 1,
        score: 100,
      };

      mockRepo.assertMemberBooked.mockResolvedValue(undefined);
      mockRepo.upsertMemberScore.mockResolvedValue(undefined);

      const result = await service.submitScore(userId, roles, body);

      expect(mockRepo.assertMemberBooked).toHaveBeenCalledWith(1, userId);
      expect(mockRepo.upsertMemberScore).toHaveBeenCalledWith(1, userId, 100);
      expect(result).toEqual({ success: true });
    });

    it('should throw error for invalid class ID', async () => {
      const userId = 1;
      const roles = ['member'];
      const body = { classId: 'invalid' };

      await expect(service.submitScore(userId, roles, body)).rejects.toThrow('CLASS_ID_REQUIRED');
    });

    it('should throw error for invalid score', async () => {
      const userId = 1;
      const roles = ['member'];
      const body = { classId: 1, score: -1 };

      await expect(service.submitScore(userId, roles, body)).rejects.toThrow('SCORE_REQUIRED');
    });

    it('should throw error for non-member role', async () => {
      const userId = 1;
      const roles = ['admin'];
      const body = { classId: 1, score: 100 };

      await expect(service.submitScore(userId, roles, body)).rejects.toThrow('ROLE_NOT_ALLOWED');
    });
  });

  describe('startLiveClass', () => {
    it('should start live class successfully', async () => {
      const classId = 1;
      const mockClassMeta = {
        workout_id: 1,
        duration_minutes: 30,
      };
      const mockSession = { classId: 1, status: 'live' };

      mockRepo.getClassMeta.mockResolvedValue(mockClassMeta);
      mockRepo.getFlattenRowsForWorkout.mockResolvedValue([]);
      mockRepo.getWorkoutType.mockResolvedValue('FOR_TIME');
      mockRepo.getWorkoutMetadata.mockResolvedValue({});
      mockRepo.upsertClassSession.mockResolvedValue(undefined);
      mockRepo.seedLiveProgressForClass.mockResolvedValue(undefined);
      mockRepo.resetLiveProgressForClass.mockResolvedValue(undefined);
      mockRepo.getClassSession.mockResolvedValue(mockSession);

      const result = await service.startLiveClass(classId);

      expect(mockRepo.getClassMeta).toHaveBeenCalledWith(classId);
      expect(mockRepo.upsertClassSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should throw error if class not found', async () => {
      const classId = 1;

      mockRepo.getClassMeta.mockResolvedValue(null);

      await expect(service.startLiveClass(classId)).rejects.toThrow('CLASS_NOT_FOUND');
    });

    it('should throw error if workout not assigned', async () => {
      const classId = 1;
      const mockClassMeta = { workout_id: null };

      mockRepo.getClassMeta.mockResolvedValue(mockClassMeta);

      await expect(service.startLiveClass(classId)).rejects.toThrow('WORKOUT_NOT_ASSIGNED');
    });
  });

  describe('session controls', () => {
    it('should stop live class', async () => {
      const classId = 1;

      mockRepo.stopSession.mockResolvedValue(undefined);

      await service.stopLiveClass(classId);

      expect(mockRepo.stopSession).toHaveBeenCalledWith(classId);
    });

    it('should pause live class', async () => {
      const classId = 1;

      mockRepo.pauseSession.mockResolvedValue(undefined);

      await service.pauseLiveClass(classId);

      expect(mockRepo.pauseSession).toHaveBeenCalledWith(classId);
    });

    it('should resume live class', async () => {
      const classId = 1;

      mockRepo.resumeSession.mockResolvedValue(undefined);

      await service.resumeLiveClass(classId);

      expect(mockRepo.resumeSession).toHaveBeenCalledWith(classId);
    });
  });

  describe('advanceProgress', () => {
    it('should advance AMRAP progress', async () => {
      const classId = 1;
      const userId = 1;
      const direction = 'next' as const;

      const mockMeta = {
        status: 'live',
        started_at: new Date(),
        paused_at: null,
        pause_accum_seconds: 0,
        time_cap_seconds: 1800,
        step_count: 5,
        workout_type: 'AMRAP',
      };

      const mockRow = { current_step: 2, finished_at: null };

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.getAdvanceMeta.mockResolvedValue(mockMeta);
      mockRepo.getElapsedSeconds.mockResolvedValue(100);
      mockRepo.advanceAmrap.mockResolvedValue(mockRow);

      const result = await service.advanceProgress(classId, userId, direction);

      expect(mockRepo.ensureProgressRow).toHaveBeenCalledWith(classId, userId);
      expect(mockRepo.advanceAmrap).toHaveBeenCalledWith(classId, userId, 5, 1);
      expect(result).toEqual({ ok: true, current_step: 2, finished: false });
    });

    it('should advance FOR_TIME progress', async () => {
      const classId = 1;
      const userId = 1;
      const direction = 'next' as const;

      const mockMeta = {
        status: 'live',
        started_at: new Date(),
        paused_at: null,
        pause_accum_seconds: 0,
        time_cap_seconds: 1800,
        step_count: 5,
        workout_type: 'FOR_TIME',
      };

      const mockRow = { current_step: 3, finished_at: new Date() };

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.getAdvanceMeta.mockResolvedValue(mockMeta);
      mockRepo.getElapsedSeconds.mockResolvedValue(100);
      mockRepo.advanceForTime.mockResolvedValue(mockRow);

      const result = await service.advanceProgress(classId, userId, direction);

      expect(mockRepo.advanceForTime).toHaveBeenCalledWith(classId, userId, 1);
      expect(result).toEqual({ ok: true, current_step: 3, finished: true });
    });

    it('should throw error if session not started', async () => {
      const classId = 1;
      const userId = 1;

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.getAdvanceMeta.mockResolvedValue(null);

      await expect(service.advanceProgress(classId, userId, 'next')).rejects.toThrow('CLASS_SESSION_NOT_STARTED');
    });

    it('should throw error if not live', async () => {
      const classId = 1;
      const userId = 1;

      const mockMeta = { status: 'paused' };

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.getAdvanceMeta.mockResolvedValue(mockMeta);

      await expect(service.advanceProgress(classId, userId, 'next')).rejects.toThrow('NOT_LIVE');
    });

    it('should throw error if time up', async () => {
      const classId = 1;
      const userId = 1;

      const mockMeta = {
        status: 'live',
        started_at: new Date(),
        paused_at: null,
        pause_accum_seconds: 0,
        time_cap_seconds: 100,
        step_count: 5,
        workout_type: 'FOR_TIME',
      };

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.getAdvanceMeta.mockResolvedValue(mockMeta);
      mockRepo.getElapsedSeconds.mockResolvedValue(120);
      mockRepo.stopSession.mockResolvedValue(undefined);

      await expect(service.advanceProgress(classId, userId, 'next')).rejects.toThrow('TIME_UP');
    });
  });

  describe('submitPartial', () => {
    it('should submit partial reps', async () => {
      const classId = 1;
      const userId = 1;
      const reps = 5;

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.setPartialReps.mockResolvedValue(undefined);

      const result = await service.submitPartial(classId, userId, reps);

      expect(mockRepo.ensureProgressRow).toHaveBeenCalledWith(classId, userId);
      expect(mockRepo.setPartialReps).toHaveBeenCalledWith(classId, userId, 5);
      expect(result).toEqual({ ok: true, reps: 5 });
    });

    it('should handle negative reps', async () => {
      const classId = 1;
      const userId = 1;
      const reps = -5;

      mockRepo.ensureProgressRow.mockResolvedValue(undefined);
      mockRepo.setPartialReps.mockResolvedValue(undefined);

      const result = await service.submitPartial(classId, userId, reps);

      expect(mockRepo.setPartialReps).toHaveBeenCalledWith(classId, userId, 0);
      expect(result).toEqual({ ok: true, reps: 0 });
    });
  });

  describe('getRealtimeLeaderboard', () => {
    it('should return EMOM leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.getWorkoutTypeByClass.mockResolvedValue('EMOM');
      mockRepo.realtimeEmomLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getRealtimeLeaderboard(classId);

      expect(mockRepo.getWorkoutTypeByClass).toHaveBeenCalledWith(classId);
      expect(mockRepo.realtimeEmomLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return INTERVAL leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.getWorkoutTypeByClass.mockResolvedValue('INTERVAL');
      mockRepo.realtimeIntervalLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getRealtimeLeaderboard(classId);

      expect(mockRepo.realtimeIntervalLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return AMRAP leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.getWorkoutTypeByClass.mockResolvedValue('AMRAP');
      mockRepo.realtimeAmrapLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getRealtimeLeaderboard(classId);

      expect(mockRepo.realtimeAmrapLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should return FOR_TIME leaderboard by default', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.getWorkoutTypeByClass.mockResolvedValue('FOR_TIME');
      mockRepo.realtimeForTimeLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getRealtimeLeaderboard(classId);

      expect(mockRepo.realtimeForTimeLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should throw error if workout not found', async () => {
      const classId = 1;

      mockRepo.getWorkoutTypeByClass.mockResolvedValue(null);

      await expect(service.getRealtimeLeaderboard(classId)).rejects.toThrow('WORKOUT_NOT_FOUND_FOR_CLASS');
    });
  });

  describe('getMyProgress', () => {
    it('should return member progress', async () => {
      const classId = 1;
      const userId = 1;
      const mockProgress = { current_step: 2, finished: false };

      mockRepo.getMyProgress.mockResolvedValue(mockProgress);

      const result = await service.getMyProgress(classId, userId);

      expect(mockRepo.getMyProgress).toHaveBeenCalledWith(classId, userId);
      expect(result).toEqual(mockProgress);
    });
  });

  describe('postIntervalScore', () => {
    it('should post interval score', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = 0;
      const reps = 10;

      const mockSession = {
        type: 'INTERVAL',
        steps: [{ name: 'Burpee' }],
      };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);
      mockRepo.assertMemberBooked.mockResolvedValue(undefined);
      mockRepo.upsertIntervalScore.mockResolvedValue(undefined);

      await service.postIntervalScore(classId, userId, stepIndex, reps);

      expect(mockRepo.getSessionTypeAndSteps).toHaveBeenCalledWith(classId);
      expect(mockRepo.assertMemberBooked).toHaveBeenCalledWith(classId, userId);
      expect(mockRepo.upsertIntervalScore).toHaveBeenCalledWith(classId, userId, stepIndex, 10);
    });

    it('should throw error for invalid step index', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = -1;
      const reps = 10;

      await expect(service.postIntervalScore(classId, userId, stepIndex, reps)).rejects.toThrow('INVALID_STEP_INDEX');
    });

    it('should throw error if session not found', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = 0;
      const reps = 10;

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(null);

      await expect(service.postIntervalScore(classId, userId, stepIndex, reps)).rejects.toThrow('SESSION_NOT_FOUND');
    });

    it('should throw error for non-interval workout', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = 0;
      const reps = 10;

      const mockSession = { type: 'FOR_TIME', steps: [] };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);

      await expect(service.postIntervalScore(classId, userId, stepIndex, reps)).rejects.toThrow('NOT_INTERVAL_WORKOUT');
    });

    it('should throw error for step index out of range', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = 5;
      const reps = 10;

      const mockSession = {
        type: 'INTERVAL',
        steps: [{ name: 'Burpee' }],
      };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);

      await expect(service.postIntervalScore(classId, userId, stepIndex, reps)).rejects.toThrow('STEP_INDEX_OUT_OF_RANGE');
    });
  });

  describe('getIntervalLeaderboard', () => {
    it('should return interval leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [{ memberId: 1, score: 100 }];

      mockRepo.intervalLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await service.getIntervalLeaderboard(classId);

      expect(mockRepo.intervalLeaderboard).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockLeaderboard);
    });
  });

  describe('postEmomMark', () => {
    it('should post EMOM mark', async () => {
      const classId = 1;
      const userId = 1;
      const payload = {
        minuteIndex: 1,
        finished: true,
        finishSeconds: 30,
        exercisesCompleted: 5,
        exercisesTotal: 5,
      };

      const mockSession = { type: 'EMOM', steps: [] };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);
      mockRepo.assertMemberBooked.mockResolvedValue(undefined);
      mockRepo.upsertEmomMark.mockResolvedValue(undefined);

      await service.postEmomMark(classId, userId, payload);

      expect(mockRepo.getSessionTypeAndSteps).toHaveBeenCalledWith(classId);
      expect(mockRepo.assertMemberBooked).toHaveBeenCalledWith(classId, userId);
      expect(mockRepo.upsertEmomMark).toHaveBeenCalledWith(classId, userId, 1, true, 30);
    });

    it('should throw error if session not found', async () => {
      const classId = 1;
      const userId = 1;
      const payload = { minuteIndex: 1, finished: true, finishSeconds: 30 };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(null);

      await expect(service.postEmomMark(classId, userId, payload)).rejects.toThrow('SESSION_NOT_FOUND');
    });

    it('should throw error for non-EMOM workout', async () => {
      const classId = 1;
      const userId = 1;
      const payload = { minuteIndex: 1, finished: true, finishSeconds: 30 };

      const mockSession = { type: 'FOR_TIME', steps: [] };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);

      await expect(service.postEmomMark(classId, userId, payload)).rejects.toThrow('NOT_EMOM_WORKOUT');
    });

    it('should handle default finish seconds', async () => {
      const classId = 1;
      const userId = 1;
      const payload = { minuteIndex: 1, finished: false, finishSeconds: null };

      const mockSession = { type: 'EMOM', steps: [] };

      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);
      mockRepo.assertMemberBooked.mockResolvedValue(undefined);
      mockRepo.upsertEmomMark.mockResolvedValue(undefined);

      await service.postEmomMark(classId, userId, payload);

      expect(mockRepo.upsertEmomMark).toHaveBeenCalledWith(classId, userId, 1, false, 60);
    });
  });

  describe('coach note operations', () => {
    it('should get coach note', async () => {
      const classId = 1;
      const mockNote = { text: 'Great workout!' };

      mockRepo.getCoachNote.mockResolvedValue(mockNote);

      const result = await service.getCoachNote(classId);

      expect(mockRepo.getCoachNote).toHaveBeenCalledWith(classId);
      expect(result).toEqual(mockNote);
    });

    it('should set coach note', async () => {
      const classId = 1;
      const coachId = 1;
      const text = 'Great workout!';

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.setCoachNote.mockResolvedValue(undefined);

      await service.setCoachNote(classId, coachId, text);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(classId, coachId);
      expect(mockRepo.setCoachNote).toHaveBeenCalledWith(classId, text);
    });
  });

  describe('coach edit operations', () => {
    it('should set FOR_TIME finish', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 1;
      const finishSeconds = 300;

      const mockSession = { started_at: new Date() };

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.getClassSession.mockResolvedValue(mockSession);
      mockRepo.setForTimeFinish.mockResolvedValue(undefined);

      await service.coachSetForTimeFinish(classId, coachId, userId, finishSeconds);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(classId, coachId);
      expect(mockRepo.setForTimeFinish).toHaveBeenCalledWith(classId, userId, finishSeconds, mockSession.started_at);
    });

    it('should set AMRAP total', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 1;
      const totalReps = 100;

      const mockSession = {
        steps_cum_reps: [10, 20, 30],
      };

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.getClassSession.mockResolvedValue(mockSession);
      mockRepo.setAmrapProgress.mockResolvedValue(undefined);

      await service.coachSetAmrapTotal(classId, coachId, userId, totalReps);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(classId, coachId);
      expect(mockRepo.setAmrapProgress).toHaveBeenCalledWith(classId, userId, 3, 1, 0);
    });

    it('should post interval score as coach', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 1;
      const stepIndex = 0;
      const reps = 10;

      const mockSession = {
        steps: [{ name: 'Burpee' }],
      };

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.getSessionTypeAndSteps.mockResolvedValue(mockSession);
      mockRepo.upsertIntervalScore.mockResolvedValue(undefined);

      await service.coachPostIntervalScore(classId, coachId, userId, stepIndex, reps);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(classId, coachId);
      expect(mockRepo.upsertIntervalScore).toHaveBeenCalledWith(classId, userId, stepIndex, 10);
    });

    it('should post EMOM mark as coach', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 1;
      const minuteIndex = 1;
      const finished = true;
      const finishSeconds = 30;

      mockRepo.assertCoachOwnsClass.mockResolvedValue(undefined);
      mockRepo.upsertEmomMark.mockResolvedValue(undefined);

      await service.coachPostEmomMark(classId, coachId, userId, minuteIndex, finished, finishSeconds);

      expect(mockRepo.assertCoachOwnsClass).toHaveBeenCalledWith(classId, coachId);
      expect(mockRepo.upsertEmomMark).toHaveBeenCalledWith(classId, userId, minuteIndex, finished, 30);
    });
  });
});
