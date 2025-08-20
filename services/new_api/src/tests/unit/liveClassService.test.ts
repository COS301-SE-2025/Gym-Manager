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
});


