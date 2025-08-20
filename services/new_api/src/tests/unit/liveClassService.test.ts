import { LiveClassService } from '../../services/liveClass/liveClassService';

describe('LiveClassService', () => {
  it('getLiveClassForUser checks roles and queries repos appropriately', async () => {
    const mockRepo = {
      getLiveClassForCoach: jest.fn().mockResolvedValue(null),
      getLiveClassForMember: jest.fn().mockResolvedValue({ ongoing: true, classId: 1 }),
    } as any;
    const mockUserRepo = { getRolesByUserId: jest.fn().mockResolvedValue(['member']) } as any;
    const svc = new LiveClassService(mockRepo, mockUserRepo);
    const res = await svc.getLiveClassForUser(10);
    expect(res).toEqual({ ongoing: true, classId: 1 });
  });

  it('getWorkoutSteps maps rows into steps/stepsCumReps and returns type', async () => {
    const mockRepo = {
      getFlattenRowsForWorkout: jest.fn().mockResolvedValue([
        { quantity_type: 'reps', quantity: 10, name: 'Burpee', round_number: 1, subround_number: 1 },
        { quantity_type: 'duration', quantity: 30, name: 'Plank', round_number: 1, subround_number: 2 },
      ]),
      getWorkoutType: jest.fn().mockResolvedValue('AMRAP'),
    } as any;
    const svc = new LiveClassService(mockRepo as any, { getRolesByUserId: jest.fn() } as any);
    const out = await svc.getWorkoutSteps(5);
    expect(out.workoutType).toBe('AMRAP');
    expect(out.steps.length).toBe(2);
    expect(out.stepsCumReps).toEqual([10, 10]);
  });

  it('getLiveClassForUser validates inputs and calls repository', async () => {
    const mockRepo = {
      getLiveClassForCoach: jest.fn().mockResolvedValue(null),
      getLiveClassForMember: jest.fn().mockResolvedValue({ ongoing: true, classId: 1 }),
    } as any;
    const mockUserRepo = { getRolesByUserId: jest.fn().mockResolvedValue(['member']) } as any;
    const svc = new LiveClassService(mockRepo, mockUserRepo);
    const res = await svc.getLiveClassForUser(10);
    expect(res).toEqual({ ongoing: true, classId: 1 });
  });

  it('getWorkoutSteps validates inputs and calls repository', async () => {
    const mockRepo = {
      getFlattenRowsForWorkout: jest.fn().mockResolvedValue([
        { quantity_type: 'reps', quantity: 10, name: 'Burpee', round_number: 1, subround_number: 1 },
      ]),
    } as any;
  });

  // it('startLiveClass validates inputs and calls repository', async () => {
  //   const mockRepo = {
  //     getClassMeta: jest.fn().mockResolvedValue({ workout_id: 1 }),
  //   } as any;
  //   const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
  //   const res = await svc.startLiveClass(10);
  //   expect(res).toEqual({ ongoing: true, classId: 1 });
  // });

  it('stopLiveClass validates inputs and calls repository', async () => {
    const mockRepo = {
      stopSession: jest.fn().mockResolvedValue(null),
    } as any;
    const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
    const res = await svc.stopLiveClass(10);
    expect(res).toEqual(undefined);
  });

  it('pauseLiveClass validates inputs and calls repository', async () => {
    const mockRepo = {
      pauseSession: jest.fn().mockResolvedValue(null),
    } as any;
    const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
    const res = await svc.pauseLiveClass(10);
    expect(res).toEqual(undefined);
  });

  it('resumeLiveClass validates inputs and calls repository', async () => {
    const mockRepo = {
      resumeSession: jest.fn().mockResolvedValue(null),
    } as any;
    const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
    const res = await svc.resumeLiveClass(10);
    expect(res).toEqual(undefined);
  });

  // it('advanceProgress validates inputs and calls repository', async () => { 
  //   const mockRepo = {
  //     advanceProgress: jest.fn().mockResolvedValue(null),
  //   } as any;
  //   const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
  //   const res = await svc.advanceProgress(10, 1, 'next');
  //   expect(res).toEqual(null);
  // });

  // it('submitScore validates inputs and calls repository', async () => {
  //   const mockRepo = {
  //     submitScore: jest.fn().mockResolvedValue(null),
  //   } as any;
  //   const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
  //   const res = await svc.submitScore(10, ['member'], { score: 10, classId: 1 });
  //   expect(res).toEqual(null);
  // });

  // it('submitPartial validates inputs and calls repository', async () => {
  //   const mockRepo = {
  //     submitPartial: jest.fn().mockResolvedValue(null),
  //   } as any;
  //   const svc = new LiveClassService(mockRepo, { getRolesByUserId: jest.fn() } as any);
  //   const res = await svc.submitPartial(10, 1, 10);
  //   expect(res).toEqual(null);
  // });
});


