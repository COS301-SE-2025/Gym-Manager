'use client';

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '../../components/WeeklyCalendar/WeeklyCalendar';
import { CalendarEvent, ClassScheduleItem } from '../../types/types';
import { getDummyCalendarEvents } from '../../utils/calendarHelpers';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      const calendarEvents = getDummyCalendarEvents();
      setEvents(calendarEvents);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    const classInfo = event.resource;
    if (classInfo) {
      // Create a custom modal instead of alert for better UX
      const modalContent = `
        🏋️ ${classInfo.workoutName}
        👨‍💼 Coach: ${classInfo.coachName}
        👥 Capacity: ${classInfo.capacity} people
        ⏱️ Duration: ${classInfo.durationMinutes} minutes
        📅 ${new Date(classInfo.scheduledDate).toLocaleDateString()}
        🕒 ${classInfo.scheduledTime}
      `;
      alert(modalContent);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#1E1E1E', 
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Header Section */}
      <div style={{ 
        padding: '20px', 
        paddingBottom: '10px',
        backgroundColor: '#1E1E1E',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-center'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: 'white',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            margin: 0,
            padding: 0
          }}>
            Welcome, username 👋
          </h1>
          <p style={{ 
            color: '#ffffff', 
            fontSize: '12px',
            fontWeight: '400',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            margin: 0,
            padding: 0
          }}>
            View and manage the upcoming week
          </p>
        </div>
        
        <button 
          style={{
            backgroundColor: '#D8FF3E',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#c0c0c0';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#d0d0d0';
          }}
          onClick={() => {
            // Add class functionality here
            alert('Add Class functionality to be implemented');
          }}
        >
          Add Class
        </button>
      </div>
      
      {/* Calendar Section */}
      <div style={{ 
        flex: 1, 
        width: '100%',
        backgroundColor: '#1e1e1e',
        padding: '0',
        minHeight: '700px'
      }}>
        <WeeklyCalendar 
          events={events} 
          onSelectEvent={handleEventClick}
          loading={loading}
        />
      </div>
    </div>
  );
}