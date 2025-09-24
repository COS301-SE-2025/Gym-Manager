'use client';

import React, { useState } from 'react';
import { Calendar, momentLocalizer, Views, View, ToolbarProps } from 'react-big-calendar';
import moment from 'moment';
import { CalendarEvent } from '../../types/types';
import styles from './WeeklyCalendar.module.css';


const localizer = momentLocalizer(moment);

interface WeeklyCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  loading?: boolean;
}

const CustomToolbar: React.FC<ToolbarProps<CalendarEvent, object>> = ({ 
  date, 
  view, 
  onNavigate, 
  onView, 
  label 
}) => {
  const today = moment();
  const currentDate = moment(date);
  
  // check view types
  const isCurrentPeriod = view === Views.DAY 
    ? currentDate.isSame(today, 'day')
    : currentDate.isSame(today, 'week');

  const goToBack = () => {
    onNavigate('PREV');
  };

  const goToNext = () => {
    onNavigate('NEXT');
  };

  const goToToday = () => {
    onNavigate('TODAY');
  };

  const handleViewChange = (newView: View) => {
    onView(newView);
  };

  return (
    <div className={styles.customToolbar}>
      <div className={styles.toolbarLeft}>
        <button 
          className={`${styles.todayButton} ${isCurrentPeriod ? styles.activeButton : ''}`}
          onClick={goToToday}
          disabled={isCurrentPeriod}
        >
          {view === Views.DAY ? 'Today' : 'Current Week'}
        </button>
        
        <button 
          className={styles.navButton}
          onClick={goToBack}
        >
          ←
        </button>
        
        <button 
          className={styles.navButton}
          onClick={goToNext}
        >
          →
        </button>
      </div>

      <div className={styles.toolbarCenter}>
        <span className={styles.toolbarLabel}>{label}</span>
      </div>

      <div className={styles.toolbarRight}>
        <button 
          className={`${styles.viewButton} ${view === Views.WEEK ? styles.activeViewButton : ''}`}
          onClick={() => handleViewChange(Views.WEEK)}
        >
          Week
        </button>
        <button 
          className={`${styles.viewButton} ${view === Views.DAY ? styles.activeViewButton : ''}`}
          onClick={() => handleViewChange(Views.DAY)}
        >
          Day
        </button>
      </div>
    </div>
  );
};

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  events,
  onSelectEvent,
  loading = false,
}) => {
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState<Date>(moment().toDate());


  const handleSelectEvent = (event: CalendarEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const handleNavigate = (newDate: Date, view: View, action: any) => {
    setCurrentDate(newDate);
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
          date={currentDate}
          view={currentView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          views={[Views.WEEK, Views.DAY]}
          defaultView={Views.WEEK}
          popup
          showMultiDayTimes
          step={60}
          timeslots={1}
          min={new Date(2023, 0, 1, 6, 0)} // 6 AM
          max={new Date(2023, 0, 1, 22, 0)} // 10 PM
          components={{
            toolbar: CustomToolbar,
          }}
        />
      </div>
    </div>
  );
};

export default WeeklyCalendar;
