'use client';

import React from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import { CalendarEvent } from '../../types/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './WeeklyCalendar.module.css';

const localizer = momentLocalizer(moment);

interface WeeklyCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  loading?: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  events,
  onSelectEvent,
  loading = false,
}) => {
  const handleSelectEvent = (event: CalendarEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  if (loading) {
    return (
      <div className={styles.calendarContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingText}>Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarWrapper}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultDate={moment().toDate()}
          onSelectEvent={handleSelectEvent}
          views={[Views.WEEK, Views.DAY, Views.AGENDA]}
          defaultView={Views.WEEK}
          popup
          showMultiDayTimes
          step={60}
          timeslots={1}
          min={new Date(2023, 0, 1, 6, 0)} // 6 AM
          max={new Date(2023, 0, 1, 22, 0)} // 10 PM
        />
      </div>
    </div>
  );
};

export default WeeklyCalendar;
