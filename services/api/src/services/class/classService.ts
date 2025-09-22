import { IClassService, IClassRepository } from '../../domain/interfaces/class.interface';
import {
  Class,
  ClassWithWorkout,
  ClassAttendance,
  CreateClassRequest,
  CreateWorkoutRequest,
  BookClassRequest,
  CheckInRequest,
  AssignCoachRequest,
  AssignWorkoutRequest,
} from '../../domain/entities/class.entity';
import { ClassRepository } from '../../repositories/class/classRepository';
import { UserRepository } from '../../repositories/auth/userRepository';
import { IUserRepository } from '../../domain/interfaces/auth.interface';
import { AnalyticsService } from '../analytics/analyticsService';
import { MemberService } from '../member/memberService';
import { MemberRepository } from '../../repositories/member/memberRepository';
import { GamificationService } from '../gamification/gamificationService';
import { GamificationRepository } from '../../repositories/gamification/gamificationRepository';

/**
 * ClassService - Business Layer
 * Contains all business logic for class operations
 */
export class ClassService implements IClassService {
  private classRepository: IClassRepository;
  private userRepository: UserRepository;
  private analyticsService: AnalyticsService;
  private memberService: MemberService;
  private gamificationService: GamificationService;

  constructor(
    classRepository?: IClassRepository,
    userRepository?: UserRepository,
    memberService?: MemberService,
    analyticsService?: AnalyticsService,
    gamificationService?: GamificationService,
  ) {
    this.classRepository = classRepository || new ClassRepository();
    this.userRepository = userRepository || new UserRepository();
    this.memberService = memberService || new MemberService(new MemberRepository());
    this.analyticsService = analyticsService || new AnalyticsService();
    this.gamificationService = gamificationService || new GamificationService(new GamificationRepository());
  }

  async getCoachAssignedClasses(coachId: number): Promise<Class[]> {
    return this.classRepository.findAssignedClassesByCoach(coachId);
  }

  async getCoachClassesWithWorkouts(coachId: number): Promise<ClassWithWorkout[]> {
    return this.classRepository.findAssignedClassesWithWorkoutsByCoach(coachId);
  }

  async assignWorkoutToClass(coachId: number, classId: number, workoutId: number): Promise<void> {
    // Verify coach owns the class
    const assigned = await this.classRepository.findAssignedClassesByCoach(coachId);
    const owns = assigned.some((c) => c.classId === classId);
    if (!owns) {
      throw new Error('Unauthorized or class not found');
    }

    await this.classRepository.updateWorkoutForClass(classId, workoutId);
  }

  async createWorkout(workoutData: CreateWorkoutRequest): Promise<number> {
    // Validate workout data
    this.validateWorkoutData(workoutData);

    const { rounds, ...workoutInfo } = workoutData;
    return this.classRepository.createWorkout(workoutInfo, rounds);
  }

  async getAllClasses(userId: number): Promise<ClassWithWorkout[]> {
    // Any authenticated user can list upcoming classes
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    // Ask repository for classes using a precise window
    return this.classRepository.getUpcomingClassesForMembers({ today, time });
  }

