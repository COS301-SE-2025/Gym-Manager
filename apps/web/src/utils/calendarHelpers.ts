import { WeeklyScheduleResponse, CalendarEvent, ClassScheduleItem } from '../types/types';

// Transform API data to calendar events
export const transformApiDataToEvents = (apiData: Record<string, any[]>): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  Object.entries(apiData).forEach(([date, classes]) => {
    classes.forEach((cls) => {
      const [hours, minutes] = cls.scheduledTime.split(':').map(Number);
      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + cls.durationMinutes);

      events.push({
        id: cls.classId,
        title: cls.workoutName,
        start: startTime,
        end: endTime,
        resource: cls,
      });
    });
  });

  return events;
};

// Generate simple events directly for calendar (following the example pattern)
export const getDummyCalendarEvents = (): CalendarEvent[] => {
  const now = new Date();
  const events: CalendarEvent[] = [];

  const workoutTypes = [
    { name: 'Morning HIIT', coach: 'John Smith', duration: 60 },
    { name: 'Power Yoga', coach: 'Sarah Johnson', duration: 90 },
    { name: 'CrossFit', coach: 'Mike Wilson', duration: 60 },
    { name: 'Pilates', coach: 'Emma Davis', duration: 75 },
    { name: 'Spinning', coach: 'Alex Turner', duration: 45 },
    { name: 'Strength Training', coach: 'Chris Brown', duration: 60 },
    { name: 'Zumba', coach: 'Maria Garcia', duration: 60 },
    { name: 'Boxing', coach: 'Ryan Lee', duration: 45 },
  ];

  // Generate events for the current week (like the example)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(now);
    currentDay.setDate(now.getDate() - now.getDay() + dayOffset); // Start from Sunday

    // Generate 2-3 classes per day
    const numClasses = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < numClasses; i++) {
      const workout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      const startHour = 7 + i * 4 + Math.floor(Math.random() * 2); // Spread throughout day

      const startTime = new Date(currentDay);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + workout.duration);

      events.push({
        id: dayOffset * 10 + i,
        title: `${workout.name}\n${workout.coach}`,
        start: startTime,
        end: endTime,
        resource: {
          classId: dayOffset * 10 + i,
          scheduledDate: currentDay.toISOString().split('T')[0],
          scheduledTime: startTime.toTimeString().split(' ')[0],
          durationMinutes: workout.duration,
          capacity: 20,
          workoutName: workout.name,
          coachName: workout.coach,
        },
      });
    }
  }

  return events;
};

export const transformToCalendarEvents = (
  scheduleData: WeeklyScheduleResponse,
): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  Object.entries(scheduleData).forEach(([date, classes]) => {
    classes.forEach((classItem) => {
      const startDateTime = new Date(`${date}T${classItem.scheduledTime}`);
      const endDateTime = new Date(startDateTime.getTime() + classItem.durationMinutes * 60000);

      // Format time for display
      const timeStr = startDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      events.push({
        id: classItem.classId,
        title: `${classItem.workoutName}\n${timeStr}, ${classItem.coachName}`,
        start: startDateTime,
        end: endDateTime,
        resource: classItem,
      });
    });
  });

  return events;
};

// Dummy data for testing
export const getDummyWeeklySchedule = (): WeeklyScheduleResponse => {
  const today = new Date();
  const currentWeek = getWeekDates(today);

  const workoutTypes = [
    { name: 'Morning HIIT', coach: 'John Smith', duration: 120, capacity: 20 },
    { name: 'Power Yoga', coach: 'Sarah Johnson', duration: 120, capacity: 15 },
    { name: 'CrossFit', coach: 'Mike Wilson', duration: 120, capacity: 12 },
    { name: 'Pilates', coach: 'Emma Davis', duration: 120, capacity: 18 },
    { name: 'Spinning', coach: 'Alex Turner', duration: 120, capacity: 25 },
    { name: 'Strength Training', coach: 'Chris Brown', duration: 60, capacity: 16 },
    { name: 'Zumba', coach: 'Maria Garcia', duration: 120, capacity: 30 },
    { name: 'Boxing', coach: 'Ryan Lee', duration: 125, capacity: 14 },
  ];

  const timeSlots = ['07:00:00', '09:00:00', '11:00:00', '15:00:00', '17:00:00', '19:00:00'];

  const dummySchedule: WeeklyScheduleResponse = {};

  currentWeek.forEach((date, dayIndex) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Generate 2-4 classes per day based on day of week
    const numClasses = dayOfWeek === 0 || dayOfWeek === 6 ? 2 : Math.floor(Math.random() * 3) + 2; // Fewer on weekends

    dummySchedule[dateStr] = [];

    const usedTimes = new Set<string>();

    for (let i = 0; i < numClasses; i++) {
      let timeSlot: string;
      do {
        timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      } while (usedTimes.has(timeSlot));

      usedTimes.add(timeSlot);

      const workout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];

      dummySchedule[dateStr].push({
        classId: dayIndex * 100 + i + 1,
        scheduledDate: dateStr,
        scheduledTime: timeSlot,
        durationMinutes: workout.duration,
        capacity: workout.capacity,
        workoutName: workout.name,
        coachName: workout.coach,
      });
    }

    // Sort classes by time
    dummySchedule[dateStr].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  });

  return dummySchedule;
};

const getWeekDates = (date: Date): Date[] => {
  const week = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    week.push(day);
  }

  return week;
};
