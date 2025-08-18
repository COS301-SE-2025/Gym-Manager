import {
  transformApiDataToEvents,
  getDummyCalendarEvents,
  transformToCalendarEvents,
  getDummyWeeklySchedule,
} from '@/utils/calendarHelpers';
import { CalendarEvent, WeeklyScheduleResponse } from '@/types/types';

describe('calendar utilities', () => {
  describe('transformApiDataToEvents', () => {
    it('should transform API data into calendar events', () => {
      const apiData = {
        '2025-08-15': [
          {
            classId: 1,
            scheduledTime: '10:00:00',
            durationMinutes: 60,
            workoutName: 'Yoga',
          },
        ],
      };

      const events = transformApiDataToEvents(apiData);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(1);
      expect(events[0].title).toBe('Yoga');
      expect(events[0].start).toBeInstanceOf(Date);
      expect(events[0].end.getTime() - events[0].start.getTime()).toBe(60 * 60 * 1000);
      expect(events[0].resource).toEqual(apiData['2025-08-15'][0]);
    });
  });

  describe('transformToCalendarEvents', () => {
    it('should transform WeeklyScheduleResponse into CalendarEvent array', () => {
      const scheduleData: WeeklyScheduleResponse = {
        '2025-08-15': [
          {
            classId: 1,
            scheduledDate: '2025-08-15',
            scheduledTime: '08:30:00',
            durationMinutes: 90,
            capacity: 20,
            workoutName: 'Pilates',
            coachName: 'Jane Doe',
          },
        ],
      };

      const events = transformToCalendarEvents(scheduleData);

      expect(events).toHaveLength(1);
      expect(events[0].title).toContain('Pilates');
      expect(events[0].title).toContain('Jane Doe');
      expect(events[0].start).toBeInstanceOf(Date);
      expect(events[0].end.getTime() - events[0].start.getTime()).toBe(90 * 60 * 1000);
    });
  });

  describe('getDummyCalendarEvents', () => {
    it('should return an array of events for the current week', () => {
      const events = getDummyCalendarEvents();

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.id).toBeDefined();
        expect(event.title).toMatch(/\w+/); // has at least some text
        expect(event.start).toBeInstanceOf(Date);
        expect(event.end).toBeInstanceOf(Date);
      });
    });
  });

  describe('getDummyWeeklySchedule', () => {
    it('should return a valid WeeklyScheduleResponse for 7 days', () => {
      const schedule = getDummyWeeklySchedule();

      expect(Object.keys(schedule)).toHaveLength(7);

      Object.values(schedule).forEach((classes) => {
        expect(Array.isArray(classes)).toBe(true);
        classes.forEach((cls) => {
          expect(cls.classId).toBeDefined();
          expect(typeof cls.scheduledDate).toBe('string');
          expect(typeof cls.scheduledTime).toBe('string');
          expect(typeof cls.durationMinutes).toBe('number');
          expect(typeof cls.capacity).toBe('number');
          expect(typeof cls.workoutName).toBe('string');
          expect(typeof cls.coachName).toBe('string');
        });
      });
    });

    it('should integrate with transformToCalendarEvents without errors', () => {
      const schedule = getDummyWeeklySchedule();
      const events = transformToCalendarEvents(schedule);

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.start).toBeInstanceOf(Date);
        expect(event.end).toBeInstanceOf(Date);
      });
    });
  });
});
