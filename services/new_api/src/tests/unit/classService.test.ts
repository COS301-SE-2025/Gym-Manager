import { ClassService } from '../../services/class/classService';

describe('ClassService', () => {
  it('assignWorkoutToClass checks ownership', async () => {
    const mockRepo = {
      findAssignedClassesByCoach: jest.fn().mockResolvedValue([{ classId: 1 }]),
      updateWorkoutForClass: jest.fn().mockResolvedValue(undefined),
    } as any;

    const svc = new ClassService(mockRepo as any, {} as any);
    await expect(svc.assignWorkoutToClass(5, 2, 99)).rejects.toThrow('Unauthorized or class not found');
    await svc.assignWorkoutToClass(5, 1, 99);
    expect(mockRepo.updateWorkoutForClass).toHaveBeenCalledWith(1, 99);
  });

  it('bookClass enforces constraints through repo calls', async () => {
    // We only mock repository functions used inside the transaction path
    const mockRepo = {
      findClassByIdForUpdate: jest.fn().mockResolvedValue({
        classId: 1,
        scheduledDate: '2099-01-01',
        scheduledTime: '00:00:00',
        durationMinutes: 60,
        capacity: 10,
      }),
      alreadyBooked: jest.fn().mockResolvedValue(false),
      countBookingsForClass: jest.fn().mockResolvedValue(0),
      insertBooking: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Monkey-patch db.transaction used inside service
    const clientModule = await import('../../db/client');
    const originalDb = clientModule.db;
    (clientModule as any).db = { transaction: async (fn: any) => fn({}) };

    const svc = new ClassService(mockRepo as any, {} as any);
    await svc.bookClass(7, 1);
    expect(mockRepo.insertBooking).toHaveBeenCalledWith(1, 7, {});

    // restore
    ;(clientModule as any).db = originalDb;
  });
});


