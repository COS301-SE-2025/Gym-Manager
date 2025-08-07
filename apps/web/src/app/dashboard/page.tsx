'use client';

import React, { useState, useEffect } from 'react';
import WeeklyCalendar from '../../components/WeeklyCalendar/WeeklyCalendar';
import PendingApprovalTable from '../../components/PendingApprovalTable/page';
import { CalendarEvent, ClassScheduleItem, User } from '../../types/types';
import { getDummyCalendarEvents, transformApiDataToEvents } from '../../utils/calendarHelpers';
import { userRoleService } from '../services/roles';
import ClassCreationModal from '@/components/modals/CreateClass/CreateClass';
import AssignCoachModal from '@/components/modals/AssignCoach/AssignCoach';
import { ClassResource } from '@/components/modals/AssignCoach/AssignCoach';
import Link from 'next/link';
import axios from 'axios';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedClassInfo, setSelectedClassInfo] = useState<ClassResource | null>(null);

  const fetchData = async () => {
    try {
      // Fetch both schedule and user data in parallel
      const [apiData, userData] = await Promise.all([
        userRoleService.getWeeklySchedule(),
        userRoleService.getCurrentUser(),
      ]);

      const calendarEvents = transformApiDataToEvents(apiData);
      setEvents(calendarEvents);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback to dummy data
      const calendarEvents = getDummyCalendarEvents();
      setEvents(calendarEvents);

      // Try to get user data separately if schedule failed
      try {
        const userData = await userRoleService.getCurrentUser();
        setCurrentUser(userData);
      } catch (userError) {
        console.error('Failed to load user data:', userError);
      }
    } finally {
      setLoading(false);
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/allUsers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched all users:', response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to get user by ID:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // const handleEventClick = (event: CalendarEvent) => {
  //   const classInfo = event.resource;
  //   if (classInfo) {
  //     // Create a custom modal instead of alert for better UX
  //     const modalContent = `
  //       🏋️ ${classInfo.workoutName}
  //       👨‍💼 Coach: ${classInfo.coachName}
  //       👥 Capacity: ${classInfo.capacity} people
  //       ⏱️ Duration: ${classInfo.durationMinutes} minutes
  //       📅 ${new Date(classInfo.scheduledDate).toLocaleDateString()}
  //       🕒 ${classInfo.scheduledTime}
  //     `;
  //     alert(modalContent);
  //   }
  //   if (classInfo && classInfo.classId) {
  //     setSelectedClassId(classInfo.classId);
  //     setAssignModalOpen(true);
  //   }
  // };

  const handleEventClick = (event: CalendarEvent) => {
    const classInfo = event.resource;
    if (classInfo && classInfo.classId) {
      setSelectedClassId(classInfo.classId);
      setSelectedClassInfo(classInfo);
      setAssignModalOpen(true);
    }
  };

  const getUserDisplayName = () => {
    if (currentUser) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return 'User';
  };

  return (
    <div
      style={{
        backgroundColor: '#1E1E1E',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Header Section */}
      <div
        style={{
          padding: '20px',
          paddingBottom: '10px',
          backgroundColor: '#1E1E1E',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-center',
        }}
      >
        <div>
          <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'white',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                margin: 0,
                padding: 0,
              }}
            >
              Welcome, {getUserDisplayName()} 👋
            </h1>
          </Link>
          <p
            style={{
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '400',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              margin: 0,
              padding: 0,
            }}
          >
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
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#c0c0c0';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#d0d0d0';
          }}
          onClick={() => setIsClassModalOpen(true)}
        >
          Add Class
        </button>
      </div>

      {/* Calendar Section */}
      <div
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#1e1e1e',
          padding: '0',
          minHeight: '700px',
        }}
      >
      <WeeklyCalendar events={events} onSelectEvent={handleEventClick} loading={loading} />
      {/* Pending users table*/}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
          Pending User Approvals
        </h2>
        <PendingApprovalTable role="member" />
      </div>
      </div>
      <ClassCreationModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onCreated={() => {
          fetchData();
          setIsClassModalOpen(false);
        }}
      />
      <AssignCoachModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        classInfo={selectedClassInfo}
        onAssigned={() => {
          fetchData();
          setAssignModalOpen(false);
        }}
      />
    </div>
  );
}
