import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../infrastructure/middleware/authMiddleware';
import { LiveClassController } from '../../../controllers/liveClass/liveClassController';
import { LiveClassService } from '../../../services/liveClass/liveClassService';

// Mock the LiveClassService
jest.mock('../../../services/liveClass/liveClassService');

describe('LiveClassController', () => {
  let controller: LiveClassController;
  let mockService: jest.Mocked<LiveClassService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getLiveSession: jest.fn(),
      getFinalLeaderboard: jest.fn(),
      getLiveClassForUser: jest.fn(),
      getWorkoutSteps: jest.fn(),
      submitScore: jest.fn(),
      startLiveClass: jest.fn(),
      stopLiveClass: jest.fn(),
      pauseLiveClass: jest.fn(),
      resumeLiveClass: jest.fn(),
      advanceProgress: jest.fn(),
      submitPartial: jest.fn(),
      getRealtimeLeaderboard: jest.fn(),
      getMyProgress: jest.fn(),
      postIntervalScore: jest.fn(),
      getIntervalLeaderboard: jest.fn(),
      postEmomMark: jest.fn(),
      getCoachNote: jest.fn(),
      setCoachNote: jest.fn(),
      coachSetForTimeFinish: jest.fn(),
      coachSetAmrapTotal: jest.fn(),
      coachPostIntervalScore: jest.fn(),
      coachPostEmomMark: jest.fn(),
    } as any;

    // Create controller with mocked service
    controller = new LiveClassController(mockService);

    // Create mock request and response objects
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 1, roles: ['member'] },
    } as Partial<AuthenticatedRequest>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getLiveSession', () => {
    it('should return live session for valid class ID', async () => {
      const classId = 1;
      const mockSession = {
        class_id: 1,
        workout_id: 1,
        status: 'live' as const,
        time_cap_seconds: 600,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        paused_at: null,
        pause_accum_seconds: 0,
        started_at_s: 1704110400,
        ended_at_s: null,
        paused_at_s: null,
        steps: [],
        steps_cum_reps: [],
        workout_type: 'AMRAP',
      };

      mockRequest.params = { classId: classId.toString() };
      mockService.getLiveSession.mockResolvedValue(mockSession);

      await controller.getLiveSession(mockRequest as Request, mockResponse as Response);

      expect(mockService.getLiveSession).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSession);
    });

    it('should return 404 when session not found', async () => {
      const classId = 1;

      mockRequest.params = { classId: classId.toString() };
      mockService.getLiveSession.mockResolvedValue(null);

      await controller.getLiveSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NO_SESSION' });
    });

    it('should handle invalid class ID error', async () => {
      mockRequest.params = { classId: 'invalid' };
      mockService.getLiveSession.mockRejectedValue(new Error('INVALID_CLASS_ID'));

      await controller.getLiveSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'INVALID_CLASS_ID' });
    });

    it('should handle generic errors', async () => {
      const classId = 1;

      mockRequest.params = { classId: classId.toString() };
      mockService.getLiveSession.mockRejectedValue(new Error('Database error'));

      await controller.getLiveSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'SESSION_FETCH_FAILED' });
    });
  });

  describe('getLeaderboard', () => {
    it('should return final leaderboard', async () => {
      const classId = 1;
      const mockLeaderboard = [
        { memberId: 1, name: 'John Doe', score: 100, rank: 1 },
      ];

      mockRequest.params = { classId: classId.toString() };
      mockService.getFinalLeaderboard.mockResolvedValue(mockLeaderboard);

      await controller.getLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockService.getFinalLeaderboard).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockLeaderboard);
    });

    it('should handle service errors', async () => {
      const classId = 1;

      mockRequest.params = { classId: classId.toString() };
      mockService.getFinalLeaderboard.mockRejectedValue(new Error('Service error'));

      await controller.getLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to get leaderboard' });
    });
  });

  describe('getLiveClass', () => {
    it('should return live class for authenticated user', async () => {
      const mockLiveClass = { ongoing: true, classId: 1 };

      mockService.getLiveClassForUser.mockResolvedValue(mockLiveClass);

      await controller.getLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.getLiveClassForUser).toHaveBeenCalledWith(1, ['member']);
      expect(mockResponse.json).toHaveBeenCalledWith(mockLiveClass);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: false, error: 'UNAUTHORIZED' });
    });

    it('should handle service errors', async () => {
      mockService.getLiveClassForUser.mockRejectedValue(new Error('Service error'));

      await controller.getLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LIVE_CLASS_FAILED' });
    });
  });

  describe('getWorkoutSteps', () => {
    it('should return workout steps for valid workout ID', async () => {
      const workoutId = 1;
      const mockSteps = {
        workoutType: 'AMRAP',
        steps: [
          { index: 0, name: '10x Burpee', reps: 10, round: 1, subround: 1 },
        ],
        stepsCumReps: [10],
        metadata: { time_limit: 20, number_of_rounds: 3 },
      };

      mockRequest.params = { workoutId: workoutId.toString() };
      mockService.getWorkoutSteps.mockResolvedValue(mockSteps);

      await controller.getWorkoutSteps(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.getWorkoutSteps).toHaveBeenCalledWith(workoutId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSteps);
    });

    it('should handle invalid workout ID error', async () => {
      mockRequest.params = { workoutId: 'invalid' };
      mockService.getWorkoutSteps.mockRejectedValue(new Error('INVALID_WORKOUT_ID'));

      await controller.getWorkoutSteps(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'INVALID_WORKOUT_ID' });
    });

    it('should handle generic errors', async () => {
      const workoutId = 1;

      mockRequest.params = { workoutId: workoutId.toString() };
      mockService.getWorkoutSteps.mockRejectedValue(new Error('Service error'));

      await controller.getWorkoutSteps(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'WORKOUT_STEPS_FAILED' });
    });
  });

  describe('submitScore', () => {
    it('should submit score successfully', async () => {
      const scoreData = {
        classId: 1,
        score: 100,
      };

      const expectedResult = { success: true };

      mockRequest.body = scoreData;
      mockService.submitScore.mockResolvedValue(expectedResult);

      await controller.submitScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.submitScore).toHaveBeenCalledWith(1, ['member'], scoreData);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { classId: 1, score: 100 };

      await controller.submitScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: false, error: 'UNAUTHORIZED' });
    });

    it('should handle service errors', async () => {
      const scoreData = { classId: 1, score: 100 };

      mockRequest.body = scoreData;
      mockService.submitScore.mockRejectedValue(new Error('Service error'));

      await controller.submitScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: false, error: 'SUBMIT_SCORE_FAILED' });
    });
  });

  describe('startLiveClass', () => {
    it('should start live class successfully', async () => {
      const classId = 1;
      const mockSession = {
        class_id: 1,
        workout_id: 1,
        status: 'live' as const,
        time_cap_seconds: 600,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        paused_at: null,
        pause_accum_seconds: 0,
        started_at_s: 1704110400,
        ended_at_s: null,
        paused_at_s: null,
        steps: [],
        steps_cum_reps: [],
        workout_type: 'AMRAP',
      };

      mockRequest.params = { classId: classId.toString() };
      mockService.startLiveClass.mockResolvedValue(mockSession);

      await controller.startLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.startLiveClass).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, session: mockSession });
    });

    it('should start live class even when user is not authenticated (no auth check)', async () => {
      const classId = 1;
      const mockSession = {
        class_id: 1,
        workout_id: 1,
        status: 'live' as const,
        time_cap_seconds: 600,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        paused_at: null,
        pause_accum_seconds: 0,
        started_at_s: 1704110400,
        ended_at_s: null,
        paused_at_s: null,
        steps: [],
        steps_cum_reps: [],
        workout_type: 'AMRAP' as const,
      };

      mockRequest.user = undefined; // No authentication
      mockRequest.params = { classId: classId.toString() };
      mockService.startLiveClass.mockResolvedValue(mockSession);

      await controller.startLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.startLiveClass).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, session: mockSession });
    });

    it('should handle service errors', async () => {
      const classId = 1;

      mockRequest.params = { classId: classId.toString() };
      mockService.startLiveClass.mockRejectedValue(new Error('Service error'));

      await controller.startLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'START_LIVE_FAILED' });
    });
  });

  describe('stopLiveClass', () => {
    it('should stop live class successfully', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.stopLiveClass.mockResolvedValue(undefined);

      await controller.stopLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.stopLiveClass).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, classId });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.stopLiveClass.mockRejectedValue(new Error('Service error'));

      await controller.stopLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'STOP_LIVE_FAILED' });
    });
  });

  describe('pauseLiveClass', () => {
    it('should pause live class successfully', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.pauseLiveClass.mockResolvedValue(undefined);

      await controller.pauseLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.pauseLiveClass).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, classId });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.pauseLiveClass.mockRejectedValue(new Error('Service error'));

      await controller.pauseLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'PAUSE_LIVE_FAILED' });
    });
  });

  describe('resumeLiveClass', () => {
    it('should resume live class successfully', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.resumeLiveClass.mockResolvedValue(undefined);

      await controller.resumeLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.resumeLiveClass).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, classId });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.resumeLiveClass.mockRejectedValue(new Error('Service error'));

      await controller.resumeLiveClass(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'RESUME_LIVE_FAILED' });
    });
  });

  describe('advanceProgress', () => {
    it('should advance progress successfully', async () => {
      const classId = 1;
      const userId = 1;
      const direction = 'next';
      const expectedResult = { ok: true, current_step: 2, finished: false };

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { direction };
      mockService.advanceProgress.mockResolvedValue(expectedResult);

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.advanceProgress).toHaveBeenCalledWith(classId, userId, direction);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should advance progress with prev direction', async () => {
      const classId = 1;
      const userId = 1;
      const direction = 'prev';
      const expectedResult = { ok: true, current_step: 1, finished: false };

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { direction };
      mockService.advanceProgress.mockResolvedValue(expectedResult);

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.advanceProgress).toHaveBeenCalledWith(classId, userId, direction);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('should handle class session not started error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { direction: 'next' };
      mockService.advanceProgress.mockRejectedValue(new Error('CLASS_SESSION_NOT_STARTED'));

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'CLASS_SESSION_NOT_STARTED', ended: false });
    });

    it('should handle time up error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { direction: 'next' };
      mockService.advanceProgress.mockRejectedValue(new Error('TIME_UP'));

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'TIME_UP', ended: true });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { direction: 'next' };
      mockService.advanceProgress.mockRejectedValue(new Error('Database error'));

      await controller.advanceProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'ADVANCE_FAILED' });
    });
  });

  describe('submitPartial', () => {
    it('should submit partial score successfully', async () => {
      const classId = 1;
      const userId = 1;
      const reps = 10;
      const expectedResult = { ok: true, reps: 25 };

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { reps };
      mockService.submitPartial.mockResolvedValue(expectedResult);

      await controller.submitPartial(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.submitPartial).toHaveBeenCalledWith(classId, userId, reps);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.submitPartial(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { reps: 10 };
      mockService.submitPartial.mockRejectedValue(new Error('Database error'));

      await controller.submitPartial(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'PARTIAL_FAILED' });
    });
  });

  describe('getRealtimeLeaderboard', () => {
    it('should get realtime leaderboard successfully', async () => {
      const classId = 1;
      const expectedLeaderboard = [
        { userId: 1, score: 100, rank: 1 },
        { userId: 2, score: 90, rank: 2 },
      ];

      mockRequest.params = { classId: classId.toString() };
      mockService.getRealtimeLeaderboard.mockResolvedValue(expectedLeaderboard);

      await controller.getRealtimeLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockService.getRealtimeLeaderboard).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedLeaderboard);
    });

    it('should handle workout not found error', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.getRealtimeLeaderboard.mockRejectedValue(new Error('WORKOUT_NOT_FOUND_FOR_CLASS'));

      await controller.getRealtimeLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'WORKOUT_NOT_FOUND_FOR_CLASS' });
    });

    it('should handle database connection reset error', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.getRealtimeLeaderboard.mockRejectedValue(new Error('DB_CONNECTION_RESET'));

      await controller.getRealtimeLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'DB_CONNECTION_RESET' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.getRealtimeLeaderboard.mockRejectedValue(new Error('Database error'));

      await controller.getRealtimeLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LEADERBOARD_FAILED' });
    });
  });

  describe('getMyProgress', () => {
    it('should get my progress successfully', async () => {
      const classId = 1;
      const userId = 1;
      const expectedProgress = { currentStep: 3, totalSteps: 5, completed: false };

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockService.getMyProgress.mockResolvedValue(expectedProgress);

      await controller.getMyProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.getMyProgress).toHaveBeenCalledWith(classId, userId);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedProgress);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getMyProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockService.getMyProgress.mockRejectedValue(new Error('Database error'));

      await controller.getMyProgress(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'MY_PROGRESS_FAILED' });
    });
  });

  describe('postIntervalScore', () => {
    it('should post interval score successfully', async () => {
      const classId = 1;
      const userId = 1;
      const stepIndex = 2;
      const reps = 15;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { stepIndex, reps };
      mockService.postIntervalScore.mockResolvedValue(undefined);

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.postIntervalScore).toHaveBeenCalledWith(classId, userId, stepIndex, reps);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('should handle invalid step index error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { stepIndex: -1, reps: 10 };
      mockService.postIntervalScore.mockRejectedValue(new Error('INVALID_STEP_INDEX'));

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'INVALID_STEP_INDEX' });
    });

    it('should handle not booked error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { stepIndex: 1, reps: 10 };
      mockService.postIntervalScore.mockRejectedValue(new Error('NOT_BOOKED'));

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_BOOKED' });
    });

    it('should handle session not found error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { stepIndex: 1, reps: 10 };
      mockService.postIntervalScore.mockRejectedValue(new Error('SESSION_NOT_FOUND'));

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'SESSION_NOT_FOUND' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { stepIndex: 1, reps: 10 };
      mockService.postIntervalScore.mockRejectedValue(new Error('Database error'));

      await controller.postIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getIntervalLeaderboard', () => {
    it('should get interval leaderboard successfully', async () => {
      const classId = 1;
      const expectedLeaderboard = [
        { userId: 1, stepIndex: 1, reps: 20 },
        { userId: 2, stepIndex: 1, reps: 18 },
      ];

      mockRequest.params = { classId: classId.toString() };
      mockService.getIntervalLeaderboard.mockResolvedValue(expectedLeaderboard);

      await controller.getIntervalLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockService.getIntervalLeaderboard).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedLeaderboard);
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.getIntervalLeaderboard.mockRejectedValue(new Error('Database error'));

      await controller.getIntervalLeaderboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'INTERVAL_LEADERBOARD_FAILED' });
    });
  });

  describe('postEmomMark', () => {
    it('should post EMOM mark successfully', async () => {
      const classId = 1;
      const userId = 1;
      const minuteIndex = 3;
      const finished = true;
      const finishSeconds = 45;
      const exercisesCompleted = 8;
      const exercisesTotal = 10;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { 
        minuteIndex, 
        finished, 
        finishSeconds, 
        exercisesCompleted, 
        exercisesTotal 
      };
      mockService.postEmomMark.mockResolvedValue(undefined);

      await controller.postEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.postEmomMark).toHaveBeenCalledWith(
        classId, 
        userId, 
        { minuteIndex, finished, finishSeconds, exercisesCompleted, exercisesTotal }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.postEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('should handle session not found error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { minuteIndex: 1, finished: false };
      mockService.postEmomMark.mockRejectedValue(new Error('SESSION_NOT_FOUND'));

      await controller.postEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'SESSION_NOT_FOUND' });
    });

    it('should handle not booked error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { minuteIndex: 1, finished: false };
      mockService.postEmomMark.mockRejectedValue(new Error('NOT_BOOKED'));

      await controller.postEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_BOOKED' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { minuteIndex: 1, finished: false };
      mockService.postEmomMark.mockRejectedValue(new Error('Database error'));

      await controller.postEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getCoachNote', () => {
    it('should get coach note successfully', async () => {
      const classId = 1;
      const expectedNote = 'Great workout today!';

      mockRequest.params = { classId: classId.toString() };
      (mockService.getCoachNote as jest.Mock).mockResolvedValue(expectedNote);

      await controller.getCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.getCoachNote).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ note: expectedNote });
    });

    it('should return empty note when no note exists', async () => {
      const classId = 1;

      mockRequest.params = { classId: classId.toString() };
      (mockService.getCoachNote as jest.Mock).mockResolvedValue(null);

      await controller.getCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.getCoachNote).toHaveBeenCalledWith(classId);
      expect(mockResponse.json).toHaveBeenCalledWith({ note: '' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockService.getCoachNote.mockRejectedValue(new Error('Database error'));

      await controller.getCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'COACH_NOTE_FETCH_FAILED' });
    });
  });

  describe('setCoachNote', () => {
    it('should set coach note successfully', async () => {
      const classId = 1;
      const userId = 1;
      const noteText = 'Keep up the great work!';

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['coach'] };
      mockRequest.body = { note: noteText };
      mockService.setCoachNote.mockResolvedValue(undefined);

      await controller.setCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.setCoachNote).toHaveBeenCalledWith(classId, userId, noteText);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true, note: noteText });
    });

    it('should handle not class coach error', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['member'] };
      mockRequest.body = { note: 'Test note' };
      mockService.setCoachNote.mockRejectedValue(new Error('NOT_CLASS_COACH'));

      await controller.setCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_CLASS_COACH' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const userId = 1;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId, roles: ['coach'] };
      mockRequest.body = { note: 'Test note' };
      mockService.setCoachNote.mockRejectedValue(new Error('Database error'));

      await controller.setCoachNote(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'COACH_NOTE_SAVE_FAILED' });
    });
  });

  describe('coachSetForTimeFinish', () => {
    it('should set for time finish successfully', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      const finishSeconds = 300;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, finishSeconds };
      mockService.coachSetForTimeFinish.mockResolvedValue(undefined);

      await controller.coachSetForTimeFinish(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.coachSetForTimeFinish).toHaveBeenCalledWith(classId, coachId, userId, finishSeconds);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should handle not class coach error', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['member'] };
      mockRequest.body = { userId, finishSeconds: 300 };
      mockService.coachSetForTimeFinish.mockRejectedValue(new Error('NOT_CLASS_COACH'));

      await controller.coachSetForTimeFinish(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_CLASS_COACH' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, finishSeconds: 300 };
      mockService.coachSetForTimeFinish.mockRejectedValue(new Error('Database error'));

      await controller.coachSetForTimeFinish(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('coachSetAmrapTotal', () => {
    it('should set AMRAP total successfully', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      const totalReps = 150;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, totalReps };
      mockService.coachSetAmrapTotal.mockResolvedValue(undefined);

      await controller.coachSetAmrapTotal(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.coachSetAmrapTotal).toHaveBeenCalledWith(classId, coachId, userId, totalReps);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should handle not class coach error', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['member'] };
      mockRequest.body = { userId, totalReps: 150 };
      mockService.coachSetAmrapTotal.mockRejectedValue(new Error('NOT_CLASS_COACH'));

      await controller.coachSetAmrapTotal(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_CLASS_COACH' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, totalReps: 150 };
      mockService.coachSetAmrapTotal.mockRejectedValue(new Error('Database error'));

      await controller.coachSetAmrapTotal(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('coachPostIntervalScore', () => {
    it('should post interval score as coach successfully', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      const stepIndex = 3;
      const reps = 20;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, stepIndex, reps };
      mockService.coachPostIntervalScore.mockResolvedValue(undefined);

      await controller.coachPostIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.coachPostIntervalScore).toHaveBeenCalledWith(classId, coachId, userId, stepIndex, reps);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should handle invalid step index error', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, stepIndex: -1, reps: 10 };
      mockService.coachPostIntervalScore.mockRejectedValue(new Error('INVALID_STEP_INDEX'));

      await controller.coachPostIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'INVALID_STEP_INDEX' });
    });

    it('should handle not class coach error', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['member'] };
      mockRequest.body = { userId, stepIndex: 1, reps: 10 };
      mockService.coachPostIntervalScore.mockRejectedValue(new Error('NOT_CLASS_COACH'));

      await controller.coachPostIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_CLASS_COACH' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, stepIndex: 1, reps: 10 };
      mockService.coachPostIntervalScore.mockRejectedValue(new Error('Database error'));

      await controller.coachPostIntervalScore(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('coachPostEmomMark', () => {
    it('should post EMOM mark as coach successfully', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      const minuteIndex = 5;
      const finished = true;
      const finishSeconds = 45;

      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, minuteIndex, finished, finishSeconds };
      mockService.coachPostEmomMark.mockResolvedValue(undefined);

      await controller.coachPostEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockService.coachPostEmomMark).toHaveBeenCalledWith(classId, coachId, userId, minuteIndex, finished, finishSeconds);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should handle not class coach error', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['member'] };
      mockRequest.body = { userId, minuteIndex: 1, finished: false, finishSeconds: 60 };
      mockService.coachPostEmomMark.mockRejectedValue(new Error('NOT_CLASS_COACH'));

      await controller.coachPostEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'NOT_CLASS_COACH' });
    });

    it('should handle service errors', async () => {
      const classId = 1;
      const coachId = 1;
      const userId = 2;
      mockRequest.params = { classId: classId.toString() };
      mockRequest.user = { userId: coachId, roles: ['coach'] };
      mockRequest.body = { userId, minuteIndex: 1, finished: false, finishSeconds: 60 };
      mockService.coachPostEmomMark.mockRejectedValue(new Error('Database error'));

      await controller.coachPostEmomMark(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('constructor', () => {
    it('should create controller with provided service', () => {
      const customService = new LiveClassService();
      const controller = new LiveClassController(customService);
      expect(controller).toBeInstanceOf(LiveClassController);
    });

    it('should create controller with default service when none provided', () => {
      const controller = new LiveClassController();
      expect(controller).toBeInstanceOf(LiveClassController);
    });
  });
});