  async getMemberClasses(memberId: number): Promise<ClassWithWorkout[]> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    // Ask repository for bookings using a precise window
    return this.classRepository.getBookedClassesForMember(memberId, { today, time });
  }

  async getMemberUnbookedClasses(memberId: number): Promise<ClassWithWorkout[]> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    // Ask repository for upcoming classes excluding those the member has booked
    return this.classRepository.getUnbookedClassesForMember(memberId, { today, time });
  }

  async bookClass(memberId: number, classId: number): Promise<void> {
    // Validate class ID
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new Error('Invalid class ID');
    }

    // Use transaction for booking
    const { db } = await import('../../db/client');
    await db.transaction(async (tx) => {
      // Lock & read class row
      const cls = await this.classRepository.findClassByIdForUpdate(classId, tx);
      if (!cls) {
        throw new Error('Class not found');
      }

      // Reject past classes
      const now = new Date();
      const classEnd = new Date(`${cls.scheduledDate}T${cls.scheduledTime}`);
      classEnd.setMinutes(classEnd.getMinutes() + Number(cls.durationMinutes));

      if (now >= classEnd) {
        throw new Error('Class has already ended');
      }

      // Already booked?
      const already = await this.classRepository.alreadyBooked(classId, memberId, tx);
      if (already) {
        throw new Error('Already booked');
      }

      // Seats left?
      const count = await this.classRepository.countBookingsForClass(classId, tx);
      if (count >= cls.capacity) {
        throw new Error('Class full');
      }

      // Overlapping booking?
      const overlaps = await this.classRepository.hasOverlappingBooking(
        memberId,
        {
          scheduledDate: cls.scheduledDate,
          scheduledTime: cls.scheduledTime,
          durationMinutes: Number(cls.durationMinutes),
        },
        tx,
      );
      if (overlaps) {
        throw new Error('Overlapping booking');
      }

      // Check if member has sufficient credits (1 credit per class)
      const currentCredits = await this.memberService.getCreditsBalance(memberId);
      if (currentCredits < 1) {
        throw new Error('Insufficient credits');
      }

      // Deduct 1 credit from member's account (within transaction)
      await this.memberService.deductCredits(memberId, 1, tx);

      // Insert booking
      await this.classRepository.insertBooking(classId, memberId, tx);
    });

    // Log booking event
    await this.analyticsService.addLog({
      gymId: 1, // Assuming a single gym for now
      userId: memberId,
      eventType: 'class_booking',
      properties: {
        classId: classId,
        memberId: memberId,
      },
      source: 'api',
    });
  }

  async checkInToClass(classId: number, memberId: number): Promise<ClassAttendance> {
    const attendance = await this.classRepository.insertAttendance(classId, memberId);
    if (!attendance) {
      throw new Error('Already checked in');
    }

    // Update gamification system (streaks, badges, points)
    await this.gamificationService.recordClassAttendance(memberId, classId, new Date());

    // Log attendance event
    await this.analyticsService.addLog({
      gymId: 1, // Assuming a single gym for now
      userId: memberId,
      eventType: 'class_attendance',
      properties: {
        classId: classId,
        memberId: memberId,
      },
      source: 'api',
    });

    return attendance;
  }

  async cancelBooking(classId: number, memberId: number): Promise<void> {
    // Use transaction for cancellation
    const { db } = await import('../../db/client');
    await db.transaction(async (tx) => {
      // Check if booking exists before canceling
      const bookingExists = await this.classRepository.alreadyBooked(classId, memberId, tx);
      if (!bookingExists) {
        throw new Error('Booking not found');
      }

      // Delete the booking
      const result = await this.classRepository.deleteBooking(classId, memberId, tx);
      const rowCount = result?.rowCount ?? (Array.isArray(result) ? result.length : undefined);
      if (rowCount === 0) {
        throw new Error('Booking not found');
      }

      // Refund 1 credit to member's account (within transaction)
      await this.memberService.addCredits(memberId, 1, tx);
    });

    // Log cancellation event
    await this.analyticsService.addLog({
      gymId: 1,
      userId: memberId,
      eventType: 'class_cancellation',
      properties: { classId, memberId },
      source: 'api',
    });
  }

  private validateWorkoutData(workoutData: CreateWorkoutRequest): void {
    const WORKOUT_TYPES = ['FOR_TIME', 'AMRAP', 'TABATA', 'EMOM', 'INTERVAL'] as const;
    const QUANTITY_TYPES = ['reps', 'duration'] as const;

    if (!workoutData.workoutName || !workoutData.workoutName.trim()) {
      throw new Error('workoutName is required');
    }

    if (!workoutData.type || !WORKOUT_TYPES.includes(workoutData.type as any)) {
      throw new Error(`type must be one of ${WORKOUT_TYPES.join(', ')}`);
    }

    if (typeof workoutData.metadata !== 'object' || workoutData.metadata === null) {
      throw new Error('metadata must be an object');
    }

    if (!Array.isArray(workoutData.rounds) || workoutData.rounds.length === 0) {
      throw new Error('rounds must be a non-empty array');
    }

    for (const r of workoutData.rounds) {
      if (typeof r.roundNumber !== 'number' || !Array.isArray(r.subrounds)) {
        throw new Error('each round needs roundNumber & subrounds[]');
      }

      for (const sr of r.subrounds) {
        if (
          typeof sr.subroundNumber !== 'number' ||
          !Array.isArray(sr.exercises) ||
          sr.exercises.length === 0
        ) {
          throw new Error('each subround needs subroundNumber & a non-empty exercises[]');
        }

        for (const ex of sr.exercises) {
          if (
            (ex.exerciseId == null && !ex.exerciseName) ||
            (ex.exerciseId != null && ex.exerciseName)
          ) {
            throw new Error('each exercise must have exactly one of exerciseId or exerciseName');
          }

          if (
            typeof ex.position !== 'number' ||
            !QUANTITY_TYPES.includes(ex.quantityType) ||
            typeof ex.quantity !== 'number'
          ) {
            throw new Error('exercise entries need position:number, quantityType:(reps|duration), quantity:number');
          }
        }
      }
    }
  }
}
